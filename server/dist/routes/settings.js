"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
exports.settingsRouter = (0, express_1.Router)();
// Get all system settings, approved ranks, and relationship types
exports.settingsRouter.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const [ranks, relationships, settings] = await Promise.all([
            db_1.prisma.militaryRank.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
            db_1.prisma.relationshipType.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
            db_1.prisma.systemSetting.findMany(),
        ]);
        return res.json({
            ranks,
            relationships,
            settings: settings.reduce((acc, s) => {
                acc[s.key] = s.value;
                return acc;
            }, {}),
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل جلب إعدادات المنظومة' });
    }
});
// Add Military Rank (Admin only)
exports.settingsRouter.post('/ranks', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const { name, order } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'اسم الرتبة العسكرية مطلوب' });
        }
        const rank = await db_1.prisma.militaryRank.create({
            data: {
                name: name.trim(),
                order: order ? parseInt(order, 10) : 99,
            },
        });
        await (0, auditService_1.logAudit)({
            action: 'SETTING_CHANGED',
            entityType: 'SETTINGS',
            details: `إضافة رتبة عسكرية جديدة [${rank.name}]`,
            userId: req.user?.id,
            userName: req.user?.fullName,
            userRole: req.user?.role,
            ipAddress: req.ip,
        });
        return res.status(201).json({ success: true, rank });
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل إضافة الرتبة العسكرية (قد تكون مسجلة مسبقاً)' });
    }
});
// Add Relationship Type (Admin only)
exports.settingsRouter.post('/relationships', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const { name, order } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'اسم درجة القرابة مطلوب' });
        }
        const rel = await db_1.prisma.relationshipType.create({
            data: {
                name: name.trim(),
                order: order ? parseInt(order, 10) : 99,
            },
        });
        await (0, auditService_1.logAudit)({
            action: 'SETTING_CHANGED',
            entityType: 'SETTINGS',
            details: `إضافة درجة قرابة جديدة [${rel.name}]`,
            userId: req.user?.id,
            userName: req.user?.fullName,
            userRole: req.user?.role,
            ipAddress: req.ip,
        });
        return res.status(201).json({ success: true, relationship: rel });
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل إضافة درجة القرابة' });
    }
});
