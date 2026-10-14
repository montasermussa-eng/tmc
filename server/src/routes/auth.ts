import { Router, Response } from 'express';
import { OFFICIAL_USER, AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();

// Current User Profile - Always returns المقدم / أسامة الجمل
authRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: OFFICIAL_USER });
});

// Login (optional fallback, returns OFFICIAL_USER)
authRouter.post('/login', (req, res: Response) => {
  return res.json({
    success: true,
    token: 'tmc-authenticated-session',
    user: OFFICIAL_USER,
  });
});
