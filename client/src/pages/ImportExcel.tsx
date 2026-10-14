import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { apiRequest } from '../api/client';

interface ParsedRow {
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

interface ImportPreviewResult {
  filename: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  studentsCount: number;
  previewRows: ParsedRow[];
  errorRows: ParsedRow[];
}

export const ImportExcel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    message: string;
    insertedGuests: number;
    insertedStudents: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewData(null);
      setCommitResult(null);
      setErrorMessage('');
      processPreview(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewData(null);
      setCommitResult(null);
      setErrorMessage('');
      processPreview(file);
    }
  };

  const processPreview = async (file: File) => {
    setIsPreviewing(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest<ImportPreviewResult>('/import/preview', {
        method: 'POST',
        body: formData,
      });

      setPreviewData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل فحص ومعالجة ملف الإكسيل');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.previewRows.length === 0) return;

    setIsCommitting(true);
    setErrorMessage('');

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        insertedGuests: number;
        insertedStudents: number;
      }>('/import/commit', {
        method: 'POST',
        body: JSON.stringify({
          rows: previewData.previewRows,
          filename: previewData.filename,
        }),
      });

      setCommitResult(res);
      setPreviewData(null);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إدراج وحفظ البيانات في قاعدة البيانات');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/import/template';
  };

  const handleDownloadErrorReport = () => {
    if (!previewData || previewData.errorRows.length === 0) return;

    const exportRows = previewData.errorRows.map((r) => ({
      'رقم الصف': r.rowNumber,
      'الرقم العسكري': r.militaryNumber,
      'اسم الطالب': r.studentName,
      'اسم المدعو رباعي': r.guestName,
      'درجة القرابة': r.relationship,
      'الرقم القومي': r.nationalId,
      'أسباب الخطأ': r.errors.join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأخطاء');
    XLSX.writeFile(wb, `تقرير_أخطاء_الاستيراد_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Title & Template Download Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
            <span>استيراد كشوف المدعوين من الإكسيل</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">
              .xlsx / .xls
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            فحص الأعمدة الخمسة، كشف التكرار والأرقام القومية الخاطئة، والاعتماد الآمن
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg shadow-sm transition"
        >
          <Download className="w-4 h-4 text-tmc-navy" />
          <span>تحميل نموذج الإكسيل المعتمد</span>
        </button>
      </div>

      {commitResult && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 text-emerald-950 flex items-start gap-4 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-emerald-950">
              اكتمل الاستيراد بنجاح!
            </h3>
            <p className="text-sm text-emerald-800 mt-1">
              تم إدراج {commitResult.insertedGuests} مدعو وحفظ علاقتهم بعدد {commitResult.insertedStudents} طالب خريج بنجاح في قاعدة البيانات.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="bg-white border-2 border-dashed border-slate-300 hover:border-tmc-navy-500 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition shadow-sm group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-tmc-navy-50 text-tmc-navy mx-auto flex items-center justify-center transition">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-900 mt-4">
          اضغط لاختيار ملف الإكسيل أو اسحب الملف وأفلته هنا
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          يدعم ملفات بصيغة Microsoft Excel (.xlsx, .xls) بحد أقصى 10 ميجابايت
        </p>

        {/* Expected columns pill indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold ml-2">الأعمدة المعتمدة:</span>
          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-200">
            الرقم العسكري
          </span>
          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-200">
            اسم الطالب
          </span>
          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-200">
            اسم المدعو رباعي
          </span>
          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-200">
            درجة القرابة
          </span>
          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-200">
            الرقم القومي
          </span>
        </div>
      </div>

      {/* Loading state during preview */}
      {isPreviewing && (
        <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-tmc-navy" />
          <span className="text-sm font-semibold">جاري فحص ومراجعة ملف الإكسيل والتحقق من الأرقام القومية...</span>
        </div>
      )}

      {/* Preview Section & Validation Report */}
      {previewData && (
        <div className="space-y-6">
          {/* Summary Report Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <span className="text-xs text-slate-500 block">إجمالي الصفوف بالملف</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {previewData.totalRows}
              </span>
            </div>

            <div className="bg-white border border-emerald-300 rounded-xl p-4 shadow-sm text-center bg-emerald-50/20">
              <span className="text-xs text-emerald-800 font-bold block">السجلات المقبولة والصالحة</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {previewData.validCount}
              </span>
            </div>

            <div className="bg-white border border-red-300 rounded-xl p-4 shadow-sm text-center bg-red-50/20">
              <span className="text-xs text-red-800 font-bold block">السجلات المرفوضة</span>
              <span className="text-2xl font-black text-red-600 mt-1 block">
                {previewData.invalidCount}
              </span>
            </div>

            <div className="bg-white border border-amber-300 rounded-xl p-4 shadow-sm text-center bg-amber-50/20">
              <span className="text-xs text-amber-800 font-bold block">الأرقام المكررة</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">
                {previewData.duplicateCount}
              </span>
            </div>
          </div>

          {/* Action Bar for Commit / Download Errors */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                تقرير فحص ملف: [{previewData.filename}]
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                يتضمن {previewData.validCount} مدعو لعدد {previewData.studentsCount} طالب خريج جاهز للإدراج
              </p>
            </div>

            <div className="flex items-center gap-3">
              {previewData.errorRows.length > 0 && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل تقرير الأخطاء ({previewData.errorRows.length})</span>
                </button>
              )}

              <button
                onClick={handleCommit}
                disabled={isCommitting || previewData.validCount === 0}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isCommitting
                    ? 'جاري الاعتماد والحفظ...'
                    : `اعتماد وإدراج (${previewData.validCount}) سجل الآن`}
                </span>
              </button>
            </div>
          </div>

          {/* Preview Table of Valid Records */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
              <span>معاينة السجلات المقبولة (أول 10 سجلات)</span>
              <span className="text-emerald-700 font-semibold">جاهزة للحفظ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3 w-12 text-center">الصف</th>
                    <th className="py-2.5 px-3">الرقم العسكري</th>
                    <th className="py-2.5 px-3">اسم الطالب</th>
                    <th className="py-2.5 px-3">اسم المدعو رباعي</th>
                    <th className="py-2.5 px-3 text-center">القرابة</th>
                    <th className="py-2.5 px-3 font-mono">الرقم القومي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.previewRows.slice(0, 10).map((r) => (
                    <tr key={r.rowNumber} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {r.rowNumber}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-tmc-navy">
                        {r.militaryNumber}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {r.studentName}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r.guestName}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {r.relationship}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {r.nationalId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rejected Rows Table if any */}
          {previewData.errorRows.length > 0 && (
            <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-red-50 border-b border-red-200 font-bold text-xs text-red-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  السجلات المرفوضة التي لن يتم إدراجها ({previewData.errorRows.length})
                </span>
                <span className="text-[11px] text-red-700">
                  يرجى تصحيحها في الملف وإعادة الرفع
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-red-50/50 border-b border-red-100 text-red-900 font-bold">
                      <th className="py-2.5 px-3 w-12 text-center">الصف</th>
                      <th className="py-2.5 px-3">اسم المدعو</th>
                      <th className="py-2.5 px-3">الرقم القومي</th>
                      <th className="py-2.5 px-3">الطالب</th>
                      <th className="py-2.5 px-3 text-red-700">أسباب الخطأ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {previewData.errorRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-red-50/30">
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">
                          {r.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {r.guestName || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">
                          {r.nationalId || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {r.studentName || '—'} ({r.militaryNumber || '—'})
                        </td>
                        <td className="py-2 px-3 text-red-700 font-semibold">
                          {r.errors.join(' | ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
