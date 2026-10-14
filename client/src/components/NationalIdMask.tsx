import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface NationalIdMaskProps {
  maskedId: string;
  fullId?: string;
  allowReveal?: boolean;
}

export const NationalIdMask: React.FC<NationalIdMaskProps> = ({
  maskedId,
  fullId,
  allowReveal = true,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const canReveal = allowReveal && !!fullId;

  return (
    <div className="inline-flex items-center gap-2 font-mono text-sm tracking-wider">
      <span className="select-all">
        {isRevealed && fullId ? fullId : maskedId}
      </span>

      {canReveal && (
        <button
          type="button"
          onClick={() => setIsRevealed(!isRevealed)}
          className="text-slate-400 hover:text-slate-700 transition p-0.5 rounded focus:outline-none"
          title={isRevealed ? 'إخفاء الرقم' : 'إظهار الرقم القومي الكامل'}
        >
          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
};
