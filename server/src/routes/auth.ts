import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { generateToken, authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const authRouter = Router();

// Login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const user = await prisma.user.findUnique({
      where: { username: String(username).trim() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      militaryNumber: user.militaryNumber || undefined,
    });

    await logAudit({
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: `تسجيل دخول ناجح للمستخدم [${user.fullName}] بدور [${user.role}]`,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        militaryNumber: user.militaryNumber,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// Current User Profile
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        militaryNumber: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات المستخدم' });
  }
});

// List users (Admin only)
authRouter.get('/users', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        militaryNumber: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ users });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل جلب قائمة المستخدمين' });
  }
});

// Create user (Admin only)
authRouter.post('/users', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, fullName, role, militaryNumber } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        fullName: fullName.trim(),
        role,
        militaryNumber: militaryNumber ? militaryNumber.trim() : null,
      },
    });

    await logAudit({
      action: 'USER_CREATED',
      entityType: 'AUTH',
      entityId: user.id,
      details: `إنشاء حساب مستخدم جديد [${user.username} - ${user.fullName}] بدور [${user.role}]`,
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      ipAddress: req.ip,
    });

    return res.json({ success: true, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل إنشاء المستخدم' });
  }
});
