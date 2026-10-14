"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const XLSX = __importStar(require("xlsx"));
const index_1 = require("../index");
const db_1 = require("../db");
const nationalIdValidator_1 = require("../services/nationalIdValidator");
const allocationService_1 = require("../services/allocationService");
const importService_1 = require("../services/importService");
let adminToken;
let gateToken;
(0, vitest_1.beforeAll)(async () => {
    // Login as admin
    const adminRes = await (0, supertest_1.default)(index_1.app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.token;
    // Login as gate operator
    const gateRes = await (0, supertest_1.default)(index_1.app)
        .post('/api/auth/login')
        .send({ username: 'gate1', password: 'gate123' });
    gateToken = gateRes.body.token;
});
(0, vitest_1.afterAll)(async () => {
    await db_1.prisma.$disconnect();
});
(0, vitest_1.describe)('1. National ID Validator & Normalization Tests', () => {
    (0, vitest_1.it)('should normalize Arabic-Indic digits to standard digits', () => {
        (0, vitest_1.expect)((0, nationalIdValidator_1.normalizeNumerals)('٢٩٨٠٣١٢٠١٠١٩١٥')).toBe('29803120101915');
        (0, vitest_1.expect)((0, nationalIdValidator_1.normalizeNumerals)('  ١٠٢٣٤٥  ')).toBe('102345');
    });
    (0, vitest_1.it)('should accurately extract the last 7 digits for gate check-in', () => {
        (0, vitest_1.expect)((0, nationalIdValidator_1.extractLast7Digits)('29803120101915')).toBe('0101915');
        (0, vitest_1.expect)((0, nationalIdValidator_1.extractLast7Digits)('٢٩٨٠٣١٢٠١٠١٩١٥')).toBe('0101915');
    });
    (0, vitest_1.it)('should validate a correct Egyptian National ID and extract demographic metadata', () => {
        const result = (0, nationalIdValidator_1.validateEgyptianNationalId)('29803120101915');
        (0, vitest_1.expect)(result.isValid).toBe(true);
        (0, vitest_1.expect)(result.details?.century).toBe(1900);
        (0, vitest_1.expect)(result.details?.birthDate).toBe('1998-03-12');
        (0, vitest_1.expect)(result.details?.governorate).toBe('القاهرة');
        (0, vitest_1.expect)(result.details?.gender).toBe('ذكر');
    });
    (0, vitest_1.it)('should reject invalid National IDs (wrong length, wrong month, invalid governorate)', () => {
        (0, vitest_1.expect)((0, nationalIdValidator_1.validateEgyptianNationalId)('12345').isValid).toBe(false);
        (0, vitest_1.expect)((0, nationalIdValidator_1.validateEgyptianNationalId)('29813120101915').isValid).toBe(false);
        (0, vitest_1.expect)((0, nationalIdValidator_1.validateEgyptianNationalId)('29803990101915').isValid).toBe(false);
        (0, vitest_1.expect)((0, nationalIdValidator_1.validateEgyptianNationalId)('29803129901915').isValid).toBe(false);
    });
    (0, vitest_1.it)('should properly mask national ID for non-privileged displays', () => {
        (0, vitest_1.expect)((0, nationalIdValidator_1.maskNationalId)('29803120101915')).toBe('298****0101915');
    });
});
(0, vitest_1.describe)('2. Gate Check-in Fast 7-Digit Search Tests', () => {
    (0, vitest_1.it)('should reject search queries that are not exactly 7 digits', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .get('/api/checkin/search?suffix=123')
            .set('Authorization', `Bearer ${gateToken}`);
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toContain('٧ أرقام بالضبط');
    });
    (0, vitest_1.it)('should find guest by last 7 digits with Western and Arabic numerals', async () => {
        const resWestern = await (0, supertest_1.default)(index_1.app)
            .get('/api/checkin/search?suffix=0102431')
            .set('Authorization', `Bearer ${gateToken}`);
        (0, vitest_1.expect)(resWestern.status).toBe(200);
        (0, vitest_1.expect)(resWestern.body.matchesCount).toBe(1);
        (0, vitest_1.expect)(resWestern.body.guest.fullName).toContain('محمود علي إبراهيم');
        const resArabic = await (0, supertest_1.default)(index_1.app)
            .get('/api/checkin/search?suffix=٠١٠٢٤٣١')
            .set('Authorization', `Bearer ${gateToken}`);
        (0, vitest_1.expect)(resArabic.status).toBe(200);
        (0, vitest_1.expect)(resArabic.body.matchesCount).toBe(1);
        (0, vitest_1.expect)(resArabic.body.guest.fullName).toContain('محمود علي إبراهيم');
    });
    (0, vitest_1.it)('should handle non-existent guest with clear Arabic feedback', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .get('/api/checkin/search?suffix=9999999')
            .set('Authorization', `Bearer ${gateToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.matchesCount).toBe(0);
        (0, vitest_1.expect)(res.body.message).toBe('لم يتم العثور على المدعو');
    });
});
(0, vitest_1.describe)('3. Concurrency-Safe 27-Bus Allocation & Leader Workflow Tests', () => {
    (0, vitest_1.it)('should allocate first checked-in guest to lowest available bus and increment seat', async () => {
        const guest = await db_1.prisma.guest.findFirst({
            where: { hasAttended: false },
        });
        (0, vitest_1.expect)(guest).toBeDefined();
        const result = await (0, allocationService_1.checkinAndAllocateGuest)(guest.id, 'gate1', 'ضابط البوابة');
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(result.alreadyCheckedIn).toBeFalsy();
        (0, vitest_1.expect)(result.busNumber).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(result.seatNumber).toBeGreaterThanOrEqual(1);
        const updatedGuest = await db_1.prisma.guest.findUnique({
            where: { id: guest.id },
            include: { bus: true },
        });
        (0, vitest_1.expect)(updatedGuest?.hasAttended).toBe(true);
        (0, vitest_1.expect)(updatedGuest?.bus?.busNumber).toBe(result.busNumber);
    });
    (0, vitest_1.it)('should prevent duplicate check-in and retain original seat and bus assignment', async () => {
        const attendedGuest = await db_1.prisma.guest.findFirst({
            where: { hasAttended: true },
            include: { bus: true },
        });
        (0, vitest_1.expect)(attendedGuest).toBeDefined();
        const originalSeat = attendedGuest.seatNumber;
        const originalBusNumber = attendedGuest.bus?.busNumber;
        const secondResult = await (0, allocationService_1.checkinAndAllocateGuest)(attendedGuest.id, 'gate1', 'ضابط البوابة');
        (0, vitest_1.expect)(secondResult.success).toBe(true);
        (0, vitest_1.expect)(secondResult.alreadyCheckedIn).toBe(true);
        (0, vitest_1.expect)(secondResult.seatNumber).toBe(originalSeat);
        (0, vitest_1.expect)(secondResult.busNumber).toBe(originalBusNumber);
    });
    (0, vitest_1.it)('should fill Bus 1 sequentially up to exactly 36 seats, then move to Bus 2', async () => {
        const bus1 = await db_1.prisma.bus.findUnique({
            where: { busNumber: 1 },
            include: { _count: { select: { guests: true } } },
        });
        const currentCount = bus1._count.guests;
        const remainingToFill = 36 - currentCount;
        const runId = Date.now().toString().slice(-5);
        const testGuests = [];
        for (let i = 0; i < remainingToFill; i++) {
            const uniqueSuffix = `${runId}${String(i).padStart(2, '0')}`;
            const testG = await db_1.prisma.guest.create({
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
            const res = await (0, allocationService_1.checkinAndAllocateGuest)(testGuests[i], 'gate1', 'مشغل اختبار');
            (0, vitest_1.expect)(res.busNumber).toBe(1);
        }
        const bus1After = await db_1.prisma.bus.findUnique({
            where: { busNumber: 1 },
            include: { _count: { select: { guests: true } } },
        });
        (0, vitest_1.expect)(bus1After?._count.guests).toBe(36);
        (0, vitest_1.expect)(bus1After?.status).toBe('FULL');
        // Create 1 more guest - must overflow into Bus 2, Seat 1!
        const overflowSuffix = `${runId}99`;
        const overflowGuest = await db_1.prisma.guest.create({
            data: {
                fullName: 'مدعو اختباري بداية أتوبيس 2',
                nationalId: `2900101${overflowSuffix}`,
                nationalIdSuffix: overflowSuffix,
                isIndependent: true,
                hasAttended: false,
            },
        });
        const overflowRes = await (0, allocationService_1.checkinAndAllocateGuest)(overflowGuest.id, 'gate1', 'مشغل اختبار');
        (0, vitest_1.expect)(overflowRes.busNumber).toBe(2);
        (0, vitest_1.expect)(overflowRes.seatNumber).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('should register bus leader without taking one of the 36 guest seats', async () => {
        const leaderRes = await (0, supertest_1.default)(index_1.app)
            .post('/api/buses/1/leader')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            rank: 'رائد',
            fullName: 'حازم محمد عبد الرحيم',
            phone: '01012345678',
        });
        (0, vitest_1.expect)(leaderRes.status).toBe(200);
        (0, vitest_1.expect)(leaderRes.body.success).toBe(true);
        (0, vitest_1.expect)(leaderRes.body.leader.rank).toBe('رائد');
        // Manifest must show 36 guests + 1 leader = 37 total manifest count
        const manifestRes = await (0, supertest_1.default)(index_1.app)
            .get('/api/buses/1')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(manifestRes.status).toBe(200);
        (0, vitest_1.expect)(manifestRes.body.bus.assignedGuests).toBe(36);
        (0, vitest_1.expect)(manifestRes.body.bus.totalManifestCount).toBe(37);
        (0, vitest_1.expect)(manifestRes.body.bus.hasLeader).toBe(true);
        (0, vitest_1.expect)(manifestRes.body.bus.isCompleted).toBe(true);
    });
});
(0, vitest_1.describe)('4. Excel Import and Student-Guest Relationship Tests', () => {
    (0, vitest_1.it)('should parse Excel file and validate columns, students, and guests', async () => {
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
        const preview = await (0, importService_1.parseAndValidateExcel)(buffer, 'test_batch.xlsx');
        (0, vitest_1.expect)(preview.totalRows).toBe(2);
        (0, vitest_1.expect)(preview.validCount).toBe(2);
        (0, vitest_1.expect)(preview.studentsCount).toBe(1);
        const commitResult = await (0, importService_1.commitImportBatch)(preview.previewRows, 'test_batch.xlsx', 'admin', 'مدير المنظومة');
        (0, vitest_1.expect)(commitResult.insertedGuests).toBe(2);
        (0, vitest_1.expect)(commitResult.insertedStudents).toBe(1);
        const student = await db_1.prisma.student.findUnique({
            where: { militaryNumber: `30${rand}` },
            include: { guests: true },
        });
        (0, vitest_1.expect)(student).toBeDefined();
        (0, vitest_1.expect)(student?.guests.length).toBe(2);
    });
});
(0, vitest_1.describe)('5. Real-Time Dashboard Statistics Test', () => {
    (0, vitest_1.it)('should calculate live statistics from database records accurately', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .get('/api/reports/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        const { stats } = res.body;
        (0, vitest_1.expect)(stats.totalSystemSeats).toBe(972);
        (0, vitest_1.expect)(stats.totalGuests).toBeGreaterThan(0);
        (0, vitest_1.expect)(stats.attendedGuests + stats.absentGuests).toBe(stats.totalGuests);
        (0, vitest_1.expect)(stats.totalAssignedSeats).toBe(stats.attendedGuests);
        (0, vitest_1.expect)(stats.availableSeats).toBe(972 - stats.totalAssignedSeats);
        (0, vitest_1.expect)(stats.completedBuses).toBeGreaterThanOrEqual(1);
    });
});
