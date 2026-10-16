"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
exports.auditRouter = (0, express_1.Router)();
// List audit log entries
exports.auditRouter.get('/', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN', 'SUPERVISOR']), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 25));
        const skip = (page - 1) * limit;
        const action = req.query.action;
        const entityType = req.query.entityType;
        const where = {};
        if (action)
            where.action = action;
        if (entityType)
            where.entityType = entityType;
        const [total, logs] = await Promise.all([
            db_1.prisma.auditLog.count({ where }),
            db_1.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Audit log error:', error);
        return res.status(500).json({ error: 'فشل جلب سجل العمليات' });
    }
});
