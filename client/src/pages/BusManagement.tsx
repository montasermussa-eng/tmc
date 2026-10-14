import React, { useState, useEffect } from 'react';
import {
  Bus as BusIcon,
  Filter,
  RefreshCw,
  Armchair,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { BusTile, BusSummary } from '../components/BusTile';
import { BusLeaderModal } from '../components/BusLeaderModal';

interface BusManagementProps {
  onOpenBus: (busNumber: number) => void;
}

export const BusManagement: React.FC<BusManagementProps> = ({ onOpenBus }) => {
  const [buses, setBuses] = useState<BusSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Leader modal state
  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [targetBusForLeader, setTargetBusForLeader] = useState<BusSummary | null>(null);

  useEffect(() => {
    loadBuses();
  }, []);

  const loadBuses = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ buses: BusSummary[] }>('/buses');
      setBuses(res.buses);
    } catch (err) {
      console.error('Failed to load buses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBuses = buses.filter((b) => {
    if (statusFilter === 'COMPLETED') return b.isCompleted;
    if (statusFilter === 'AWAITING_LEADER') return b.isAwaitingLeader;
    if (statusFilter === 'IN_PROGRESS') return b.status === 'IN_PROGRESS';
    if (statusFilter === 'AVAILABLE') return b.assignedGuests === 0;
    if (statusFilter === 'FULL') return b.assignedGuests >= 36;
    return true;
  });

  const totalAssignedSeats = buses.reduce((acc, b) => acc + b.assignedGuests, 0);
  const totalCapacity = 27 * 36; // 972
  const availableSeats = Math.max(0, totalCapacity - totalAssignedSeats);
  const fullBusesCount = buses.filter((b) => b.assignedGuests >= 36).length;
  const completedBusesCount = buses.filter((b) => b.isCompleted).length;
  const awaitingLeaderCount = buses.filter((b) => b.isAwaitingLeader).length;

  const handleRegisterLeader = (bus: BusSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetBusForLeader(bus);
    setLeaderModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
            <span>إدارة وتسكين الأتوبيسات (27 أتوبيساً)</span>
            <span className="text-xs bg-tmc-navy-50 text-tmc-navy-700 px-2.5 py-0.5 rounded-full border border-tmc-navy-200 font-bold">
              36 مقعد / أتوبيس
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة إشغال الأتوبيسات الـ 27 وتعيين القادة واعتماد كشوف الركاب
          </p>
        </div>

        <button
          onClick={loadBuses}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث الحالة</span>
        </button>
      </div>

      {/* Capacity Overview Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div className="border-l border-slate-100 last:border-0">
            <span className="text-xs text-slate-500 block">إجمالي سعة الضيوف</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              972 مقعداً
            </span>
            <span className="text-[10px] text-slate-400">في 27 أتوبيساً</span>
          </div>

          <div className="border-l border-slate-100 last:border-0">
            <span className="text-xs text-slate-500 block">المقاعد المشغولة</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">
              {totalAssignedSeats}
            </span>
            <span className="text-[10px] text-slate-400">
              {Math.round((totalAssignedSeats / totalCapacity) * 100)}% من السعة
            </span>
          </div>

          <div className="border-l border-slate-100 last:border-0">
            <span className="text-xs text-slate-500 block">المقاعد المتاحة</span>
            <span className="text-xl font-black text-tmc-navy mt-0.5 block">
              {availableSeats}
            </span>
            <span className="text-[10px] text-slate-400">مقعد شاغر</span>
          </div>

          <div className="border-l border-slate-100 last:border-0">
            <span className="text-xs text-slate-500 block">أتوبيسات مكتملة ومعتمدة</span>
            <span className="text-xl font-black text-emerald-800 mt-0.5 block">
              {completedBusesCount} <span className="text-xs text-slate-400 font-normal">/ 27</span>
            </span>
            <span className="text-[10px] text-slate-400">36 مدعو + قائد</span>
          </div>

          <div>
            <span className="text-xs text-slate-500 block">بانتظار تعيين القائد</span>
            <span className="text-xl font-black text-amber-600 mt-0.5 block">
              {awaitingLeaderCount}
            </span>
            <span className="text-[10px] text-slate-400">مكتملة العدد</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            statusFilter === 'ALL'
              ? 'bg-tmc-navy text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>جميع الأتوبيسات (27)</span>
        </button>

        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>مكتمل ومعتمد ({completedBusesCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('AWAITING_LEADER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            statusFilter === 'AWAITING_LEADER'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>بانتظار القائد ({awaitingLeaderCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>قيد التسكين</span>
        </button>

        <button
          onClick={() => setStatusFilter('AVAILABLE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            statusFilter === 'AVAILABLE'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>متاح (فارغ)</span>
        </button>
      </div>

      {/* 27 Buses Grid */}
      {isLoading ? (
        <div className="bg-white p-16 text-center text-slate-400 rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-tmc-navy" />
          <span className="text-sm font-semibold">جاري تحميل مصفوفة الـ 27 أتوبيساً...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBuses.map((bus) => (
            <BusTile
              key={bus.id}
              bus={bus}
              onClick={() => onOpenBus(bus.busNumber)}
              onRegisterLeader={(e) => handleRegisterLeader(bus, e)}
            />
          ))}
        </div>
      )}

      {/* Bus Leader Modal */}
      {targetBusForLeader && (
        <BusLeaderModal
          isOpen={leaderModalOpen}
          onClose={() => {
            setLeaderModalOpen(false);
            setTargetBusForLeader(null);
          }}
          busNumber={targetBusForLeader.busNumber}
          currentLeader={targetBusForLeader.leader}
          onSuccess={() => {
            loadBuses();
          }}
        />
      )}
    </div>
  );
};
