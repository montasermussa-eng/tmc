import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const settingsRouter = Router();

// Get all system settings, approved ranks, and relationship types
settingsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [ranks, relationships, settings] = await Promise.all([
      prisma.militaryRank.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.relationshipType.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.systemSetting.findMany(),
    ]);

    return res.json({
      ranks,
      relationships,
      settings: settings.reduce((acc: any, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {}),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل جلب إعدادات المنظومة' });
  }
});

// Add Military Rank (Admin only)
settingsRouter.post('/ranks', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, order } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم الرتبة العسكرية مطلوب' });
    }

    const rank = await prisma.militaryRank.create({
      data: {
        name: name.trim(),
        order: order ? parseInt(order, 10) : 99,
      },
    });

    await logAudit({
      action: 'SETTING_CHANGED',
      entityType: 'SETTINGS',
      details: `إضافة رتبة عسكرية جديدة [${rank.name}]`,
      userId: req.user?.id,
      userName: req.user?.fullName,
      userRole: req.user?.role,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, rank });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل إضافة الرتبة العسكرية (قد تكون مسجلة مسبقاً)' });
  }
});

// Add Relationship Type (Admin only)
settingsRouter.post('/relationships', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, order } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم درجة القرابة مطلوب' });
    }

    const rel = await prisma.relationshipType.create({
      data: {
        name: name.trim(),
        order: order ? parseInt(order, 10) : 99,
      },
    });

    await logAudit({
      action: 'SETTING_CHANGED',
      entityType: 'SETTINGS',
      details: `إضافة درجة قرابة جديدة [${rel.name}]`,
      userId: req.user?.id,
      userName: req.user?.fullName,
      userRole: req.user?.role,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, relationship: rel });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل إضافة درجة القرابة' });
  }
});
