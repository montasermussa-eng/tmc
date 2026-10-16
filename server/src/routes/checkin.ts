import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { normalizeNumerals, maskNationalId } from '../services/nationalIdValidator';
import { checkinAndAllocateGuest } from '../services/allocationService';

export const checkinRouter = Router();

// Live Attendance Stats Counter for Gate Check-in
checkinRouter.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalGuests, attendedGuests] = await Promise.all([
      prisma.guest.count(),
      prisma.guest.count({ where: { hasAttended: true } }),
    ]);
    const absentGuests = totalGuests - attendedGuests;
    const percentage = totalGuests > 0 ? Math.round((attendedGuests / totalGuests) * 100) : 0;

    return res.json({
      totalGuests,
      attendedGuests,
      absentGuests,
      percentage,
    });
  } catch (error: any) {
    console.error('Checkin stats error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب إحصائيات الحضور' });
  }
});

// Fast Gate Search by Last 7 Digits of National ID
checkinRouter.get('/search', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawSuffix = req.query.suffix as string;
    if (!rawSuffix) {
      return res.status(400).json({ error: 'يرجى إدخال آخر ٧ أرقام من الرقم القومي' });
    }

    const normalized = normalizeNumerals(rawSuffix);
    if (normalized.length !== 7) {
      return res.status(400).json({
        error: `يجب إدخال ٧ أرقام بالضبط (المُدخل حالياً: ${normalized.length} رقم)`,
      });
    }

    // Search guests matching the 7-digit suffix
    const matchingGuests = await prisma.guest.findMany({
      where: {
        nationalIdSuffix: normalized,
      },
      include: {
        student: true,
        bus: {
          include: {
            leader: true,
          },
        },
      },
    });

    if (matchingGuests.length === 0) {
      return res.json({
        matchesCount: 0,
        message: 'لم يتم العثور على المدعو',
        suffix: normalized,
      });
    }

    const isAuthorizedForFullId = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';

    const formattedGuests = matchingGuests.map((g) => ({
      id: g.id,
      fullName: g.fullName,
      nationalId: isAuthorizedForFullId ? g.nationalId : maskNationalId(g.nationalId),
      nationalIdMasked: maskNationalId(g.nationalId),
      nationalIdFull: isAuthorizedForFullId ? g.nationalId : undefined,
      nationalIdSuffix: g.nationalIdSuffix,
      relationship: g.relationship || 'غير محدد',
      isIndependent: g.isIndependent,
      studentName: g.student?.fullName || (g.isIndependent ? 'غير مرتبط بطالب' : 'غير متوفر'),
      studentMilitaryNumber: g.student?.militaryNumber || (g.isIndependent ? '-' : 'غير متوفر'),
      hasAttended: g.hasAttended,
      checkedInAt: g.checkedInAt,
      busNumber: g.bus?.busNumber || null,
      seatNumber: g.seatNumber || null,
      busStatus: g.bus?.status || null,
      notes: g.notes,
    }));

    if (formattedGuests.length === 1) {
      return res.json({
        matchesCount: 1,
        guest: formattedGuests[0],
      });
    }

    // Multiple candidates found: return list for disambiguation
    return res.json({
      matchesCount: formattedGuests.length,
      multipleMatches: true,
      candidates: formattedGuests,
      message: `تم العثور على أكثر من مدعو (${formattedGuests.length}) يشتركون في آخر ٧ أرقام. يرجى اختيار المدعو الصحيح للتحقق والمتابعة.`,
    });
  } catch (error: any) {
    console.error('Checkin search error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء البحث عن المدعو' });
  }
});

// Execute Check-in and Concurrency-Safe Bus Allocation
checkinRouter.post('/execute', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { guestId } = req.body;
    if (!guestId) {
      return res.status(400).json({ error: 'معرف المدعو مطلوب لتسجيل الدخول' });
    }

    const result = await checkinAndAllocateGuest(
      guestId,
      req.user?.id,
      req.user?.fullName,
      req.ip
    );

    return res.json(result);
  } catch (error: any) {
    console.error('Checkin execute error:', error);
    return res.status(400).json({
      error: error.message || 'فشل تسجيل دخول المدعو',
    });
  }
});

