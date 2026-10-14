import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { maskNationalId } from '../services/nationalIdValidator';

export const reportsRouter = Router();

// Dashboard Statistics (Calculated dynamically from live DB)
reportsRouter.get('/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalGuests, attendedGuests, totalStudents, buses] = await Promise.all([
      prisma.guest.count(),
      prisma.guest.count({ where: { hasAttended: true } }),
      prisma.student.count(),
      prisma.bus.findMany({
        include: {
          leader: true,
          _count: {
            select: { guests: true },
          },
        },
      }),
    ]);

    const absentGuests = totalGuests - attendedGuests;
    const attendanceRate = totalGuests > 0 ? Math.round((attendedGuests / totalGuests) * 100) : 0;

    let fullBuses = 0;
    let partialBuses = 0;
    let emptyBuses = 0;
    let completedBuses = 0; // 36 guests + leader
    let fullAwaitingLeader = 0; // 36 guests but no leader

    for (const b of buses) {
      const count = b._count.guests;
      if (count >= 36) {
        fullBuses++;
        if (b.leader) {
          completedBuses++;
        } else {
          fullAwaitingLeader++;
        }
      } else if (count > 0) {
        partialBuses++;
      } else {
        emptyBuses++;
      }
    }

    const totalSystemSeats = 27 * 36; // 972 seats
    const totalAssignedSeats = buses.reduce((acc, b) => acc + b._count.guests, 0);
    const availableSeats = Math.max(0, totalSystemSeats - totalAssignedSeats);
    const unallocatedGuests = totalGuests - totalAssignedSeats;

    return res.json({
      stats: {
        totalGuests,
        attendedGuests,
        absentGuests,
        attendanceRate,
        totalStudents,
        totalSystemSeats,
        totalAssignedSeats,
        availableSeats,
        unallocatedGuests,
        fullBuses,
        partialBuses,
        emptyBuses,
        completedBuses,
        fullAwaitingLeader,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'فشل استخراج إحصائيات لوحة التحكم' });
  }
});

// Export Filtered Guests List as Excel (.xlsx)
reportsRouter.get('/export/guests', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string; // 'ALL', 'ATTENDED', 'ABSENT'
    const busNumber = req.query.busNumber ? parseInt(req.query.busNumber as string, 10) : undefined;

    const where: any = {};
    if (status === 'ATTENDED') where.hasAttended = true;
    if (status === 'ABSENT') where.hasAttended = false;
    if (busNumber) where.bus = { busNumber };

    const guests = await prisma.guest.findMany({
      where,
      orderBy: [{ busId: 'asc' }, { seatNumber: 'asc' }, { fullName: 'asc' }],
      include: {
        student: true,
        bus: true,
      },
    });

    const isAuthorized = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';

    const data = guests.map((g, idx) => ({
      'م': idx + 1,
      'اسم المدعو رباعي': g.fullName,
      'الرقم القومي': isAuthorized ? g.nationalId : maskNationalId(g.nationalId),
      'اسم الطالب المرتبط به': g.student?.fullName || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
      'الرقم العسكري للطالب': g.student?.militaryNumber || (g.isIndependent ? '-' : '-'),
      'درجة القرابة': g.relationship || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
      'حالة الحضور': g.hasAttended ? 'حاضر' : 'لم يحضر',
      'رقم الأتوبيس': g.bus?.busNumber ? `أتوبيس ${g.bus.busNumber}` : 'لم يخصص',
      'رقم المقعد': g.seatNumber || '-',
      'توقيت الحضور': g.checkedInAt ? g.checkedInAt.toLocaleString('ar-EG') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل المدعوين');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="TMC_Guests_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (error: any) {
    console.error('Export guests error:', error);
    return res.status(500).json({ error: 'فشل تصدير كشف المدعوين' });
  }
});

// Export Single Bus Manifest as Excel (.xlsx)
reportsRouter.get('/export/manifest/:busNumber', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const busNumber = parseInt(req.params.busNumber, 10);
    const bus = await prisma.bus.findUnique({
      where: { busNumber },
      include: {
        leader: true,
        guests: {
          orderBy: { seatNumber: 'asc' },
          include: { student: true },
        },
      },
    });

    if (!bus) {
      return res.status(404).json({ error: 'سجل الأتوبيس غير موجود' });
    }

    const isAuthorized = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';

    const passengerRows: any[] = bus.guests.map((g, idx) => ({
      'مسلسل': idx + 1,
      'رقم المقعد': g.seatNumber || idx + 1,
      'اسم المدعو رباعي': g.fullName,
      'الرقم القومي': isAuthorized ? g.nationalId : maskNationalId(g.nationalId),
      'اسم الطالب': g.student?.fullName || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
      'الرقم العسكري للطالب': g.student?.militaryNumber || '-',
      'درجة القرابة': g.relationship || '-',
      'وقت تسجيل الدخول': g.checkedInAt ? g.checkedInAt.toLocaleTimeString('ar-EG') : '-',
    }));

    if (bus.leader) {
      passengerRows.push({
        'مسلسل': 'قائد الأتوبيس',
        'رقم المقعد': 'المقعد القيادي',
        'اسم المدعو رباعي': `${bus.leader.rank} / ${bus.leader.fullName}`,
        'الرقم القومي': '—',
        'اسم الطالب': '—',
        'الرقم العسكري للطالب': '—',
        'درجة القرابة': 'قائد الأتوبيس',
        'وقت تسجيل الدخول': 'معين رسمياً',
      });
    }

    const ws = XLSX.utils.json_to_sheet(passengerRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `أتوبيس_${busNumber}`);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="TMC_Bus_${busNumber}_Manifest.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل تصدير كشف الأتوبيس' });
  }
});
