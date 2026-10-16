"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nationalIdValidator_1 = require("../services/nationalIdValidator");
exports.studentsRouter = (0, express_1.Router)();
// List students with guest attendance and allocation metrics
exports.studentsRouter.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const where = {};
        if (search) {
            const normalizedSearch = (0, nationalIdValidator_1.normalizeNumerals)(search);
            where.OR = [
                { fullName: { contains: search } },
                { militaryNumber: { contains: normalizedSearch || search } },
            ];
        }
        const [total, students] = await Promise.all([
            db_1.prisma.student.count({ where }),
            db_1.prisma.student.findMany({
                where,
                skip,
                take: limit,
                orderBy: { militaryNumber: 'asc' },
                include: {
                    guests: {
                        include: {
                            bus: true,
                        },
                    },
                },
            }),
        ]);
        const formattedStudents = students.map((s) => {
            const totalGuests = s.guests.length;
            const attendedGuests = s.guests.filter((g) => g.hasAttended).length;
            const absentGuests = totalGuests - attendedGuests;
            const allocatedBuses = Array.from(new Set(s.guests.filter((g) => g.bus?.busNumber).map((g) => g.bus.busNumber)));
            return {
                id: s.id,
                militaryNumber: s.militaryNumber,
                fullName: s.fullName,
                totalGuests,
                attendedGuests,
                absentGuests,
                allocatedBuses,
            };
        });
        return res.json({
            students: formattedStudents,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('List students error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الطلبة' });
    }
});
// Quick Lookup by Military Number (for gate addition or search)
exports.studentsRouter.get('/lookup/:militaryNumber', auth_1.authenticate, async (req, res) => {
    try {
        const normalizedMil = (0, nationalIdValidator_1.normalizeNumerals)(req.params.militaryNumber);
        const student = await db_1.prisma.student.findUnique({
            where: { militaryNumber: normalizedMil },
            include: {
                guests: {
                    select: {
                        id: true,
                        fullName: true,
                        relationship: true,
                        hasAttended: true,
                    },
                },
            },
        });
        if (!student) {
            return res.json({ found: false, message: 'الطالب غير مسجل في المنظومة' });
        }
        return res.json({
            found: true,
            student: {
                id: student.id,
                militaryNumber: student.militaryNumber,
                fullName: student.fullName,
                guestsCount: student.guests.length,
                guests: student.guests,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء الاستعلام عن الطالب' });
    }
});
// Student Profile with Associated Guests
exports.studentsRouter.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);
        if (isNaN(studentId)) {
            return res.status(400).json({ error: 'معرف الطالب غير صالح' });
        }
        const student = await db_1.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                guests: {
                    include: {
                        bus: true,
                    },
                    orderBy: [{ hasAttended: 'desc' }, { checkedInAt: 'desc' }],
                },
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'ملف الطالب غير موجود' });
        }
        const isAuthorized = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERVISOR';
        const formattedGuests = student.guests.map((g) => ({
            id: g.id,
            fullName: g.fullName,
            nationalId: isAuthorized ? g.nationalId : (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            nationalIdMasked: (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            nationalIdFull: isAuthorized ? g.nationalId : undefined,
            relationship: g.relationship,
            hasAttended: g.hasAttended,
            checkedInAt: g.checkedInAt,
            busNumber: g.bus?.busNumber || null,
            seatNumber: g.seatNumber || null,
        }));
        const totalGuests = student.guests.length;
        const attendedGuests = student.guests.filter((g) => g.hasAttended).length;
        const absentGuests = totalGuests - attendedGuests;
        return res.json({
            student: {
                id: student.id,
                militaryNumber: student.militaryNumber,
                fullName: student.fullName,
                totalGuests,
                attendedGuests,
                absentGuests,
                guests: formattedGuests,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب ملف الطالب' });
    }
});