// Search Students by Military Number or Name with Associated Guests
checkinRouter.get('/student-search', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawQuery = (req.query.query as string || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ error: 'يرجى إدخال الرقم العسكري للطالب أو اسمه' });
    }

    const normalizedQuery = normalizeNumerals(rawQuery);

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { militaryNumber: { contains: normalizedQuery } },
          { militaryNumber: { contains: rawQuery } },
          { fullName: { contains: rawQuery } },
        ],
      },
      include: {
        guests: {
          include: {
            bus: true,
          },
          orderBy: [
            { hasAttended: 'desc' },
            { relationship: 'asc' },
            { fullName: 'asc' },
          ],
        },
      },
      take: 10,
    });

    if (students.length === 0) {
      return res.json({
        found: false,
        students: [],
        message: `لم يتم العثور على طالب يطابق الرقم العسكري أو الاسم [${rawQuery}]`,
      });
    }

    const isAuthorizedForFullId = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';

    const formattedStudents = students.map((s) => ({
      id: s.id,
      militaryNumber: s.militaryNumber,
      fullName: s.fullName,
      totalGuests: s.guests.length,
      attendedGuests: s.guests.filter((g) => g.hasAttended).length,
      absentGuests: s.guests.filter((g) => !g.hasAttended).length,
      guests: s.guests.map((g) => ({
        id: g.id,
        fullName: g.fullName,
        nationalId: isAuthorizedForFullId ? g.nationalId : maskNationalId(g.nationalId),
        nationalIdMasked: maskNationalId(g.nationalId),
        relationship: g.relationship || 'غير محدد',
        hasAttended: g.hasAttended,
        checkedInAt: g.checkedInAt,
        busNumber: g.bus?.busNumber || null,
        seatNumber: g.seatNumber || null,
      })),
    }));

    return res.json({
      found: true,
      studentsCount: formattedStudents.length,
      students: formattedStudents,
    });
  } catch (error: any) {
    console.error('Student checkin search error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء البحث عن الطالب ومدعويه' });
  }
});

// Batch Check-in and Concurrency-Safe Bus Allocation for multiple selected guests
checkinRouter.post('/batch-execute', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { guestIds } = req.body;
    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      return res.status(400).json({ error: 'يرجى تحديد مدعو واحد على الأقل لتسجيل الدخول' });
    }

    const results = [];
    let busFullAlert = false;
    let fullBusNumber = 0;

    for (const guestId of guestIds) {
      try {
        const alloc = await checkinAndAllocateGuest(
          guestId,
          req.user?.id,
          req.user?.fullName,
          req.ip
        );
        results.push({
          guestId,
          guestName: alloc.guest?.fullName || '',
          success: true,
          alreadyCheckedIn: !!alloc.alreadyCheckedIn,
          busNumber: alloc.busNumber,
          seatNumber: alloc.seatNumber,
          isBusNowFull: alloc.isBusNowFull,
          message: alloc.message,
        });

        if (alloc.isBusNowFull) {
          busFullAlert = true;
          fullBusNumber = alloc.busNumber;
        }
      } catch (err: any) {
        results.push({
          guestId,
          guestName: '',
          success: false,
          alreadyCheckedIn: false,
          busNumber: 0,
          seatNumber: 0,
          isBusNowFull: false,
          message: err.message || 'فشل تسكين هذا المدعو',
        });
      }
    }

    const successfulCount = results.filter((r) => r.success).length;

    return res.json({
      success: successfulCount > 0,
      totalRequested: guestIds.length,
      successfulCount,
      results,
      busFullAlert,
      fullBusNumber,
      message: `تم بنجاح تسجيل حضور وتسكين (${successfulCount}) من أصل (${guestIds.length}) مدعوين في الأتوبيسات.`,
    });
  } catch (error: any) {
    console.error('Batch checkin execute error:', error);
    return res.status(500).json({
      error: error.message || 'فشل تسجيل الدخول الجماعي للمدعوين',
    });
  }
});
