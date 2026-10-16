import React from 'react';
import {
  UserCheck2,
  Users,
  GraduationCap,
  Bus,
  UserPlus,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    {
      id: 'fast-checkin',
      label: 'تسجيل دخول المدعوين',
      icon: UserCheck2,
      badge: 'البوابة',
      highlight: true,
    },
    {
      id: 'guests',
      label: 'سجل المدعوين',
      icon: Users,
      badge: null,
    },
    {
      id: 'students',
      label: 'سجل الطلبة',
      icon: GraduationCap,
      badge: null,
    },
    {
      id: 'buses',
      label: 'إدارة وتسكين الأتوبيسات',
      icon: Bus,
      badge: '27 أتوبيس',
    },
    {
      id: 'add-guest',
      label: 'إضافة مدعو جديد',
      icon: UserPlus,
      badge: null,
    },
    {
      id: 'import',
      label: 'استيراد البيانات (إكسيل)',
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      id: 'reports',
      label: 'التقارير والتصدير',
      icon: FileText,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 border-l border-slate-800 min-h-[calc(100vh-5rem)] flex flex-col justify-between no-print">
      <div className="py-4">
        <div className="px-4 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            الأقسام الرئيسية للمنظومة
          </span>
        </div>

        <nav className="space-y-1.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-tmc-navy-600 text-white font-semibold shadow-sm border-r-4 border-tmc-gold'
                    : item.highlight
                    ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/60'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-tmc-gold'
                        : item.highlight
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.highlight
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
