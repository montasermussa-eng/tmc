"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nationalIdValidator_1 = require("../services/nationalIdValidator");
const auditService_1 = require("../services/auditService");
const allocationService_1 = require("../services/allocationService");
exports.guestsRouter = (0, express_1.Router)();
// List guests with pagination, search, and filters
exports.guestsRouter.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = req.query.status; // 'ALL', 'ATTENDED', 'ABSENT'
        const relationship = req.query.relationship;
        const busNumber = req.query.busNumber ? parseInt(req.query.busNumber, 10) : undefined;
        const militaryNumber = req.query.militaryNumber;
        const where = {};
        if (search) {
            const normalizedSearch = (0, nationalIdValidator_1.normalizeNumerals)(search);
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
        }
        else if (status === 'ABSENT') {
            where.hasAttended = false;
        }
        if (relationship && relationship !== 'ALL') {
            where.relationship = relationship;
        }
        if (busNumber) {
            where.bus = { busNumber };
        }
        if (militaryNumber) {
            where.student = { militaryNumber: (0, nationalIdValidator_1.normalizeNumerals)(militaryNumber) || militaryNumber };
        }
        const [total, guests] = await Promise.all([
            db_1.prisma.guest.count({ where }),
            db_1.prisma.guest.findMany({
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
            nationalId: isAuthorizedForFullId ? g.nationalId : (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            nationalIdMasked: (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
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
    }
    catch (error) {
        console.error('List guests error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المدعوين' });
    }
});
// Get single guest
exports.guestsRouter.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const guest = await db_1.prisma.guest.findUnique({
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
            nationalId: isAuthorized ? guest.nationalId : (0, nationalIdValidator_1.maskNationalId)(guest.nationalId),
            nationalIdMasked: (0, nationalIdValidator_1.maskNationalId)(guest.nationalId),
            nationalIdFull: isAuthorized ? guest.nationalId : undefined,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المدعو' });
    }
});
// Add New Guest
exports.guestsRouter.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { fullName, nationalId, isRelatedToStudent, militaryNumber, relationship, notes } = req.body;
        if (!fullName || !nationalId) {
            return res.status(400).json({ error: 'اسم المدعو رباعي والرقم القومي كلاهما مطلوب' });
        }
        const trimmedName = String(fullName).trim();
        const normalizedNationalId = (0, nationalIdValidator_1.normalizeNumerals)(nationalId);
        // Validate National ID
        const idValidation = (0, nationalIdValidator_1.validateEgyptianNationalId)(normalizedNationalId);
        if (!idValidation.isValid) {
            return res.status(400).json({ error: idValidation.error || 'الرقم القومي غير صالح' });
        }
        // Check duplicate National ID
        const existing = await db_1.prisma.guest.findUnique({
            where: { nationalId: normalizedNationalId },
        });
        if (existing) {
            return res.status(400).json({ error: 'هذا الرقم القومي مسجل بالفعل في المنظومة لمدعو آخر' });
        }
        let studentId = null;
        let finalRelationship = relationship;
        if (isRelatedToStudent) {
            if (!militaryNumber) {
                return res.status(400).json({ error: 'يرجى إدخال الرقم العسكري للطالب المرتبط به المدعو' });
            }
            const normalizedMil = (0, nationalIdValidator_1.normalizeNumerals)(militaryNumber);
            const student = await db_1.prisma.student.findUnique({
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
        }
        else {
            finalRelationship = null;
        }
        // Create Guest (always hasAttended: false initially)
        const newGuest = await db_1.prisma.guest.create({
            data: {
                fullName: trimmedName,
                nationalId: normalizedNationalId,
                nationalIdSuffix: (0, nationalIdValidator_1.extractLast7Digits)(normalizedNationalId),
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
        await (0, auditService_1.logAudit)({
            action: 'GUEST_CREATED',
            entityType: 'GUEST',
            entityId: newGuest.id,
            details: `إضافة مدعو جديد يدوياً: [${newGuest.fullName}] - الرقم القومي [${(0, nationalIdValidator_1.maskNationalId)(newGuest.nationalId)}] ${isRelatedToStudent ? `(مرتبط بالطالب: ${newGuest.student?.fullName})` : '(غير مرتبط بطالب)'}`,
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
                nationalId: (0, nationalIdValidator_1.maskNationalId)(newGuest.nationalId),
                nationalIdMasked: (0, nationalIdValidator_1.maskNationalId)(newGuest.nationalId),
            },
        });
    }
    catch (error) {
        console.error('Add guest error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء إضافة المدعو' });
    }
});
// Edit Guest
exports.guestsRouter.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN', 'SUPERVISOR']), async (req, res) => {
    try {
        const { fullName, relationship, notes } = req.body;
        const guestId = req.params.id;
        const guest = await db_1.prisma.guest.findUnique({ where: { id: guestId } });
        if (!guest) {
            return res.status(404).json({ error: 'سجل المدعو غير موجود' });
        }
        const updated = await db_1.prisma.guest.update({
            where: { id: guestId },
            data: {
                fullName: fullName ? String(fullName).trim() : guest.fullName,
                relationship: relationship !== undefined ? relationship : guest.relationship,
                notes: notes !== undefined ? notes : guest.notes,
            },
        });
        await (0, auditService_1.logAudit)({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل تحديث بيانات المدعو' });
    }
});
// Delete Guest (Admin & Supervisor)
exports.guestsRouter.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN', 'SUPERVISOR']), async (req, res) => {
    try {
        const guestId = req.params.id;
        const guest = await db_1.prisma.guest.findUnique({
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
            await (0, allocationService_1.revertGuestCheckin)(guestId, req.user?.id, req.user?.fullName, req.user?.role, req.ip);
        }
        // Delete the guest permanently from the database
        await db_1.prisma.guest.delete({ where: { id: guestId } });
        await (0, auditService_1.logAudit)({
            action: 'GUEST_DELETED',
            entityType: 'GUEST',
            entityId: guestId,
            details: `حذف واستبعاد سجل المدعو [${guest.fullName}] - الرقم القومي [${(0, nationalIdValidator_1.maskNationalId)(guest.nationalId)}] ${guest.student ? `(طالب: ${guest.student.fullName})` : '(مستقل)'}`,
            userId: req.user?.id,
            userName: req.user?.fullName,
            userRole: req.user?.role,
            ipAddress: req.ip,
        });
        return res.json({
            success: true,
            message: `تم حذف واستبعاد سجل المدعو (${guest.fullName}) نهائياً من المنظومة بنجاح`,
        });
    }
    catch (error) {
        console.error('Delete guest error:', error);
        return res.status(500).json({ error: error.message || 'فشل حذف سجل المدعو' });
    }
});
