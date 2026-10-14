import React from 'react';
import { Bus as BusIcon, Shield, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { BusStatusBadge } from './StatusBadge';

export interface BusSummary {
  id: number;
  busNumber: number;
  capacity: number;
  assignedGuests: number;
  remainingSeats: number;
  occupancyRate: number;
  status: string;
  hasLeader: boolean;
  isAwaitingLeader: boolean;
  isCompleted: boolean;
  leader?: {
    id: string;
    rank: string;
    fullName: string;
    phone?: string | null;
  } | null;
}

interface BusTileProps {
  bus: BusSummary;
  onClick: () => void;
  onRegisterLeader?: (e: React.MouseEvent) => void;
}

export const BusTile: React.FC<BusTileProps> = ({
  bus,
  onClick,
  onRegisterLeader,
}) => {
  // Traffic-light-inspired border and accent treatments
  const getCardStyle = () => {
    if (bus.isCompleted) {
      return 'border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-700 shadow-sm';
    }
    if (bus.isAwaitingLeader) {
      return 'border-amber-500 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-600 shadow-sm';
    }
    if (bus.status === 'FULL') {
      return 'border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40';
    }
    if (bus.status === 'IN_PROGRESS') {
      return 'border-amber-400 bg-white hover:border-amber-500';
    }
    if (bus.status === 'CLOSED') {
      return 'border-red-300 bg-red-50/20 opacity-75';
    }
    // Available / Empty
    return 'border-slate-300 bg-white hover:border-tmc-navy-400';
  };

  const getProgressColor = () => {
    if (bus.occupancyRate >= 100) return 'bg-emerald-600';
    if (bus.occupancyRate >= 50) return 'bg-amber-500';
    return 'bg-tmc-navy-500';
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-150 flex flex-col justify-between select-none relative group ${getCardStyle()}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm ${
              bus.isCompleted
                ? 'bg-emerald-700 text-white'
                : bus.isAwaitingLeader
                ? 'bg-amber-600 text-white'
                : 'bg-tmc-navy text-tmc-gold'
            }`}
          >
            {bus.busNumber}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              أتوبيس رقم {bus.busNumber}
            </h4>
            <div className="text-[11px] text-slate-500">
              السعة: 36 مقعد
            </div>
          </div>
        </div>

        <BusStatusBadge
          status={bus.status}
          isCompleted={bus.isCompleted}
          isAwaitingLeader={bus.isAwaitingLeader}
        />
      </div>

      {/* Progress Bar & Seat Count */}
      <div className="my-2.5">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="font-semibold text-slate-700">
            {bus.assignedGuests} / 36 مدعو
          </span>
          <span className="font-bold text-slate-600">
            {bus.occupancyRate}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, bus.occupancyRate)}%` }}
          ></div>
        </div>
      </div>

      {/* Leader Status Block */}
      <div className="pt-2 border-t border-slate-200/80 mt-1 flex items-center justify-between text-xs">
        {bus.leader ? (
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              القائد: {bus.leader.rank} / {bus.leader.fullName.split(' ')[0]} {bus.leader.fullName.split(' ')[1] || ''}
            </span>
          </div>
        ) : bus.assignedGuests >= 36 ? (
          <div className="flex items-center gap-1 text-amber-800 font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>بانتظار تعيين القائد</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <span>القائد: لم يسجل بعد</span>
          </div>
        )}

        {/* Action shortcut to register leader if awaiting */}
        {bus.isAwaitingLeader && onRegisterLeader && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegisterLeader(e);
            }}
            className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded shadow-sm transition"
          >
            تسجيل
          </button>
        )}
      </div>
    </div>
  );
};
