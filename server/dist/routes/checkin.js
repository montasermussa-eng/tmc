"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkinRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nationalIdValidator_1 = require("../services/nationalIdValidator");
const allocationService_1 = require("../services/allocationService");
exports.checkinRouter = (0, express_1.Router)();
// Fast Gate Search by Last 7 Digits of National ID
exports.checkinRouter.get('/search', auth_1.authenticate, async (req, res) => {
    try {
        const rawSuffix = req.query.suffix;
        if (!rawSuffix) {
            return res.status(400).json({ error: 'يرجى إدخال آخر ٧ أرقام من الرقم القومي' });
        }
        const normalized = (0, nationalIdValidator_1.normalizeNumerals)(rawSuffix);
        if (normalized.length !== 7) {
            return res.status(400).json({
                error: `يجب إدخال ٧ أرقام بالضبط (المُدخل حالياً: ${normalized.length} رقم)`,
            });
        }
        // Search guests matching the 7-digit suffix
        const matchingGuests = await db_1.prisma.guest.findMany({
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
            nationalId: isAuthorizedForFullId ? g.nationalId : (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            nationalIdMasked: (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
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
    }
    catch (error) {
        console.error('Checkin search error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء البحث عن المدعو' });
    }
});
// Execute Check-in and Concurrency-Safe Bus Allocation
exports.checkinRouter.post('/execute', auth_1.authenticate, async (req, res) => {
    try {
        const { guestId } = req.body;
        if (!guestId) {
            return res.status(400).json({ error: 'معرف المدعو مطلوب لتسجيل الدخول' });
        }
        const result = await (0, allocationService_1.checkinAndAllocateGuest)(guestId, req.user?.id, req.user?.fullName, req.ip);
        return res.json(result);
    }
    catch (error) {
        console.error('Checkin execute error:', error);
        return res.status(400).json({
            error: error.message || 'فشل تسجيل دخول المدعو',
        });
    }
});
