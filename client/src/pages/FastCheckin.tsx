import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Bus,
  RotateCcw,
  UserPlus,
  ShieldAlert,
  ArrowRight,
  Hash,
  Users,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { AttendanceBadge } from '../components/StatusBadge';
import { NationalIdMask } from '../components/NationalIdMask';
import { normalizeNumerals } from '../utils/nationalId';

interface GuestCandidate {
  id: string;
  fullName: string;
  nationalId: string;
  nationalIdMasked: string;
  nationalIdFull?: string;
  nationalIdSuffix: string;
  relationship: string;
  isIndependent: boolean;
  studentName: string;
  studentMilitaryNumber: string;
  hasAttended: boolean;
  checkedInAt?: string | null;
  busNumber?: number | null;
  seatNumber?: number | null;
  notes?: string | null;
}

interface FastCheckinProps {
  onNavigateToAddGuest: () => void;
}

export const FastCheckin: React.FC<FastCheckinProps> = ({ onNavigateToAddGuest }) => {
  const [suffixInput, setSuffixInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Results
  const [selectedGuest, setSelectedGuest] = useState<GuestCandidate | null>(null);
  const [multipleCandidates, setMultipleCandidates] = useState<GuestCandidate[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    busNumber: number;
    seatNumber: number;
    guestName: string;
    isBusNowFull: boolean;
    requiresLeader: boolean;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeNumerals(raw);
    if (normalized.length <= 7) {
      setSuffixInput(normalized);
      setSearchError('');
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizeNumerals(suffixInput);

    if (clean.length !== 7) {
      setSearchError(`يجب إدخال ٧ أرقام بالضبط (المُدخل حالياً: ${clean.length} رقم)`);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSelectedGuest(null);
    setMultipleCandidates([]);
    setNotFound(false);
    setSuccessInfo(null);

    try {
      const res = await apiRequest<{
        matchesCount: number;
        guest?: GuestCandidate;
        candidates?: GuestCandidate[];
        message?: string;
      }>(`/checkin/search?suffix=${clean}`);

      if (res.matchesCount === 0) {
        setNotFound(true);
      } else if (res.matchesCount === 1 && res.guest) {
        setSelectedGuest(res.guest);
      } else if (res.candidates && res.candidates.length > 1) {
        setMultipleCandidates(res.candidates);
      }
    } catch (err: any) {
      setSearchError(err.message || 'فشل البحث عن المدعو');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteCheckin = async (guest: GuestCandidate) => {
    setIsCheckingIn(true);
    setSearchError('');

    try {
      const res = await apiRequest<{
        success: boolean;
        alreadyCheckedIn?: boolean;
        message: string;
        busNumber: number;
        seatNumber: number;
        isBusNowFull: boolean;
        requiresLeader: boolean;
      }>('/checkin/execute', {
        method: 'POST',
        body: JSON.stringify({ guestId: guest.id }),
      });

      // Celebration effect on success
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Confetti is an enhancement
      }

      setSuccessInfo({
        message: res.message,
        busNumber: res.busNumber,
        seatNumber: res.seatNumber,
        guestName: guest.fullName,
        isBusNowFull: res.isBusNowFull,
        requiresLeader: res.requiresLeader,
      });

      // Update selected guest status in UI
      setSelectedGuest({
        ...guest,
        hasAttended: true,
        busNumber: res.busNumber,
        seatNumber: res.seatNumber,
        checkedInAt: new Date().toISOString(),
      });

      // Reset input for next guest
      setSuffixInput('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    } catch (err: any) {
      setSearchError(err.message || 'فشل تسجيل الدخول والتسكين');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleReset = () => {
    setSuffixInput('');
    setSelectedGuest(null);
    setMultipleCandidates([]);
    setNotFound(false);
    setSuccessInfo(null);
    setSearchError('');
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Institutional Gate Banner */}
      <div className="bg-tmc-navy text-white rounded-xl p-6 shadow-md border-b-4 border-tmc-gold">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-tmc-gold font-bold tracking-wider mb-1">
              منظومة الكلية العسكرية التكنولوجية — بوابة الدخول الرئيسية
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              تسجيل دخول المدعوين والتسكين الآلي للأتوبيسات
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              أدخل آخر ٧ أرقام من الرقم القومي للمدعو للتحقق الفوري وتخصيص المقعد تلقائياً
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-tmc-navy-800 hover:bg-tmc-navy-700 text-slate-300 text-xs font-semibold rounded-lg border border-tmc-navy-600 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط / بحث جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent High-Speed Input Search Box */}
      <div className="bg-white rounded-xl border-2 border-tmc-navy-300 p-6 sm:p-8 shadow-md">
        <form onSubmit={handleSearch} className="space-y-4">
          <label
            htmlFor="suffix-input"
            className="block text-sm sm:text-base font-extrabold text-slate-900 text-center"
          >
            " أدخل آخر ٧ أرقام من الرقم القومي "
          </label>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <div className="relative w-full sm:max-w-md">
              <input
                ref={inputRef}
                id="suffix-input"
                type="text"
                inputMode="numeric"
                value={suffixInput}
                onChange={handleInputChange}
                placeholder="مثال: 0102431"
                className="w-full text-center font-mono text-2xl sm:text-3xl tracking-widest font-black py-3.5 px-4 bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-tmc-navy-600 focus:ring-4 focus:ring-tmc-navy-100 focus:outline-none transition"
                autoComplete="off"
              />
              <div className="absolute left-3 top-4 text-xs font-bold text-slate-400 font-mono">
                {suffixInput.length}/7
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching || suffixInput.length !== 7}
              className="w-full sm:w-auto px-8 py-4 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-extrabold text-base rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'جاري البحث...' : 'بحث وتحقق'}</span>
            </button>
          </div>

          {searchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400">
            يدعم الأرقام باللغة العربية (٠-٩) والإنجليزية (0-9). اضغط <kbd className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">Enter</kbd> للبحث المباشر.
          </div>
        </form>
      </div>

      {/* Success Notification Banner after Check-in */}
      {successInfo && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 shadow-md text-emerald-950 animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-full flex-shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                تم تسجيل الدخول والتسكين بنجاح
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                {successInfo.guestName}
              </h3>
              
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="bg-white border-2 border-emerald-400 px-4 py-2 rounded-lg font-black text-lg text-emerald-900 shadow-sm flex items-center gap-2">
                  <Bus className="w-5 h-5 text-emerald-600" />
                  <span>أتوبيس رقم [ {successInfo.busNumber} ]</span>
                </div>

                <div className="bg-white border-2 border-emerald-400 px-4 py-2 rounded-lg font-black text-lg text-emerald-900 shadow-sm flex items-center gap-2">
                  <Hash className="w-5 h-5 text-emerald-600" />
                  <span>المقعد رقم [ {successInfo.seatNumber} ]</span>
                </div>
              </div>

              {successInfo.isBusNowFull && (
                <div className="mt-3 p-3 bg-amber-100 border border-amber-400 rounded-lg text-amber-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    اكتملت سعة الأتوبيس رقم {successInfo.busNumber} بالكامل (36 مقعداً). يرجى توجيه المشرف لتسجيل قائد الأتوبيس.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Single Guest Match Card */}
      {selectedGuest && (
        <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <UserCheck className="w-5 h-5 text-tmc-navy" />
              <span>بيانات المدعو المعتمدة</span>
            </div>
            <AttendanceBadge hasAttended={selectedGuest.hasAttended} />
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guest Details */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">اسم المدعو رباعي</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedGuest.fullName}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-semibold block">الرقم القومي</span>
                  <div className="mt-1">
                    <NationalIdMask
                      maskedId={selectedGuest.nationalIdMasked}
                      fullId={selectedGuest.nationalIdFull}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-semibold block">درجة القرابة</span>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {selectedGuest.relationship || (selectedGuest.isIndependent ? 'غير مرتبط بطالب' : 'غير محدد')}
                  </div>
                </div>
              </div>

              {/* Student Details & Current Allocation */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">الطالب المرتبط به</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedGuest.studentName}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-semibold block">الرقم العسكري للطالب</span>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                    {selectedGuest.studentMilitaryNumber}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-semibold block">حالة التسكين في الأتوبيس</span>
                  {selectedGuest.hasAttended && selectedGuest.busNumber ? (
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-sm font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded border border-emerald-300">
                        أتوبيس رقم {selectedGuest.busNumber} (مقعد {selectedGuest.seatNumber})
                      </span>
                      <span className="text-xs text-slate-500">
                        سُجل في:{' '}
                        {selectedGuest.checkedInAt
                          ? new Date(selectedGuest.checkedInAt).toLocaleTimeString('ar-EG')
                          : '—'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 mt-0.5 block">
                      لم يتم التسكين بعد — بانتظار تسجيل الدخول عند البوابة
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Check-in Action Bar */}
            <div className="pt-4 border-t border-slate-200">
              {selectedGuest.hasAttended ? (
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>تم تسجيل حضور هذا المدعو وتسكينه بالفعل مسبقاً. تم منع التكرار.</span>
                  </div>

                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                  >
                    بحث عن مدعو آخر
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExecuteCheckin(selectedGuest)}
                  disabled={isCheckingIn}
                  className="w-full py-4 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-lg sm:text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <UserCheck className="w-6 h-6 text-white" />
                  <span>
                    {isCheckingIn ? 'جاري التسكين وتخصيص الأتوبيس...' : 'تسجيل الدخول والتسكين الفوري'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multiple Candidates Disambiguation View */}
      {multipleCandidates.length > 0 && (
        <div className="bg-white border-2 border-amber-300 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-amber-100 px-6 py-4 border-b border-amber-200 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-800" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                تنبيه: تم العثور على أكثر من مدعو يشتركون في آخر ٧ أرقام ({multipleCandidates.length} مدعوين)
              </h3>
              <p className="text-xs text-amber-800">
                يرجى التحقق من الاسم الرباعي واسم الطالب واختيار المدعو الصحيح
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {multipleCandidates.map((c) => (
              <div
                key={c.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-900">{c.fullName}</span>
                    <AttendanceBadge hasAttended={c.hasAttended} />
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
                    <span>
                      <strong className="text-slate-700">الرقم القومي:</strong> {c.nationalIdMasked}
                    </span>
                    <span>
                      <strong className="text-slate-700">الطالب:</strong> {c.studentName}
                    </span>
                    <span>
                      <strong className="text-slate-700">الرقم العسكري:</strong> {c.studentMilitaryNumber}
                    </span>
                    <span>
                      <strong className="text-slate-700">القرابة:</strong> {c.relationship}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedGuest(c);
                    setMultipleCandidates([]);
                  }}
                  className="px-4 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 self-end sm:self-center"
                >
                  <span>اختيار هذا المدعو</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Found View */}
      {notFound && (
        <div className="bg-white border-2 border-red-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-block p-3 bg-red-100 text-red-700 rounded-full">
            <UserX className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              لم يتم العثور على المدعو
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              لا يوجد مدعو مسجل ينتهي رقمه القومي بالأرقام [{suffixInput}]. يرجى التأكد من الرقم أو إضافة المدعو فورياً.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition"
            >
              محاولة برقم آخر
            </button>
            <button
              onClick={onNavigateToAddGuest}
              className="px-5 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-tmc-gold" />
              <span>إضافة مدعو جديد الآن</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
