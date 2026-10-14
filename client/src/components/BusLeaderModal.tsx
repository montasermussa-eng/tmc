import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Phone, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client';

interface BusLeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  busNumber: number;
  currentLeader?: {
    rank: string;
    fullName: string;
    phone?: string | null;
  } | null;
  onSuccess: () => void;
}

export const BusLeaderModal: React.FC<BusLeaderModalProps> = ({
  isOpen,
  onClose,
  busNumber,
  currentLeader,
  onSuccess,
}) => {
  const [ranks, setRanks] = useState<{ id: number; name: string }[]>([]);
  const [selectedRank, setSelectedRank] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadRanks();
      if (currentLeader) {
        setSelectedRank(currentLeader.rank);
        setFullName(currentLeader.fullName);
        setPhone(currentLeader.phone || '');
      } else {
        setSelectedRank('');
        setFullName('');
        setPhone('');
      }
      setErrorMessage('');
    }
  }, [isOpen, currentLeader]);

  const loadRanks = async () => {
    try {
      const res = await apiRequest<{ ranks: { id: number; name: string }[] }>('/settings');
      setRanks(res.ranks);
      if (!selectedRank && res.ranks.length > 0) {
        setSelectedRank(res.ranks[0].name);
      }
    } catch (err) {
      console.error('Failed to load ranks:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRank) {
      setErrorMessage('يرجى اختيار رتبة قائد الأتوبيس');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('يرجى إدخال الاسم الكامل لقائد الأتوبيس');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiRequest(`/buses/${busNumber}/leader`, {
        method: 'POST',
        body: JSON.stringify({
          rank: selectedRank,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل حفظ بيانات قائد الأتوبيس');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-right">
        {/* Modal Header */}
        <div className="bg-tmc-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-tmc-gold">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tmc-navy-700 rounded-md text-tmc-gold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {currentLeader ? 'تعديل بيانات قائد الأتوبيس' : 'تسجيل قائد الأتوبيس'}
              </h3>
              <p className="text-xs text-slate-300">
                أتوبيس رقم [{busNumber}] — السعة المقررة: 36 مدعو + قائد الأتوبيس
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الأتوبيس
            </label>
            <input
              type="text"
              readOnly
              value={`أتوبيس رقم ${busNumber}`}
              className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رتبة قائد الأتوبيس <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
              required
            >
              <option value="">-- اختر الرتبة العسكرية --</option>
              {ranks.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              الاسم الكامل لقائد الأتوبيس <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد عبد الله سعيد نصر"
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم هاتف قائد الأتوبيس (اختياري)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                dir="ltr"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 text-right focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 leading-relaxed">
            <span className="font-semibold text-tmc-navy">ملاحظة تنظيمية:</span> سعة الأتوبيس الرسمية هي 36 مقعداً مخصصة لضيوف حفل التخرج. قائد الأتوبيس هو المسؤول الأمني والإداري ولا يحتسب ضمن مقاعد الضيوف الـ 36 (إجمالي الكشف الرسمي 37 فرداً).
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-tmc-navy hover:bg-tmc-navy-700 rounded shadow transition flex items-center gap-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4 text-tmc-gold" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ واعتماد قائد الأتوبيس'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
