import * as XLSX from 'xlsx';
import { prisma } from '../db';
import { validateEgyptianNationalId, extractLast7Digits, normalizeNumerals } from './nationalIdValidator';

export interface ParsedRow {
  rowNumber: number;
  militaryNumber: string;
  studentName: string;
  guestName: string;
  relationship: string;
  nationalId: string;
  nationalIdSuffix: string;
  isValid: boolean;
  errors: string[];
  isDuplicateInFile?: boolean;
  isDuplicateInDb?: boolean;
}

export interface ImportPreviewResult {
  filename: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  studentsCount: number;
  previewRows: ParsedRow[];
  errorRows: ParsedRow[];
}

/**
 * Normalizes Arabic header strings to handle variations in user-submitted spreadsheets
 */
function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/\s+/g, ' ');
}

export async function parseAndValidateExcel(
  fileBuffer: Buffer,
  filename: string
): Promise<ImportPreviewResult> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('ملف الإكسيل فارغ أو لا يحتوي على أي صفحات صالحة');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('لم يتم العثور على أي صفوف بيانات في ملف الإكسيل');
  }

  // Find column mapping dynamically
  const firstRow = rawData[0];
  const headers = Object.keys(firstRow);

  const colMap: {
    militaryNumber?: string;
    studentName?: string;
    guestName?: string;
    relationship?: string;
    nationalId?: string;
  } = {};

  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (norm.includes('عسكري') || norm.includes('رقم عسكري')) {
      colMap.militaryNumber = h;
    } else if (norm.includes('طالب') || norm.includes('اسم الطالب')) {
      colMap.studentName = h;
    } else if (norm.includes('مدعو') || norm.includes('ضيف') || norm.includes('اسم المدعو')) {
      colMap.guestName = h;
    } else if (norm.includes('قراب') || norm.includes('صلة') || norm.includes('درجه')) {
      colMap.relationship = h;
    } else if (norm.includes('قومي') || norm.includes('بطاقه') || norm.includes('رقم قومي')) {
      colMap.nationalId = h;
    }
  }

  // Validate that all 5 required columns are detected
  const missingCols: string[] = [];
  if (!colMap.militaryNumber) missingCols.push('الرقم العسكري');
  if (!colMap.studentName) missingCols.push('اسم الطالب');
  if (!colMap.guestName) missingCols.push('اسم المدعو رباعي');
  if (!colMap.relationship) missingCols.push('درجة القرابة');
  if (!colMap.nationalId) missingCols.push('الرقم القومي');

  if (missingCols.length > 0) {
    throw new Error(
      `الأعمدة التالية مفقودة أو غير مطابقة في ملف الإكسيل: [${missingCols.join('، ')}]. الأعمدة المتوقعة هي: (الرقم العسكري، اسم الطالب، اسم المدعو رباعي، درجة القرابة، الرقم القومي)`
    );
  }

  // Fetch all existing National IDs from database to detect duplicates in DB
  const existingGuests = await prisma.guest.findMany({
    select: { nationalId: true },
  });
  const dbNationalIdSet = new Set(existingGuests.map((g) => g.nationalId));

  const seenInFileSet = new Set<string>();
  const uniqueStudents = new Set<string>();

  const previewRows: ParsedRow[] = [];
  const errorRows: ParsedRow[] = [];

  let rowNum = 1; // 1-indexed (row 1 is usually header in Excel, so rowNum 2 is first data row)
  for (const row of rawData) {
    rowNum++;
    const militaryNumRaw = String(row[colMap.militaryNumber!] || '').trim();
    const studentNameRaw = String(row[colMap.studentName!] || '').trim();
    const guestNameRaw = String(row[colMap.guestName!] || '').trim();
    const relationshipRaw = String(row[colMap.relationship!] || '').trim();
    const nationalIdRaw = String(row[colMap.nationalId!] || '').trim();

    const normalizedNationalId = normalizeNumerals(nationalIdRaw);
    const normalizedMilitary = normalizeNumerals(militaryNumRaw);

    const errors: string[] = [];

    if (!normalizedMilitary) {
      errors.push('الرقم العسكري للطالب مطلوب');
    }

    if (!studentNameRaw) {
      errors.push('اسم الطالب مطلوب');
    }

    if (!guestNameRaw) {
      errors.push('اسم المدعو رباعي مطلوب');
    } else {
      const parts = guestNameRaw.split(/\s+/).filter(Boolean);
      if (parts.length < 2) {
        errors.push('يُفضل كتابة اسم المدعو ثنائياً على الأقل أو رباعياً');
      }
    }

    if (!relationshipRaw) {
      errors.push('درجة القرابة مطلوبة');
    }

    let isDuplicateInFile = false;
    let isDuplicateInDb = false;

    if (!normalizedNationalId) {
      errors.push('الرقم القومي للمدعو مطلوب');
    } else {
      const idValidation = validateEgyptianNationalId(normalizedNationalId);
      if (!idValidation.isValid) {
        errors.push(idValidation.error || 'الرقم القومي غير صالح');
      } else {
        // Check duplicate within file
        if (seenInFileSet.has(normalizedNationalId)) {
          isDuplicateInFile = true;
          errors.push('الرقم القومي مكرر أكثر من مرة داخل هذا الملف');
        } else {
          seenInFileSet.add(normalizedNationalId);
        }

        // Check duplicate in database
        if (dbNationalIdSet.has(normalizedNationalId)) {
          isDuplicateInDb = true;
          errors.push('الرقم القومي مسجل بالفعل مسبقاً في قاعدة بيانات المنظومة');
        }
      }
    }

    const isValid = errors.length === 0;

    const parsedRow: ParsedRow = {
      rowNumber: rowNum,
      militaryNumber: normalizedMilitary || militaryNumRaw,
      studentName: studentNameRaw,
      guestName: guestNameRaw,
      relationship: relationshipRaw,
      nationalId: normalizedNationalId,
      nationalIdSuffix: extractLast7Digits(normalizedNationalId),
      isValid,
      errors,
      isDuplicateInFile,
      isDuplicateInDb,
    };

    if (isValid) {
      previewRows.push(parsedRow);
      uniqueStudents.add(normalizedMilitary);
    } else {
      errorRows.push(parsedRow);
    }
  }

  return {
    filename,
    totalRows: rawData.length,
    validCount: previewRows.length,
    invalidCount: errorRows.length,
    duplicateCount: errorRows.filter((r) => r.isDuplicateInFile || r.isDuplicateInDb).length,
    studentsCount: uniqueStudents.size,
    previewRows,
    errorRows,
  };
}

