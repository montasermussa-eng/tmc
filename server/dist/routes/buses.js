"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.busesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nationalIdValidator_1 = require("../services/nationalIdValidator");
const auditService_1 = require("../services/auditService");
exports.busesRouter = (0, express_1.Router)();
// Overview of all 27 buses with status, occupancy, and leader
exports.busesRouter.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const buses = await db_1.prisma.bus.findMany({
            orderBy: { busNumber: 'asc' },
            include: {
                leader: true,
                _count: {
                    select: { guests: true },
                },
            },
        });
        const summary = buses.map((b) => {
            const assignedGuests = b._count.guests;
            const remainingSeats = Math.max(0, b.capacity - assignedGuests);
            const occupancyRate = Math.round((assignedGuests / b.capacity) * 100);
            const hasLeader = !!b.leader;
            const isFull = assignedGuests >= b.capacity;
            const isAwaitingLeader = isFull && !hasLeader;
            const isCompleted = isFull && hasLeader;
            return {
                id: b.id,
                busNumber: b.busNumber,
                capacity: b.capacity,
                assignedGuests,
                remainingSeats,
                occupancyRate,
                status: b.status,
                hasLeader,
                isAwaitingLeader,
                isCompleted,
                leader: b.leader
                    ? {
                        id: b.leader.id,
                        rank: b.leader.rank,
                        fullName: b.leader.fullName,
                        phone: b.leader.phone,
                    }
                    : null,
            };
        });
        return res.json({ buses: summary });
    }
    catch (error) {
        console.error('List buses error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الأتوبيسات' });
    }
});
// Bus Details and Passenger Manifest
exports.busesRouter.get('/:busNumber', auth_1.authenticate, async (req, res) => {
    try {
        const busNumber = parseInt(req.params.busNumber, 10);
        if (isNaN(busNumber) || busNumber < 1 || busNumber > 27) {
            return res.status(400).json({ error: 'رقم الأتوبيس يجب أن يكون بين 1 و 27' });
        }
        const bus = await db_1.prisma.bus.findUnique({
            where: { busNumber },
            include: {
                leader: true,
                guests: {
                    orderBy: { seatNumber: 'asc' },
                    include: {
                        student: true,
                    },
                },
            },
        });
        if (!bus) {
            return res.status(404).json({ error: 'سجل الأتوبيس غير موجود' });
        }
        const isAuthorized = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';
        const manifest = bus.guests.map((g, idx) => ({
            sequence: idx + 1,
            seatNumber: g.seatNumber || idx + 1,
            guestId: g.id,
            fullName: g.fullName,
            nationalId: isAuthorized ? g.nationalId : (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            nationalIdMasked: (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            nationalIdFull: isAuthorized ? g.nationalId : undefined,
            relationship: g.relationship || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
            studentName: g.student?.fullName || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
            studentMilitaryNumber: g.student?.militaryNumber || (g.isIndependent ? '-' : '-'),
            checkedInAt: g.checkedInAt,
            checkedInBy: g.checkedInBy,
        }));
        const assignedGuests = bus.guests.length;
        const remainingSeats = Math.max(0, bus.capacity - assignedGuests);
        const hasLeader = !!bus.leader;
        const isFull = assignedGuests >= bus.capacity;
        const totalManifestCount = assignedGuests + (hasLeader ? 1 : 0);
        return res.json({
            bus: {
                id: bus.id,
                busNumber: bus.busNumber,
                capacity: bus.capacity,
                assignedGuests,
                remainingSeats,
                occupancyRate: Math.round((assignedGuests / bus.capacity) * 100),
                status: bus.status,
                hasLeader,
                isFull,
                isAwaitingLeader: isFull && !hasLeader,
                isCompleted: isFull && hasLeader,
                totalManifestCount,
                leader: bus.leader,
                manifest,
            },
        });
    }
    catch (error) {
        console.error('Bus details error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الأتوبيس' });
    }
});
// Register or Update Bus Leader
exports.busesRouter.post('/:busNumber/leader', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN', 'SUPERVISOR']), async (req, res) => {
    try {
        const busNumber = parseInt(req.params.busNumber, 10);
        const { rank, fullName, phone } = req.body;
        if (!rank || !fullName) {
            return res.status(400).json({ error: 'رتبة قائد الأتوبيس واسمه الكامل كلاهما مطلوب' });
        }
        const bus = await db_1.prisma.bus.findUnique({
            where: { busNumber },
            include: { leader: true },
        });
        if (!bus) {
            return res.status(404).json({ error: 'سجل الأتوبيس غير موجود' });
        }
        // Verify rank is in approved military ranks
        const approvedRank = await db_1.prisma.militaryRank.findUnique({
            where: { name: rank.trim() },
        });
        if (!approvedRank) {
            return res.status(400).json({ error: 'الرتبة العسكرية المختارة غير معتمدة في النظام' });
        }
        const isUpdate = !!bus.leader;
        const leader = await db_1.prisma.busLeader.upsert({
            where: { busId: bus.id },
            update: {
                rank: rank.trim(),
                fullName: fullName.trim(),
                phone: phone ? phone.trim() : null,
                assignedBy: req.user?.fullName,
            },
            create: {
                busId: bus.id,
                rank: rank.trim(),
                fullName: fullName.trim(),
                phone: phone ? phone.trim() : null,
                assignedBy: req.user?.fullName,
            },
        });
        await (0, auditService_1.logAudit)({
            action: isUpdate ? 'BUS_LEADER_UPDATED' : 'BUS_LEADER_ASSIGNED',
            entityType: 'BUS',
            entityId: String(bus.busNumber),
            details: `${isUpdate ? 'تعديل بيانات' : 'تسجيل'} قائد الأتوبيس رقم [${bus.busNumber}]: [${leader.rank} / ${leader.fullName}]`,
            userId: req.user?.id,
            userName: req.user?.fullName,
            userRole: req.user?.role,
            ipAddress: req.ip,
        });
        return res.json({
            success: true,
            message: `تم تسجيل قائد الأتوبيس رقم [${bus.busNumber}] بنجاح`,
            leader,
        });
    }
    catch (error) {
        console.error('Bus leader error:', error);
        return res.status(500).json({ error: 'فشل تسجيل قائد الأتوبيس' });
    }
});
// Update Bus Status (Admin only)
exports.busesRouter.patch('/:busNumber/status', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const busNumber = parseInt(req.params.busNumber, 10);
        const { status, closedReason } = req.body;
        if (!['AVAILABLE', 'IN_PROGRESS', 'FULL', 'CLOSED'].includes(status)) {
            return res.status(400).json({ error: 'حالة الأتوبيس غير صالحة' });
        }
        const bus = await db_1.prisma.bus.update({
            where: { busNumber },
            data: {
                status,
                closedReason: status === 'CLOSED' ? closedReason : null,
            },
        });
        await (0, auditService_1.logAudit)({
            action: 'BUS_STATUS_CHANGED',
            entityType: 'BUS',
            entityId: String(busNumber),
            details: `تغيير حالة الأتوبيس رقم [${busNumber}] إلى [${status}]`,
            userId: req.user?.id,
            userName: req.user?.fullName,
            userRole: req.user?.role,
            ipAddress: req.ip,
        });
        return res.json({ success: true, bus });
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل تعديل حالة الأتوبيس' });
    }
});
