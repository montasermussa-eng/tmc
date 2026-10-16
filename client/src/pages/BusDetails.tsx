import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Bus as BusIcon,
  Shield,
  ShieldAlert,
  UserCheck,
  Printer,
  FileSpreadsheet,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  UserPlus,
  Undo2,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { BusStatusBadge } from '../components/StatusBadge';
import { NationalIdMask } from '../components/NationalIdMask';
import { BusLeaderModal } from '../components/BusLeaderModal';
import { ManifestPrintView } from '../components/ManifestPrintView';

interface BusDetailsProps {
  busNumber: number;
  onBack: () => void;
}

interface ManifestPassenger {
  sequence: number;
  seatNumber: number;
  guestId: string;
  fullName: string;
  nationalId: string;
  nationalIdMasked: string;
  nationalIdFull?: string;
  relationship: string;
  studentName: string;
  studentMilitaryNumber: string;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
}

interface BusDetailsData {
  id: number;
  busNumber: number;
  capacity: number;
  assignedGuests: number;
  remainingSeats: number;
  occupancyRate: number;
  status: string;
  hasLeader: boolean;
  isFull: boolean;
  isAwaitingLeader: boolean;
  isCompleted: boolean;
  totalManifestCount: number;
  leader?: {
    id: string;
    rank: string;
    fullName: string;
    phone?: string | null;
  } | null;
  manifest: ManifestPassenger[];
}

