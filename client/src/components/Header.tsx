import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, UserCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();
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
              <div className="text-xs text-tmc-gold tracking-wider font-bold">
                وزارة الدفاع - الاكاديمية العسكرية المصرية
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

          {/* Time & User Badge (المقدم / أسامة الجمل) */}
          <div className="flex items-center gap-4">
            {/* Live Clock */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 bg-tmc-navy-800 px-3 py-1.5 rounded border border-tmc-navy-700">
              <Clock className="w-3.5 h-3.5 text-tmc-gold" />
              <span>{currentTime}</span>
            </div>

            {/* Officer Badge: المقدم / أسامة الجمل */}
            <div className="flex items-center gap-2.5 bg-tmc-navy-800/90 px-3.5 py-1.5 rounded-lg border border-tmc-navy-600">
              <div className="h-8 w-8 rounded-full bg-tmc-navy-700 border border-tmc-gold flex items-center justify-center text-tmc-gold font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-white leading-tight">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-tmc-gold font-semibold">
                  مسؤول المنظومة
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
