"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const checkin_1 = require("./routes/checkin");
const guests_1 = require("./routes/guests");
const students_1 = require("./routes/students");
const buses_1 = require("./routes/buses");
const import_1 = require("./routes/import");
const reports_1 = require("./routes/reports");
const settings_1 = require("./routes/settings");
const audit_1 = require("./routes/audit");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Middlewares
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json({ limit: '20mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Static Assets: Serve official college logo directly
exports.app.get('/logo.jpg', (req, res) => {
    const logoPath = path_1.default.resolve(__dirname, '../logo.jpg');
    res.sendFile(logoPath);
});
exports.app.get('/api/assets/logo.jpg', (req, res) => {
    const logoPath = path_1.default.resolve(__dirname, '../logo.jpg');
    res.sendFile(logoPath);
});
// API Routes
exports.app.use('/api/auth', auth_1.authRouter);
exports.app.use('/api/checkin', checkin_1.checkinRouter);
exports.app.use('/api/guests', guests_1.guestsRouter);
exports.app.use('/api/students', students_1.studentsRouter);
exports.app.use('/api/buses', buses_1.busesRouter);
exports.app.use('/api/import', import_1.importRouter);
exports.app.use('/api/reports', reports_1.reportsRouter);
exports.app.use('/api/settings', settings_1.settingsRouter);
exports.app.use('/api/audit', audit_1.auditRouter);
// Health check endpoint
exports.app.get('/api/health', (req, res) => {
    res.json({
        status: 'ONLINE',
        institution: 'الكلية العسكرية التكنولوجية',
        system: 'منظومة تسجيل حضور الضيوف وتسكين الأتوبيسات',
        timestamp: new Date().toISOString(),
    });
});
// Serve frontend static build if directory exists
const publicDir = path_1.default.resolve(__dirname, '../public');
exports.app.use(express_1.default.static(publicDir));
// Fallback to index.html for SPA client-side routing
exports.app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    const indexPath = path_1.default.join(publicDir, 'index.html');
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
    exports.app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`  الكلية العسكرية التكنولوجية - منظومة حفل التخرج`);
        console.log(`  الخادم يعمل بنجاح على: http://localhost:${PORT}`);
        console.log(`=======================================================`);
    });
}
