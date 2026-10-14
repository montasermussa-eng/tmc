import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ArrowRight,
  Users,
  UserCheck,
  UserX,
  Bus,
  Search,
  RefreshCw,
  Printer,
  Calendar,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { AttendanceBadge } from '../components/StatusBadge';
import { NationalIdMask } from '../components/NationalIdMask';

interface StudentDetailsProps {
  studentId: number;
  onBack: () => void;
}

interface StudentData {
  id: number;
  militaryNumber: string;
  fullName: string;
  totalGuests: number;
  attendedGuests: number;
  absentGuests: number;
  guests: {
    id: string;
    fullName: string;
    nationalId: string;
    nationalIdMasked: string;
    nationalIdFull?: string;
    relationship: string;
    hasAttended: boolean;
    checkedInAt?: string | null;
    busNumber?: number | null;
    seatNumber?: number | null;
  }[];
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId, onBack }) => {
  const [data, setData] = useState<StudentData | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const loadStudent = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ student: StudentData }>(`/students/${studentId}`);
      setData(res.student);
    } catch (err) {
      console.error('Failed to load student details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGuests = data?.guests.filter((g) => {
    if (!search.trim()) return true;
    return (
      g.fullName.includes(search) ||
      g.nationalId.includes(search) ||
      g.relationship.includes(search)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-tmc-navy transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى سجل الطلبة</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة بطاقة الطالب</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tmc-navy" />
          <span>جاري تحميل ملف الطالب...</span>
        </div>
      ) : !data ? (
        <div className="bg-white p-8 text-center text-slate-500 rounded-xl border border-slate-200">
          لم يتم العثور على ملف الطالب المطلوب
        </div>
      ) : (
        <>
          {/* Student Profile Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-tmc-navy text-tmc-gold flex items-center justify-center font-bold text-xl shadow-inner">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs text-tmc-gold font-bold tracking-wider">
                    طالب خريج — الكلية العسكرية التكنولوجية
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    {data.fullName}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>الرقم العسكري:</span>
                    <span className="font-mono font-bold text-tmc-navy text-sm">
                      {data.militaryNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Ring or Bar */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center min-w-[140px]">
                <span className="text-[11px] text-slate-500 block">نسبة حضور الضيوف</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                  {data.totalGuests > 0
                    ? Math.round((data.attendedGuests / data.totalGuests) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div>
                <span className="text-xs text-slate-500 block">إجمالي الضيوف المسجلين</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">
                  {data.totalGuests}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">عدد الضيوف الحاضرين</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                  {data.attendedGuests}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">ضيوف لم يحضروا بعد</span>
                <span className="text-xl font-black text-slate-600 mt-0.5 block">
                  {data.absentGuests}
                </span>
              </div>
            </div>
          </div>

          {/* Associated Guests Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-tmc-navy" />
                <span>المدعوون المرتبطون بالطالب ({data.guests.length})</span>
              </h4>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث في ضيوف الطالب..."
                  className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Guests Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">اسم المدعو رباعي</th>
                      <th className="py-3 px-4">الرقم القومي</th>
                      <th className="py-3 px-4 text-center">درجة القرابة</th>
                      <th className="py-3 px-4 text-center">حالة الحضور</th>
                      <th className="py-3 px-4 text-center">الأتوبيس / المقعد</th>
                      <th className="py-3 px-4 text-center">وقت الحضور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGuests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          لا يوجد مدعوون يطابقون البحث
                        </td>
                      </tr>
                    ) : (
                      filteredGuests.map((g, idx) => (
                        <tr
                          key={g.id}
                          className={`hover:bg-slate-50 transition ${
                            g.hasAttended ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900">
                            {g.fullName}
                          </td>

                          <td className="py-3 px-4">
                            <NationalIdMask
                              maskedId={g.nationalIdMasked}
                              fullId={g.nationalIdFull}
                            />
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs font-semibold">
                              {g.relationship}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <AttendanceBadge hasAttended={g.hasAttended} />
                          </td>

                          <td className="py-3 px-4 text-center">
                            {g.busNumber ? (
                              <div className="inline-flex items-center gap-1 font-bold text-xs text-tmc-navy bg-tmc-navy-50 border border-tmc-navy-200 px-2 py-0.5 rounded">
                                <span>أتوبيس {g.busNumber}</span>
                                <span className="text-slate-400">|</span>
                                <span>مقعد {g.seatNumber}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">لم يخصص بعد</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                            {g.checkedInAt
                              ? new Date(g.checkedInAt).toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
