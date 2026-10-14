import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Users,
  UserCheck,
  UserX,
  Bus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../api/client';

interface StudentSummary {
  id: number;
  militaryNumber: string;
  fullName: string;
  totalGuests: number;
  attendedGuests: number;
  absentGuests: number;
  allocatedBuses: number[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StudentsProps {
  onOpenStudent: (studentId: number) => void;
}

export const Students: React.FC<StudentsProps> = ({ onOpenStudent }) => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [pagination.page]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search.trim()) queryParams.append('search', search.trim());

      const res = await apiRequest<{
        students: StudentSummary[];
        pagination: PaginationMeta;
      }>(`/students?${queryParams.toString()}`);

      setStudents(res.students);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    loadStudents();
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
            <span>سجل الطلبة الخريجين</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">
              {pagination.total} طالب
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة ضيوف كل طالب، نسب الحضور، والأتوبيسات المخصصة لعائلاتهم
          </p>
        </div>

        <button
          onClick={loadStudents}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالرقم العسكري أو اسم الطالب..."
              className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-tmc-navy text-white text-xs font-bold rounded-lg hover:bg-tmc-navy-700 transition"
          >
            بحث
          </button>
        </form>
      </div>

      {/* Students Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 text-center">الرقم العسكري</th>
                <th className="py-3.5 px-4">اسم الطالب</th>
                <th className="py-3.5 px-4 text-center">إجمالي المدعوين</th>
                <th className="py-3.5 px-4 text-center">الذين حضروا</th>
                <th className="py-3.5 px-4 text-center">لم يحضروا</th>
                <th className="py-3.5 px-4 text-center">الأتوبيسات المخصصة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tmc-navy" />
                    <span>جاري تحميل بيانات الطلبة...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    لم يتم العثور على أي طلبة مسجلين
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-tmc-navy">
                      {s.militaryNumber}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.fullName}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                        {s.totalGuests}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                        {s.attendedGuests}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
                        {s.absentGuests}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {s.allocatedBuses.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {s.allocatedBuses.map((busNum) => (
                            <span
                              key={busNum}
                              className="text-[11px] font-bold text-tmc-navy bg-tmc-navy-50 border border-tmc-navy-200 px-2 py-0.5 rounded"
                            >
                              أ {busNum}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">لم يخصص بعد</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onOpenStudent(s.id)}
                        className="px-3 py-1.5 bg-tmc-navy hover:bg-tmc-navy-700 text-white text-xs font-semibold rounded shadow-sm transition inline-flex items-center gap-1"
                      >
                        <span>عرض الملف</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            عرض الصفوف{' '}
            <span className="font-bold text-slate-900">
              {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}
            </span>{' '}
            إلى{' '}
            <span className="font-bold text-slate-900">
              {Math.min(pagination.total, pagination.page * pagination.limit)}
            </span>{' '}
            من إجمالي <span className="font-bold text-slate-900">{pagination.total}</span> طالب
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="px-3 font-semibold text-slate-700">
              صفحة {pagination.page} من {pagination.totalPages || 1}
            </span>

            <button
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.min(pagination.totalPages, p.page + 1),
                }))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
