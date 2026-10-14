import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { AttendanceBadge } from '../components/StatusBadge';
import { NationalIdMask } from '../components/NationalIdMask';

interface GuestRecord {
  id: string;
  fullName: string;
  nationalId: string;
  nationalIdMasked: string;
  nationalIdFull?: string;
  relationship: string;
  isIndependent: boolean;
  studentName: string;
  studentMilitaryNumber: string;
  studentId?: number;
  hasAttended: boolean;
  checkedInAt?: string | null;
  busNumber?: number | null;
  seatNumber?: number | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const Guests: React.FC = () => {
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busFilter, setBusFilter] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');
  const [relationships, setRelationships] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadGuests();
  }, [pagination.page, statusFilter, busFilter, relationshipFilter]);

  const loadSettings = async () => {
    try {
      const res = await apiRequest<{ relationships: { id: number; name: string }[] }>('/settings');
      setRelationships(res.relationships);
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  };

  const loadGuests = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (search.trim()) queryParams.append('search', search.trim());
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (busFilter) queryParams.append('busNumber', busFilter);
      if (relationshipFilter) queryParams.append('relationship', relationshipFilter);

      const res = await apiRequest<{
        guests: GuestRecord[];
        pagination: PaginationMeta;
      }>(`/guests?${queryParams.toString()}`);

      setGuests(res.guests);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load guests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadGuests();
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (busFilter) queryParams.append('busNumber', busFilter);

      const blob = await apiRequest<Blob>(`/reports/export/guests?${queryParams.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سجل_المدعوين_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('فشل تصدير كشف المدعوين');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
            <span>سجل المدعوين لحفل التخرج</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">
              إجمالي: {pagination.total} مدعو
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة وتتبع بيانات الحضور وتسكين الأتوبيسات مع إمكانية التصفية والتصدير
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadGuests}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'جاري التصدير...' : 'تصدير إلى إكسيل'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم رباعي، الرقم القومي، اسم الطالب، أو الرقم العسكري..."
              className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">جميع حالات الحضور</option>
              <option value="ATTENDED">حاضر فقط</option>
              <option value="ABSENT">لم يحضر فقط</option>
            </select>

            {/* Relationship Filter */}
            <select
              value={relationshipFilter}
              onChange={(e) => {
                setRelationshipFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">جميع صلات القرابة</option>
              {relationships.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Bus Filter */}
            <select
              value={busFilter}
              onChange={(e) => {
                setBusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">جميع الأتوبيسات</option>
              {Array.from({ length: 27 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  أتوبيس رقم {num}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-tmc-navy text-white text-xs font-bold rounded-lg hover:bg-tmc-navy-700 transition"
            >
              تطبيق البحث
            </button>
          </div>
        </form>
      </div>

      {/* Main Guests Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">اسم المدعو رباعي</th>
                <th className="py-3.5 px-4">الرقم القومي</th>
                <th className="py-3.5 px-4">اسم الطالب المرتبط به</th>
                <th className="py-3.5 px-4 text-center">الرقم العسكري</th>
                <th className="py-3.5 px-4 text-center">درجة القرابة</th>
                <th className="py-3.5 px-4 text-center">حالة الحضور</th>
                <th className="py-3.5 px-4 text-center">الأوتوبيس / المقعد</th>
                <th className="py-3.5 px-4 text-center">وقت الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tmc-navy" />
                    <span>جاري تحميل سجلات المدعوين...</span>
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    لم يتم العثور على أي مدعوين يطابقون معايير البحث
                  </td>
                </tr>
              ) : (
                guests.map((g, idx) => (
                  <tr
                    key={g.id}
                    className={`hover:bg-slate-50/80 transition ${
                      g.hasAttended ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
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

                    <td className="py-3 px-4 text-slate-800">
                      {g.studentName}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                      {g.studentMilitaryNumber}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs">
                        {g.relationship}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <AttendanceBadge hasAttended={g.hasAttended} />
                    </td>

                    <td className="py-3 px-4 text-center">
                      {g.busNumber ? (
                        <div className="inline-flex items-center gap-1 font-bold text-xs text-tmc-navy bg-tmc-navy-50 border border-tmc-navy-200 px-2.5 py-1 rounded">
                          <span>أتوبيس {g.busNumber}</span>
                          <span className="text-slate-400">|</span>
                          <span>م {g.seatNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">لم يخصص</span>
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
            من إجمالي <span className="font-bold text-slate-900">{pagination.total}</span> مدعو
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
              title="الصفحة السابقة"
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
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