export const BusDetails: React.FC<BusDetailsProps> = ({ busNumber, onBack }) => {
  const [data, setData] = useState<BusDetailsData | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [revertingGuestId, setRevertingGuestId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadBusDetails();
  }, [busNumber]);

  const loadBusDetails = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ bus: BusDetailsData }>(`/buses/${busNumber}`);
      setData(res.bus);
    } catch (err) {
      console.error('Failed to load bus details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertGuest = async (guestId: string, guestName: string) => {
    const confirmed = window.confirm(
      `هل تريد بالتأكيد إلغاء حضور وتسكين المدعو:\n\n[ ${guestName} ]\n\nوإعادته إلى قائمة "لم يحضر بعد" وإخلاء مقعده في هذا الأتوبيس؟`
    );
    if (!confirmed) return;

    setRevertingGuestId(guestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        '/checkin/revert',
        {
          method: 'POST',
          body: JSON.stringify({ guestId }),
        }
      );

      setActionSuccess(res.message || `تم بنجاح إرجاع المدعو (${guestName}) لحالة "لم يحضر بعد" وإخلاء مقعده.`);
      await loadBusDetails();

      setTimeout(() => {
        setActionSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Revert guest error:', err);
      setActionError(err.message || 'فشل إلغاء حضور المدعو');
    } finally {
      setRevertingGuestId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      const blob = await apiRequest<Blob>(`/reports/export/manifest/${busNumber}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `كشف_أتوبيس_${busNumber}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('فشل تصدير كشف الأتوبيس');
    }
  };

  const filteredManifest = data?.manifest.filter((p) => {
    if (!search.trim()) return true;
    return (
      p.fullName.includes(search) ||
      p.nationalId.includes(search) ||
      p.studentName.includes(search) ||
      p.studentMilitaryNumber.includes(search)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="bg-white p-16 text-center text-slate-400 rounded-xl border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-tmc-navy" />
        <span className="text-sm font-semibold">جاري تحميل كشف ركاب الأتوبيس رقم {busNumber}...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-8 text-center text-slate-500 rounded-xl border border-slate-200">
        لم يتم العثور على سجل الأتوبيس المطلوب
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print View Hidden on Screen, Rendered on Print */}
      <div className="hidden print:block">
        <ManifestPrintView bus={data} />
      </div>

      {/* Screen Interface (Hidden when printing) */}
      <div className="no-print space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:text-tmc-navy hover:bg-slate-50 transition"
              title="العودة لجميع الأتوبيسات"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900">
                  أتوبيس رقم [ {data.busNumber} ]
                </h2>
                <BusStatusBadge
                  status={data.status}
                  isCompleted={data.isCompleted}
                  isAwaitingLeader={data.isAwaitingLeader}
                />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                الكشف الرسمي لركاب الأتوبيس — السعة المقررة: 36 مدعو + قائد الأتوبيس
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <Printer className="w-4 h-4 text-tmc-gold" />
              <span>طباعة الكشف الرسمي (PDF)</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير إلى إكسيل</span>
            </button>

            <button
              onClick={loadBusDetails}
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <span className="text-xs text-slate-500 block">عدد المدعوين المسجلين</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {data.assignedGuests} <span className="text-sm font-normal text-slate-400">/ 36</span>
            </div>
          </div>


          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <span className="text-xs text-slate-500 block">نسبة الإشغال</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {data.occupancyRate}%
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <span className="text-xs text-slate-500 block">إجمالي كشف الأتوبيس</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {data.totalManifestCount} <span className="text-xs font-normal text-slate-500">فرداً</span>
            </div>
          </div>
        </div>

        {/* Bus Leader Status Banner */}
        {data.leader ? (
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-full flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  قائد الأتوبيس المعتمد
                </span>
                <h3 className="text-lg font-black text-emerald-950 mt-0.5">
                  {data.leader.rank} / {data.leader.fullName}
                </h3>
                {data.leader.phone && (
                  <div className="text-xs text-emerald-800 font-mono mt-0.5">
                    هاتف: {data.leader.phone}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setLeaderModalOpen(true)}
              className="px-4 py-2 bg-white border border-emerald-400 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg transition self-end sm:self-center"
            >
              تعديل بيانات القائد
            </button>
          </div>
        ) : (
          <div
            className={`rounded-xl p-5 shadow-sm border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              data.assignedGuests >= 36
                ? 'bg-amber-50 border-amber-500 animate-pulse'
                : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-full flex-shrink-0 ${
                  data.assignedGuests >= 36
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  قائد الأتوبيس
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {data.assignedGuests >= 36
                    ? 'مكتمل العدد — قائد الأتوبيس غير مسجل حتى الآن'
                    : 'لم يتم تسجيل قائد لهذا الأتوبيس بعد'}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setLeaderModalOpen(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-end sm:self-center shadow ${
                data.assignedGuests >= 36
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-tmc-navy hover:bg-tmc-navy-700 text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل قائد الأتوبيس الآن</span>
            </button>
          </div>
        )}

        {/* Notification Alerts */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-700 hover:text-red-950 font-bold px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* Passenger Manifest Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>كشف ركاب الأتوبيس ({data.manifest.length} مدعو)</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في ركاب الأتوبيس..."
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Passenger Manifest Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-12 text-center">م</th>
                  <th className="py-3 px-4 w-16 text-center">المقعد</th>
                  <th className="py-3 px-4">اسم المدعو رباعي</th>
                  <th className="py-3 px-4">الرقم القومي</th>
                  <th className="py-3 px-4">اسم الطالب المرتبط به</th>
                  <th className="py-3 px-4 text-center">الرقم العسكري</th>
                  <th className="py-3 px-4 text-center">درجة القرابة</th>
                  <th className="py-3 px-4 text-center">وقت الحضور</th>
                  <th className="py-3 px-4 text-center w-36">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Bus Leader as First Row */}
                {data.leader && (
                  <tr className="bg-emerald-50/80 border-b-2 border-emerald-500 font-bold">
                    <td className="py-3 px-4 text-center text-emerald-800 font-bold text-xs">
                      ★
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-emerald-900">
                      المقدمة
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-950">
                      قائد الأتوبيس: {data.leader.rank} / {data.leader.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-emerald-800">
                      {data.leader.phone ? `هاتف: ${data.leader.phone}` : '—'}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-xs text-emerald-800">
                      المسؤول الأمني والإداري المعتمد عن الأتوبيس
                    </td>
                    <td colSpan={3} className="py-3 px-4 text-center text-xs text-emerald-900 font-semibold">
                      معتمد رسمياً (الفرد الأول)
                    </td>
                  </tr>
                )}

                {filteredManifest.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      {data.manifest.length === 0
                        ? 'لم يتم تسكين أي مدعوين في هذا الأتوبيس حتى الآن'
                        : 'لا توجد نتائج تطابق البحث'}
                    </td>
                  </tr>
                ) : (
                  filteredManifest.map((p) => (
                    <tr key={p.guestId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                        {p.sequence}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-tmc-navy">
                        <span className="bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded">
                          {p.seatNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center justify-between gap-2">
                          <span>{p.fullName}</span>
                          <button
                            type="button"
                            onClick={() => handleRevertGuest(p.guestId, p.fullName)}
                            disabled={revertingGuestId === p.guestId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded transition disabled:opacity-50"
                            title={`إلغاء حضور (${p.fullName}) وإرجاعه إلى (لم يحضر بعد)`}
                          >
                            <Undo2 className={`w-3 h-3 ${revertingGuestId === p.guestId ? 'animate-spin' : ''}`} />
                            <span>إرجاع لـ "لم يحضر"</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <NationalIdMask
                          maskedId={p.nationalIdMasked}
                          fullId={p.nationalIdFull}
                        />
                      </td>

                      <td className="py-3 px-4 text-slate-800">
                        {p.studentName}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {p.studentMilitaryNumber}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                          {p.relationship}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                        {p.checkedInAt
                          ? new Date(p.checkedInAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRevertGuest(p.guestId, p.fullName)}
                          disabled={revertingGuestId === p.guestId}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg shadow-sm transition disabled:opacity-50"
                          title={`إلغاء حضور (${p.fullName}) وإرجاعه إلى (لم يحضر بعد)`}
                        >
                          <Undo2 className={`w-3.5 h-3.5 ${revertingGuestId === p.guestId ? 'animate-spin' : ''}`} />
                          <span>إرجاع لـ "لم يحضر"</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bus Leader Modal */}
        <BusLeaderModal
          isOpen={leaderModalOpen}
          onClose={() => setLeaderModalOpen(false)}
          busNumber={data.busNumber}
          currentLeader={data.leader}
          onSuccess={() => {
            loadBusDetails();
          }}
        />
      </div>
    </div>
  );
};
