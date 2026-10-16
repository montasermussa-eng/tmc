import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateEgyptianNationalId, extractLast7Digits, maskNationalId, normalizeNumerals } from '../services/nationalIdValidator';
import { logAudit } from '../services/auditService';
import { revertGuestCheckin } from '../services/allocationService';

export const guestsRouter = Router();

// List guests with pagination, search, and filters
guestsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string; // 'ALL', 'ATTENDED', 'ABSENT'
    const relationship = req.query.relationship as string;
    const busNumber = req.query.busNumber ? parseInt(req.query.busNumber as string, 10) : undefined;
    const militaryNumber = req.query.militaryNumber as string;

    const where: any = {};

    if (search) {
      const normalizedSearch = normalizeNumerals(search);
      where.OR = [
        { fullName: { contains: search } },
        { nationalId: { contains: normalizedSearch || search } },
        { nationalIdSuffix: { contains: normalizedSearch || search } },
        { student: { fullName: { contains: search } } },
        { student: { militaryNumber: { contains: normalizedSearch || search } } },
      ];
    }

    if (status === 'ATTENDED') {
      where.hasAttended = true;
    } else if (status === 'ABSENT') {
      where.hasAttended = false;
    }

    if (relationship && relationship !== 'ALL') {
      where.relationship = relationship;
    }

    if (busNumber) {
      where.bus = { busNumber };
    }

    if (militaryNumber) {
      where.student = { militaryNumber: normalizeNumerals(militaryNumber) || militaryNumber };
    }

    const [total, guests] = await Promise.all([
      prisma.guest.count({ where }),
      prisma.guest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ hasAttended: 'desc' }, { checkedInAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          student: true,
          bus: true,
        },
      }),
    ]);

    const isAuthorizedForFullId = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';

    const formattedGuests = guests.map((g) => ({
      id: g.id,
      fullName: g.fullName,
      nationalId: isAuthorizedForFullId ? g.nationalId : maskNationalId(g.nationalId),
      nationalIdMasked: maskNationalId(g.nationalId),
      nationalIdFull: isAuthorizedForFullId ? g.nationalId : undefined,
      relationship: g.relationship || (g.isIndependent ? 'غير مرتبط بطالب' : 'غير محدد'),
      isIndependent: g.isIndependent,
      studentName: g.student?.fullName || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
      studentMilitaryNumber: g.student?.militaryNumber || (g.isIndependent ? '-' : '-'),
      studentId: g.studentId,
      hasAttended: g.hasAttended,
      checkedInAt: g.checkedInAt,
      busNumber: g.bus?.busNumber || null,
      seatNumber: g.seatNumber || null,
      createdAt: g.createdAt,
    }));

    return res.json({
      guests: formattedGuests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('List guests error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المدعوين' });
  }
});

// Get single guest
guestsRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        bus: {
          include: {
            leader: true,
          },
        },
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'سجل المدعو غير موجود' });
    }

    const isAuthorized = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';

    return res.json({
      ...guest,
      nationalId: isAuthorized ? guest.nationalId : maskNationalId(guest.nationalId),
      nationalIdMasked: maskNationalId(guest.nationalId),
      nationalIdFull: isAuthorized ? guest.nationalId : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المدعو' });
  }
});

