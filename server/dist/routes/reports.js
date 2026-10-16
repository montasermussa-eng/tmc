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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const XLSX = __importStar(require("xlsx"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nationalIdValidator_1 = require("../services/nationalIdValidator");
exports.reportsRouter = (0, express_1.Router)();
// Dashboard Statistics (Calculated dynamically from live DB)
exports.reportsRouter.get('/dashboard', auth_1.authenticate, async (req, res) => {
    try {
        const [totalGuests, attendedGuests, totalStudents, buses] = await Promise.all([
            db_1.prisma.guest.count(),
            db_1.prisma.guest.count({ where: { hasAttended: true } }),
            db_1.prisma.student.count(),
            db_1.prisma.bus.findMany({
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
                }
                else {
                    fullAwaitingLeader++;
                }
            }
            else if (count > 0) {
                partialBuses++;
            }
            else {
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
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ error: 'فشل استخراج إحصائيات لوحة التحكم' });
    }
});
// Export Filtered Guests List as Excel (.xlsx)
exports.reportsRouter.get('/export/guests', auth_1.authenticate, async (req, res) => {
    try {
        const status = req.query.status; // 'ALL', 'ATTENDED', 'ABSENT'
        const busNumber = req.query.busNumber ? parseInt(req.query.busNumber, 10) : undefined;
        const where = {};
        if (status === 'ATTENDED')
            where.hasAttended = true;
        if (status === 'ABSENT')
            where.hasAttended = false;
        if (busNumber)
            where.bus = { busNumber };
        const guests = await db_1.prisma.guest.findMany({
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
            'الرقم القومي': isAuthorized ? g.nationalId : (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
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
    }
    catch (error) {
        console.error('Export guests error:', error);
        return res.status(500).json({ error: 'فشل تصدير كشف المدعوين' });
    }
});
// Export Single Bus Manifest as Excel (.xlsx)
exports.reportsRouter.get('/export/manifest/:busNumber', auth_1.authenticate, async (req, res) => {
    try {
        const busNumber = parseInt(req.params.busNumber, 10);
        const bus = await db_1.prisma.bus.findUnique({
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
        const passengerRows = bus.guests.map((g, idx) => ({
            'مسلسل': idx + 1,
            'رقم المقعد': g.seatNumber || idx + 1,
            'اسم المدعو رباعي': g.fullName,
            'الرقم القومي': isAuthorized ? g.nationalId : (0, nationalIdValidator_1.maskNationalId)(g.nationalId),
            'اسم الطالب': g.student?.fullName || (g.isIndependent ? 'غير مرتبط بطالب' : '-'),
            'الرقم العسكري للطالب': g.student?.militaryNumber || '-',
            'درجة القرابة': g.relationship || '-',
            'وقت تسجيل الدخول': g.checkedInAt ? g.checkedInAt.toLocaleTimeString('ar-EG') : '-',
        }));
        if (bus.leader) {
            passengerRows.unshift({
                'مسلسل': '★',
                'رقم المقعد': 'المقدمة',
                'اسم المدعو رباعي': `قائد الأتوبيس: ${bus.leader.rank} / ${bus.leader.fullName}`,
                'الرقم القومي': bus.leader.phone ? `هاتف: ${bus.leader.phone}` : '—',
                'اسم الطالب': 'المسؤول الأمني والإداري المعتمد',
                'الرقم العسكري للطالب': 'معتمد رسمياً',
                'درجة القرابة': 'قائد الأتوبيس',
                'وقت تسجيل الدخول': 'معتمد',
            });
        }
        const ws = XLSX.utils.json_to_sheet(passengerRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `أتوبيس_${busNumber}`);
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="TMC_Bus_${busNumber}_Manifest.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buf);
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل تصدير كشف الأتوبيس' });
    }
});
