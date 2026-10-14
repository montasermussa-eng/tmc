import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { parseAndValidateExcel, commitImportBatch } from '../services/importService';

export const importRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// Excel Preview Endpoint
importRouter.post(
  '/preview',
  authenticate,
  requireRole(['ADMIN']),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'يرجى اختيار ملف إكسيل (.xlsx أو .xls) لرفعه' });
      }

      const result = await parseAndValidateExcel(req.file.buffer, req.file.originalname);
      return res.json(result);
    } catch (error: any) {
      console.error('Import preview error:', error);
      return res.status(400).json({ error: error.message || 'فشل معالجة ملف الإكسيل' });
    }
  }
);

// Excel Commit Endpoint
importRouter.post(
  '/commit',
  authenticate,
  requireRole(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rows, filename } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'لا توجد بيانات صالحة للإدراج في قاعدة البيانات' });
      }

      const result = await commitImportBatch(
        rows,
        filename || 'import.xlsx',
        req.user?.id,
        req.user?.fullName,
        req.ip
      );

      return res.json({
        success: true,
        message: `تم استيراد ${result.insertedGuests} مدعو بنجاح لعدد ${result.insertedStudents} طالب`,
        ...result,
      });
    } catch (error: any) {
      console.error('Import commit error:', error);
      return res.status(400).json({ error: error.message || 'فشل حفظ سجلات الاستيراد في قاعدة البيانات' });
    }
  }
);

// Download Excel Template with Exact Required Columns
importRouter.get('/template', (req, res) => {
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
importRouter.get('/batches', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ batches });
  } catch (error: any) {
    return res.status(500).json({ error: 'فشل جلب سجل عمليات الاستيراد' });
  }
});
