import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { checkinRouter } from './routes/checkin';
import { guestsRouter } from './routes/guests';
import { studentsRouter } from './routes/students';
import { busesRouter } from './routes/buses';
import { importRouter } from './routes/import';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { auditRouter } from './routes/audit';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static Assets: Serve official college logo directly
app.get('/logo.jpg', (req, res) => {
  const logoPath = path.resolve(__dirname, '../logo.jpg');
  res.sendFile(logoPath);
});

app.get('/api/assets/logo.jpg', (req, res) => {
  const logoPath = path.resolve(__dirname, '../logo.jpg');
  res.sendFile(logoPath);
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/buses', busesRouter);
app.use('/api/import', importRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit', auditRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    institution: 'الكلية العسكرية التكنولوجية',
    system: 'منظومة تسجيل حضور الضيوف وتسكين الأتوبيسات',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static build if directory exists
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If client not yet built, return informative status
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>الكلية العسكرية التكنولوجية</title>
          <style>body{font-family:sans-serif;text-align:center;padding:50px;background:#0F1E36;color:white;}</style>
        </head>
        <body>
          <h1>الكلية العسكرية التكنولوجية</h1>
          <h2>منظومة تسجيل حضور ضيوف حفل التخرج وإدارة الأتوبيسات</h2>
          <p>الواجهة الخلفية (Backend API) قيد التشغيل بنجاح على المنفذ ${PORT}.</p>
        </body>
        </html>
      `);
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  الكلية العسكرية التكنولوجية - منظومة حفل التخرج`);
    console.log(`  الخادم يعمل بنجاح على: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}
