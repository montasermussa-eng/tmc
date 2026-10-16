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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const importService_1 = require("../services/importService");
exports.importRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});
// Excel Preview Endpoint
exports.importRouter.post('/preview', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN']), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'يرجى اختيار ملف إكسيل (.xlsx أو .xls) لرفعه' });
        }
        const result = await (0, importService_1.parseAndValidateExcel)(req.file.buffer, req.file.originalname);
        return res.json(result);
    }
    catch (error) {
        console.error('Import preview error:', error);
        return res.status(400).json({ error: error.message || 'فشل معالجة ملف الإكسيل' });
    }
});
// Excel Commit Endpoint
exports.importRouter.post('/commit', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const { rows, filename } = req.body;
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'لا توجد بيانات صالحة للإدراج في قاعدة البيانات' });
        }
        const result = await (0, importService_1.commitImportBatch)(rows, filename || 'import.xlsx', req.user?.id, req.user?.fullName, req.ip);
        return res.json({
            success: true,
            message: `تم استيراد ${result.insertedGuests} مدعو بنجاح لعدد ${result.insertedStudents} طالب`,
            ...result,
        });
    }
    catch (error) {
        console.error('Import commit error:', error);
        return res.status(400).json({ error: error.message || 'فشل حفظ سجلات الاستيراد في قاعدة البيانات' });
    }
});
// Download Excel Template with Exact Required Columns
exports.importRouter.get('/template', (req, res) => {
    const templateData = [
        {
            'الرقم العسكري': '104520',
            'اسم الطالب': 'أحمد سعيد عبد الفتاح الجندي',
            'اسم المدعو رباعي': 'سعيد عبد الفتاح الجندي إبراهيم',
            'درجة القرابة': 'والد',
            'الرقم القومي': '26508150102431',
        },
        {
            'الرقم العسكري': '104520',
            'اسم الطالب': 'أحمد سعيد عبد الفتاح الجندي',
            'اسم المدعو رباعي': 'منى إبراهيم محمود سليمان',
            'درجة القرابة': 'والدة',
            'الرقم القومي': '27210200103528',
        },
        {
            'الرقم العسكري': '104521',
            'اسم الطالب': 'محمود هاني شريف البدري',
            'اسم المدعو رباعي': 'هاني شريف البدري عامر',
            'درجة القرابة': 'والد',
            'الرقم القومي': '26804111201853',
        },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المدعوون');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="TMC_Guest_Registry_Template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
});
// Import Batches History
exports.importRouter.get('/batches', auth_1.authenticate, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const batches = await db_1.prisma.importBatch.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return res.json({ batches });
    }
    catch (error) {
        return res.status(500).json({ error: 'فشل جلب سجل عمليات الاستيراد' });
    }
});
