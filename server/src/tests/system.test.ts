import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { app } from '../index';
import { prisma } from '../db';
import {
  validateEgyptianNationalId,
  normalizeNumerals,
  extractLast7Digits,
  maskNationalId,
} from '../services/nationalIdValidator';
import { checkinAndAllocateGuest } from '../services/allocationService';
import { parseAndValidateExcel, commitImportBatch } from '../services/importService';

let adminToken: string;
let gateToken: string;

beforeAll(async () => {
  // Login as admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.token;

  // Login as gate operator
  const gateRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'gate1', password: 'gate123' });
  gateToken = gateRes.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('1. National ID Validator & Normalization Tests', () => {
  it('should normalize Arabic-Indic digits to standard digits', () => {
    expect(normalizeNumerals('٢٩٨٠٣١٢٠١٠١٩١٥')).toBe('29803120101915');
    expect(normalizeNumerals('  ١٠٢٣٤٥  ')).toBe('102345');
  });

  it('should accurately extract the last 7 digits for gate check-in', () => {
    expect(extractLast7Digits('29803120101915')).toBe('0101915');
    expect(extractLast7Digits('٢٩٨٠٣١٢٠١٠١٩١٥')).toBe('0101915');
  });

  it('should validate a correct Egyptian National ID and extract demographic metadata', () => {
    const result = validateEgyptianNationalId('29803120101915');
    expect(result.isValid).toBe(true);
    expect(result.details?.century).toBe(1900);
    expect(result.details?.birthDate).toBe('1998-03-12');
    expect(result.details?.governorate).toBe('القاهرة');
    expect(result.details?.gender).toBe('ذكر');
  });

  it('should reject invalid National IDs (wrong length, wrong month, invalid governorate)', () => {
    expect(validateEgyptianNationalId('12345').isValid).toBe(false);
    expect(validateEgyptianNationalId('29813120101915').isValid).toBe(false);
    expect(validateEgyptianNationalId('29803990101915').isValid).toBe(false);
    expect(validateEgyptianNationalId('29803129901915').isValid).toBe(false);
  });

  it('should properly mask national ID for non-privileged displays', () => {
    expect(maskNationalId('29803120101915')).toBe('298****0101915');
  });
});

