import React from 'react';

interface AttendanceBadgeProps {
  hasAttended: boolean;
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ hasAttended }) => {
  if (hasAttended) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
        حاضر
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
      لم يحضر
    </span>
  );
};

interface BusStatusBadgeProps {
  status: string;
  isCompleted?: boolean;
  isAwaitingLeader?: boolean;
}

export const BusStatusBadge: React.FC<BusStatusBadgeProps> = ({
  status,
  isCompleted,
  isAwaitingLeader,
}) => {
  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-800 text-emerald-100 border border-emerald-600">
        مكتمل ومعتمد
      </span>
    );
  }

  if (isAwaitingLeader) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
        مكتمل العدد (بانتظار القائد)
      </span>
    );
  }

  switch (status) {
    case 'FULL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          مكتمل (36 مدعو)
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          قيد التسكين
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">
          مغلق إدارياً
        </span>
      );
    case 'AVAILABLE':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          متاح (فارغ)
        </span>
      );
  }
};
