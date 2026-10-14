import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  GraduationCap,
  Bus,
  Armchair,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../api/client';

interface DashboardStats {
  totalGuests: number;
  attendedGuests: number;
  absentGuests: number;
  attendanceRate: number;
  totalStudents: number;
  totalSystemSeats: number;
  totalAssignedSeats: number;
  availableSeats: number;
  unallocatedGuests: number;
  fullBuses: number;
  partialBuses: number;
  emptyBuses: number;
  completedBuses: number;
  fullAwaitingLeader: number;
}

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ stats: DashboardStats }>('/reports/dashboard');
      setStats(res.stats);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث إحصائيات لوحة التحكم');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
            <span>لوحة التحكم والمتابعة المباشرة</span>
            <span className="text-xs bg-tmc-navy-50 text-tmc-navy-700 px-2.5 py-0.5 rounded-full border border-tmc-navy-200 font-semibold">
              حفل تخرج الطلبة
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            مؤشرات تشغيلية لحظية ومباشرة من قاعدة بيانات المنظومة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-tmc-navy' : ''}`} />
            <span>تحديث البيانات</span>
          </button>

          <button
            onClick={() => onNavigate('fast-checkin')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow transition"
          >
            <UserCheck className="w-4 h-4" />
            <span>تسجيل دخول البوابة</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Operational Capacity Alert Banner if seats getting high */}
      {stats && stats.availableSeats < 100 && (
        <div className="p-4 bg-amber-50 border-r-4 border-amber-500 rounded-lg text-amber-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">تنبيه سعة الأتوبيسات: </span>
              متبقي {stats.availableSeats} مقعداً فقط من إجمالي 972 مقعداً في الـ 27 أتوبيساً.
            </div>
          </div>
          <button
            onClick={() => onNavigate('buses')}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-bold transition flex items-center gap-1"
          >
            <span>متابعة الأتوبيسات</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Full Buses Awaiting Leader Alert */}
      {stats && stats.fullAwaitingLeader > 0 && (
        <div className="p-4 bg-red-50 border-r-4 border-red-600 rounded-lg text-red-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <span className="font-bold">إجراء مطلوب: </span>
              يوجد {stats.fullAwaitingLeader} أتوبيس مكتمل العدد (36 مدعو) وبانتظار تسجيل قائد الأتوبيس.
            </div>
          </div>
          <button
            onClick={() => onNavigate('buses')}
            className="text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded font-bold transition"
          >
            تسجيل قادة الأتوبيسات
          </button>
        </div>
      )}

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guests */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي المدعوين المسجلين</span>
            <div className="p-2 bg-tmc-navy-50 text-tmc-navy-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {isLoading ? '...' : stats?.totalGuests.toLocaleString('ar-EG') || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            مسجلون في قاعدة البيانات الرسمية
          </div>
        </div>

        {/* Attended Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">عدد الحضور الفعلي</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {isLoading ? '...' : stats?.attendedGuests.toLocaleString('ar-EG') || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            تم تسجيل دخولهم وتسكينهم في الأتوبيسات
          </div>
        </div>

        {/* Absent Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">الذين لم يحضروا بعد</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-700 mt-2">
            {isLoading ? '...' : stats?.absentGuests.toLocaleString('ar-EG') || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            بانتظار وصولهم للبوابة
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">نسبة الحضور</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {isLoading ? '...' : `${stats?.attendanceRate || 0}%`}
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.attendanceRate || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-tmc-navy" />
            <span>عدد الطلبة</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {isLoading ? '...' : stats?.totalStudents.toLocaleString('ar-EG') || 0}
          </div>
          <span className="text-[10px] text-slate-400">مرتبطون بالمدعوين</span>
        </div>

        {/* Full Buses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Bus className="w-4 h-4 text-emerald-600" />
            <span>الأتوبيسات المكتملة</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-2">
            {isLoading ? '...' : stats?.fullBuses || 0} <span className="text-xs text-slate-500 font-normal">/ 27</span>
          </div>
          <span className="text-[10px] text-slate-400">سعة 36 مقعد</span>
        </div>

        {/* Partial Buses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Bus className="w-4 h-4 text-amber-600" />
            <span>قيد التسكين</span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-2">
            {isLoading ? '...' : stats?.partialBuses || 0}
          </div>
          <span className="text-[10px] text-slate-400">بها مقاعد شاغرة</span>
        </div>

        {/* Available Seats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Armchair className="w-4 h-4 text-tmc-navy-500" />
            <span>المقاعد المتاحة</span>
          </div>
          <div className="text-xl font-bold text-tmc-navy mt-2">
            {isLoading ? '...' : stats?.availableSeats.toLocaleString('ar-EG') || 0}
          </div>
          <span className="text-[10px] text-slate-400">من إجمالي 972 مقعداً</span>
        </div>

        {/* Unallocated Guests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Users className="w-4 h-4 text-slate-500" />
            <span>لم يخصص لهم أتوبيس</span>
          </div>
          <div className="text-xl font-bold text-slate-800 mt-2">
            {isLoading ? '...' : stats?.unallocatedGuests.toLocaleString('ar-EG') || 0}
          </div>
          <span className="text-[10px] text-slate-400">بانتظار تسجيل الحضور</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div
          onClick={() => onNavigate('fast-checkin')}
          className="bg-tmc-navy text-white rounded-xl p-5 cursor-pointer hover:bg-tmc-navy-800 transition shadow flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-tmc-gold">عمليات البوابة</span>
              <UserCheck className="w-5 h-5 text-tmc-gold" />
            </div>
            <h3 className="text-lg font-bold">تسجيل دخول المدعوين السريع</h3>
            <p className="text-xs text-slate-300 mt-1">
              البحث الفوري بآخر ٧ أرقام من الرقم القومي وتسكين الأتوبيس آلياً
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-tmc-gold font-bold">
            <span>فتح نافذة البوابة</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('buses')}
          className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-tmc-navy-500 transition shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">حركة النقل</span>
              <Bus className="w-5 h-5 text-tmc-navy" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">متابعة الـ 27 أتوبيساً</h3>
            <p className="text-xs text-slate-500 mt-1">
              متابعة الإشغال اللحظي، تعيين قادة الأتوبيسات، وطباعة الكشوفات الرسمية
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-tmc-navy font-bold">
            <span>عرض شبكة الأتوبيسات</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('import')}
          className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-tmc-navy-500 transition shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">إدارة السجلات</span>
              <Users className="w-5 h-5 text-tmc-navy" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">استيراد كشوف الإكسيل</h3>
            <p className="text-xs text-slate-500 mt-1">
              رفع ملفات الضيوف والطلبة، فحص الأخطاء والتكرار، واعتماد الدفعات
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-tmc-navy font-bold">
            <span>استيراد ملف</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </div>
        </div>
      </div>
    </div>
  );
};
