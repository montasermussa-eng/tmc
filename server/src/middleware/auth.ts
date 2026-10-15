import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tmc-military-tech-college-secret-key-2026';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  militaryNumber?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Single official system user: مقدم / أسامة الجمل
export const OFFICIAL_USER: AuthenticatedUser = {
  id: 'osama-elgamal',
  username: 'osama_elgamal',
  fullName: 'مقدم / أسامة الجمل',
  role: 'ADMIN',
  militaryNumber: 'M-10001',
};

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '365d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
      return next();
    } catch (err) {
      // fallback to official user
    }
  }

  // Default automatic authentication as المقدم / أسامة الجمل (No login needed)
  req.user = OFFICIAL_USER;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Single admin user has all permissions
    if (!req.user) {
      req.user = OFFICIAL_USER;
    }
    next();
  };
}
