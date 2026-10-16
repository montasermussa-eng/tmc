import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Bus,
  Users,
  UserCheck,
  UserX,
  FileSpreadsheet,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { apiRequest } from '../api/client';

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('all-guests');
  const [selectedBus, setSelectedBus] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  const reportCards = [
    {
      id: 'all-guests',
      title: 'كشف جميع المدعوين المسجلين',
      description: 'تصدير شامل لجميع السجلات مع أرقام الهوية، بيانات الطلبة، وحالة الحضور والتسكين',
      icon: Users,
      color: 'border-tmc-navy text-tmc-navy',
      exportAction: () => downloadExcel('/reports/export/guests', 'كشف_جميع_المدعوين'),
    },
    {
      id: 'attended-guests',
      title: 'كشف المدعوين الحاضرين فقط',
      description: 'حصر بجميع الضيوف الذين تم تسجيل دخولهم وتسكينهم في الأتوبيسات وتوقيت الحضور',
      icon: UserCheck,
      color: 'border-emerald-600 text-emerald-700',
      exportAction: () => downloadExcel('/reports/export/guests?status=ATTENDED', 'كشف_المدعوين_الحاضرين'),
    },
    {
      id: 'absent-guests',
      title: 'كشف المدعوين الذين لم يحضروا',
      description: 'قائمة بالمدعوين المتغيبين أو الذين لم يصلوا بعد إلى بوابة الدخول',
      icon: UserX,
      color: 'border-slate-500 text-slate-700',
      exportAction: () => downloadExcel('/reports/export/guests?status=ABSENT', 'كشف_المدعوين_غير_الحاضرين'),
    },
    {
      id: 'single-bus-manifest',
      title: 'كشف ركاب أتوبيس محدد (Excel)',
      description: 'تصدير بيان ركاب أتوبيس معين وقائد الأتوبيس المعتمد مع أرقام المقاعد',
      icon: Bus,
      color: 'border-amber-600 text-amber-700',
      hasBusPicker: true,
      exportAction: () => downloadExcel(`/reports/export/manifest/${selectedBus}`, `كشف_أتوبيس_${selectedBus}`),
    },
  ];

  const downloadExcel = async (endpoint: string, filenamePrefix: string) => {
    setIsExporting(true);
    try {
      const blob = await apiRequest<Blob>(endpoint);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('فشل تصدير التقرير');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
          <span>التقارير الإدارية والتصدير الرسمي</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">
            تقارير موثقة
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          استخراج وتصدير الكشوفات الميدانية الرسمية بصيغ Microsoft Excel جاهزة للطباعة والاعتماد
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="bg-white border-2 border-slate-200 hover:border-tmc-navy-500 rounded-xl p-6 shadow-sm flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl bg-slate-50 border ${r.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    تقرير رسمي
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-tmc-navy transition">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {r.description}
                </p>

                {r.hasBusPicker && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700">اختر رقم الأتوبيس:</label>
                    <select
                      value={selectedBus}
                      onChange={(e) => setSelectedBus(parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {Array.from({ length: 27 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          أتوبيس رقم {n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={r.exportAction}
                  disabled={isExporting}
                  className="w-full py-2.5 px-4 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-tmc-gold" />
                  <span>{isExporting ? 'جاري تجهيز الملف...' : 'تصدير التقرير إلى إكسيل (.xlsx)'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
