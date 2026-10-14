import React from 'react';
import { Code2, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 no-print"
      dir="rtl"
    >
      {/* Top decorative line — animated gold gradient */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-tmc-gold to-transparent animate-pulse" />

      {/* Main footer body */}
      <div className="bg-gradient-to-r from-tmc-navy-900 via-tmc-navy to-tmc-navy-900 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3">
          {/* Sparkle icon */}
          <Sparkles className="w-3.5 h-3.5 text-tmc-gold animate-pulse flex-shrink-0" />

          {/* Credit text */}
          <span className="text-[11px] sm:text-xs font-semibold text-slate-300 tracking-wide">
            تم التصميم والتطوير بواسطة
          </span>

          {/* Engineer name — highlighted */}
          <span className="text-[11px] sm:text-xs font-black text-tmc-gold-light flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-tmc-gold flex-shrink-0" />
            المهندس / حازم منتصر
          </span>

          {/* Sparkle icon */}
          <Sparkles className="w-3.5 h-3.5 text-tmc-gold animate-pulse flex-shrink-0" />
        </div>
      </div>
    </footer>
  );
};