// Add New Guest
guestsRouter.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, nationalId, isRelatedToStudent, militaryNumber, relationship, notes } = req.body;

    if (!fullName || !nationalId) {
      return res.status(400).json({ error: 'اسم المدعو رباعي والرقم القومي كلاهما مطلوب' });
    }

    const trimmedName = String(fullName).trim();
    const normalizedNationalId = normalizeNumerals(nationalId);

    // Validate National ID
    const idValidation = validateEgyptianNationalId(normalizedNationalId);
    if (!idValidation.isValid) {
      return res.status(400).json({ error: idValidation.error || 'الرقم القومي غير صالح' });
    }

    // Check duplicate National ID
    const existing = await prisma.guest.findUnique({
      where: { nationalId: normalizedNationalId },
    });
    if (existing) {
      return res.status(400).json({ error: 'هذا الرقم القومي مسجل بالفعل في المنظومة لمدعو آخر' });
    }

    let studentId: number | null = null;
    let finalRelationship = relationship;

    if (isRelatedToStudent) {
      if (!militaryNumber) {
        return res.status(400).json({ error: 'يرجى إدخال الرقم العسكري للطالب المرتبط به المدعو' });
      }

      const normalizedMil = normalizeNumerals(militaryNumber);
      const student = await prisma.student.findUnique({
        where: { militaryNumber: normalizedMil },
      });

      if (!student) {
        return res.status(400).json({
          error: `لم يتم العثور على طالب بالرقم العسكري [${normalizedMil}]. يرجى التأكد من الرقم العسكري أو تسجيل الطالب أولاً.`,
        });
      }

      if (!relationship) {
        return res.status(400).json({ error: 'يرجى تحديد درجة القرابة للطالب' });
      }

      studentId = student.id;
    } else {
      finalRelationship = null;
    }

    // Create Guest (always hasAttended: false initially)
    const newGuest = await prisma.guest.create({
      data: {
        fullName: trimmedName,
        nationalId: normalizedNationalId,
        nationalIdSuffix: extractLast7Digits(normalizedNationalId),
        studentId,
        relationship: finalRelationship,
        isIndependent: !isRelatedToStudent,
        hasAttended: false,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        student: true,
      },
    });

    await logAudit({
      action: 'GUEST_CREATED',
      entityType: 'GUEST',
      entityId: newGuest.id,
      details: `إضافة مدعو جديد يدوياً: [${newGuest.fullName}] - الرقم القومي [${maskNationalId(newGuest.nationalId)}] ${
        isRelatedToStudent ? `(مرتبط بالطالب: ${newGuest.student?.fullName})` : '(غير مرتبط بطالب)'
      }`,
      userId: req.user?.id,
      userName: req.user?.fullName,
      userRole: req.user?.role,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إضافة المدعو بنجاح. المدعو جاهز الآن لتسجيل الدخول عند البوابة.',
      guest: {
        ...newGuest,
        nationalId: maskNationalId(newGuest.nationalId),
        nationalIdMasked: maskNationalId(newGuest.nationalId),
      },
    });
  } catch (error: any) {
    console.error('Add guest error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إضافة المدعو' });
  }
});

// Edit Guest
guestsRouter.put('/:id', authenticate, requireRole(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, relationship, notes } = req.body;
    const guestId = req.params.id;

    const guest = await prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      return res.status(404).json({ error: 'سجل المدعو غير موجود' });
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        fullName: fullName ? String(fullName).trim() : guest.fullName,
        relationship: relationship !== undefined ? relationship : guest.relationship,
        notes: notes !== undefined ? notes : guest.notes,
      },
    });

    await logAudit({
      action: 'GUEST_UPDATED',
      entityType: 'GUEST',
      entityId: guestId,
      details: `تعديل بيانات المدعو [${updated.fullName}]`,
      userId: req.user?.id,
      userName: req.user?.fullName,
      userRole: req.user?.role,
      ipAddress: req.ip,
    });

    return res.json({ success: true, guest: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل تحديث بيانات المدعو' });
  }
});

// Delete Guest (Admin & Supervisor)
guestsRouter.delete('/:id', authenticate, requireRole(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guestId = req.params.id;
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        bus: true,
        student: true,
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'سجل المدعو غير موجود في المنظومة' });
    }

    // If guest was checked in or seated in a bus, revert their check-in first to free the seat and resequence
    if (guest.hasAttended || guest.busId) {
      await revertGuestCheckin(
        guestId,
        req.user?.id,
        req.user?.fullName,
        req.user?.role,
        req.ip
      );
    }

    // Delete the guest permanently from the database
    await prisma.guest.delete({ where: { id: guestId } });

    await logAudit({
      action: 'GUEST_DELETED',
      entityType: 'GUEST',
      entityId: guestId,
      details: `حذف واستبعاد سجل المدعو [${guest.fullName}] - الرقم القومي [${maskNationalId(guest.nationalId)}] ${
        guest.student ? `(طالب: ${guest.student.fullName})` : '(مستقل)'
      }`,
      userId: req.user?.id,
      userName: req.user?.fullName,
      userRole: req.user?.role,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `تم حذف واستبعاد سجل المدعو (${guest.fullName}) نهائياً من المنظومة بنجاح`,
    });
  } catch (error: any) {
    console.error('Delete guest error:', error);
    return res.status(500).json({ error: error.message || 'فشل حذف سجل المدعو' });
  }
});