export async function commitImportBatch(
  rows: ParsedRow[],
  filename: string,
  userId?: string,
  userName?: string,
  ipAddress?: string
) {
  if (rows.length === 0) {
    throw new Error('لا توجد سجلات صالحة للإدراج');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Group rows by student military number
    const studentMap = new Map<string, { studentName: string; guests: ParsedRow[] }>();

    for (const r of rows) {
      if (!studentMap.has(r.militaryNumber)) {
        studentMap.set(r.militaryNumber, {
          studentName: r.studentName,
          guests: [],
        });
      }
      studentMap.get(r.militaryNumber)!.guests.push(r);
    }

    // 2. Create or update Students
    const studentDbMap = new Map<string, number>(); // militaryNumber -> studentId
    for (const [milNum, data] of studentMap.entries()) {
      const student = await tx.student.upsert({
        where: { militaryNumber: milNum },
        update: { fullName: data.studentName },
        create: {
          militaryNumber: milNum,
          fullName: data.studentName,
        },
      });
      studentDbMap.set(milNum, student.id);
    }

    // 3. Create Import Batch record
    const batch = await tx.importBatch.create({
      data: {
        filename,
        totalRows: rows.length,
        acceptedRows: rows.length,
        rejectedRows: 0,
        duplicatesCount: 0,
        errorsJson: '[]',
        importedBy: userName || userId || 'مدير المنظومة',
      },
    });

    // 4. Insert guests associated with their student
    let insertedGuestsCount = 0;
    for (const [milNum, data] of studentMap.entries()) {
      const studentId = studentDbMap.get(milNum);
      for (const g of data.guests) {
        await tx.guest.create({
          data: {
            fullName: g.guestName,
            nationalId: g.nationalId,
            nationalIdSuffix: g.nationalIdSuffix,
            studentId,
            relationship: g.relationship,
            hasAttended: false,
            importBatchId: batch.id,
          },
        });
        insertedGuestsCount++;
      }
    }

    // 5. Create Audit Log
    await tx.auditLog.create({
      data: {
        action: 'EXCEL_IMPORT',
        entityType: 'IMPORT',
        entityId: batch.id,
        details: `استيراد ملف إكسيل [${filename}] بنجاح — إدراج ${insertedGuestsCount} مدعو لعدد ${studentMap.size} طالب`,
        userId,
        userName: userName || 'مدير المنظومة',
        userRole: 'ADMIN',
        ipAddress: ipAddress || '127.0.0.1',
      },
    });

    return {
      batchId: batch.id,
      insertedGuests: insertedGuestsCount,
      insertedStudents: studentMap.size,
    };
  });
}
