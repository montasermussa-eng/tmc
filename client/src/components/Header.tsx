import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, Clock, UserCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'مسؤول النظام (ضابط النظم)', color: 'bg-red-800 text-red-100' };
      case 'SUPERVISOR':
        return { label: 'مشرف قطاع النقل وتسكين الأتوبيسات', color: 'bg-amber-800 text-amber-100' };
      case 'GATE_OPERATOR':
        return { label: 'مسؤول بوابة الدخول الرئيسية', color: 'bg-emerald-800 text-emerald-100' };
      default:
        return { label: 'مستخدم مصرح', color: 'bg-slate-700 text-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <header className="bg-tmc-navy text-white shadow-md border-b-2 border-tmc-gold sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Institution Crest and Title */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0 bg-white p-1 rounded-full shadow-inner border border-tmc-gold">
              <img
                src="/logo.jpg"
                alt="شعار الكلية العسكرية التكنولوجية"
                className="h-14 w-14 rounded-full object-contain"
              />
            </div>
            <div>
              <div className="text-xs text-tmc-gold tracking-wider font-semibold">
                جمهورية مصر العربية — وزارة الدفاع
              </div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                الكلية العسكرية التكنولوجية
                <span className="text-xs bg-tmc-navy-700 border border-tmc-navy-500 px-2 py-0.5 rounded text-slate-200 font-normal hidden sm:inline-block">
                  TMC
                </span>
              </h1>
              <p className="text-xs text-slate-300 hidden md:block">
                منظومة تسجيل حضور ضيوف حفل التخرج وإدارة وتسكين الأتوبيسات
              </p>
            </div>
          </div>

          {/* Time, User Role, and Logout */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* Live Clock */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 bg-tmc-navy-800 px-3 py-1.5 rounded border border-tmc-navy-700">
              <Clock className="w-3.5 h-3.5 text-tmc-gold" />
              <span>{currentTime}</span>
            </div>

            {/* User Profile Badge */}
            {user && (
              <div className="flex items-center gap-2.5">
                <div className="text-left rtl:text-right hidden sm:block">
                  <div className="text-sm font-semibold text-white leading-none">
                    {user.fullName}
                  </div>
                  <div className="mt-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                </div>

                <div className="h-9 w-9 rounded-full bg-tmc-navy-700 border border-tmc-navy-500 flex items-center justify-center text-tmc-gold font-bold text-sm">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={logout}
              title="تسجيل الخروج من المنظومة"
              className="flex items-center gap-1.5 bg-tmc-navy-800 hover:bg-red-950 text-slate-300 hover:text-red-200 px-3 py-1.5 rounded border border-tmc-navy-700 hover:border-red-800 text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