describe('2. Gate Check-in Fast 7-Digit Search Tests', () => {
  it('should reject search queries that are not exactly 7 digits', async () => {
    const res = await request(app)
      .get('/api/checkin/search?suffix=123')
      .set('Authorization', `Bearer ${gateToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('٧ أرقام بالضبط');
  });

  it('should find guest by last 7 digits with Western and Arabic numerals', async () => {
    const resWestern = await request(app)
      .get('/api/checkin/search?suffix=0102431')
      .set('Authorization', `Bearer ${gateToken}`);

    expect(resWestern.status).toBe(200);
    expect(resWestern.body.matchesCount).toBe(1);
    expect(resWestern.body.guest.fullName).toContain('محمود علي إبراهيم');

    const resArabic = await request(app)
      .get('/api/checkin/search?suffix=٠١٠٢٤٣١')
      .set('Authorization', `Bearer ${gateToken}`);

    expect(resArabic.status).toBe(200);
    expect(resArabic.body.matchesCount).toBe(1);
    expect(resArabic.body.guest.fullName).toContain('محمود علي إبراهيم');
  });

  it('should handle non-existent guest with clear Arabic feedback', async () => {
    const res = await request(app)
      .get('/api/checkin/search?suffix=9999999')
      .set('Authorization', `Bearer ${gateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.matchesCount).toBe(0);
    expect(res.body.message).toBe('لم يتم العثور على المدعو');
  });
});

describe('3. Concurrency-Safe 27-Bus Allocation & Leader Workflow Tests', () => {
  it('should allocate first checked-in guest to lowest available bus and increment seat', async () => {
    const guest = await prisma.guest.findFirst({
      where: { hasAttended: false },
    });
    expect(guest).toBeDefined();

    const result = await checkinAndAllocateGuest(guest!.id, 'gate1', 'ضابط البوابة');
    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBeFalsy();
    expect(result.busNumber).toBeGreaterThanOrEqual(1);
    expect(result.seatNumber).toBeGreaterThanOrEqual(1);

    const updatedGuest = await prisma.guest.findUnique({
      where: { id: guest!.id },
      include: { bus: true },
    });
    expect(updatedGuest?.hasAttended).toBe(true);
    expect(updatedGuest?.bus?.busNumber).toBe(result.busNumber);
  });

  it('should prevent duplicate check-in and retain original seat and bus assignment', async () => {
    const attendedGuest = await prisma.guest.findFirst({
      where: { hasAttended: true },
      include: { bus: true },
    });
    expect(attendedGuest).toBeDefined();

    const originalSeat = attendedGuest!.seatNumber;
    const originalBusNumber = attendedGuest!.bus?.busNumber;

    const secondResult = await checkinAndAllocateGuest(attendedGuest!.id, 'gate1', 'ضابط البوابة');
    expect(secondResult.success).toBe(true);
    expect(secondResult.alreadyCheckedIn).toBe(true);
    expect(secondResult.seatNumber).toBe(originalSeat);
    expect(secondResult.busNumber).toBe(originalBusNumber);
  });

  it('should fill Bus 1 sequentially up to exactly 36 seats, then move to Bus 2', async () => {
    const bus1 = await prisma.bus.findUnique({
      where: { busNumber: 1 },
      include: { _count: { select: { guests: true } } },
    });
    const currentCount = bus1!._count.guests;
    const remainingToFill = 36 - currentCount;

    const runId = Date.now().toString().slice(-5);
    const testGuests: string[] = [];
    for (let i = 0; i < remainingToFill; i++) {
      const uniqueSuffix = `${runId}${String(i).padStart(2, '0')}`;
      const testG = await prisma.guest.create({
        data: {
          fullName: `مدعو اختباري تسكين ${i + 1}`,
          nationalId: `2900101${uniqueSuffix}`,
          nationalIdSuffix: uniqueSuffix,
          isIndependent: true,
          hasAttended: false,
        },
      });
      testGuests.push(testG.id);
    }

    for (let i = 0; i < testGuests.length; i++) {
      const res = await checkinAndAllocateGuest(testGuests[i], 'gate1', 'مشغل اختبار');
      expect(res.busNumber).toBe(1);
    }

    const bus1After = await prisma.bus.findUnique({
      where: { busNumber: 1 },
      include: { _count: { select: { guests: true } } },
    });
    expect(bus1After?._count.guests).toBe(36);
    expect(bus1After?.status).toBe('FULL');

    // Create 1 more guest - must overflow into Bus 2, Seat 1!
    const overflowSuffix = `${runId}99`;
    const overflowGuest = await prisma.guest.create({
      data: {
        fullName: 'مدعو اختباري بداية أتوبيس 2',
        nationalId: `2900101${overflowSuffix}`,
        nationalIdSuffix: overflowSuffix,
        isIndependent: true,
        hasAttended: false,
      },
    });

    const overflowRes = await checkinAndAllocateGuest(overflowGuest.id, 'gate1', 'مشغل اختبار');
    expect(overflowRes.busNumber).toBe(2);
    expect(overflowRes.seatNumber).toBeGreaterThanOrEqual(1);
  });

  it('should register bus leader without taking one of the 36 guest seats', async () => {
    const leaderRes = await request(app)
      .post('/api/buses/1/leader')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rank: 'رائد',
        fullName: 'حازم محمد عبد الرحيم',
        phone: '01012345678',
      });

    expect(leaderRes.status).toBe(200);
    expect(leaderRes.body.success).toBe(true);
    expect(leaderRes.body.leader.rank).toBe('رائد');

    // Manifest must show 36 guests + 1 leader = 37 total manifest count
    const manifestRes = await request(app)
      .get('/api/buses/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(manifestRes.status).toBe(200);
    expect(manifestRes.body.bus.assignedGuests).toBe(36);
    expect(manifestRes.body.bus.totalManifestCount).toBe(37);
    expect(manifestRes.body.bus.hasLeader).toBe(true);
    expect(manifestRes.body.bus.isCompleted).toBe(true);
  });
});

describe('4. Excel Import and Student-Guest Relationship Tests', () => {
  it('should parse Excel file and validate columns, students, and guests', async () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const sampleExcelData = [
      {
        'الرقم العسكري': `30${rand}`,
        'اسم الطالب': 'محمود سمير عبد الرحمن ناصر',
        'اسم المدعو رباعي': 'سمير عبد الرحمن ناصر السيد',
        'درجة القرابة': 'والد',
        'الرقم القومي': `2640510010${rand}`,
      },
      {
        'الرقم العسكري': `30${rand}`,
        'اسم الطالب': 'محمود سمير عبد الرحمن ناصر',
        'اسم المدعو رباعي': 'هند إسماعيل أحمد مصطفى',
        'درجة القرابة': 'والدة',
        'الرقم القومي': `2710822010${rand}`,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleExcelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الضيوف');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test_batch.xlsx');
    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(2);
    expect(preview.studentsCount).toBe(1);

    const commitResult = await commitImportBatch(preview.previewRows, 'test_batch.xlsx', 'admin', 'مدير المنظومة');
    expect(commitResult.insertedGuests).toBe(2);
    expect(commitResult.insertedStudents).toBe(1);

    const student = await prisma.student.findUnique({
      where: { militaryNumber: `30${rand}` },
      include: { guests: true },
    });
    expect(student).toBeDefined();
    expect(student?.guests.length).toBe(2);
  });
});

describe('5. Real-Time Dashboard Statistics Test', () => {
  it('should calculate live statistics from database records accurately', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { stats } = res.body;

    expect(stats.totalSystemSeats).toBe(972);
    expect(stats.totalGuests).toBeGreaterThan(0);
    expect(stats.attendedGuests + stats.absentGuests).toBe(stats.totalGuests);
    expect(stats.totalAssignedSeats).toBe(stats.attendedGuests);
    expect(stats.availableSeats).toBe(972 - stats.totalAssignedSeats);
    expect(stats.completedBuses).toBeGreaterThanOrEqual(1);
  });
});
