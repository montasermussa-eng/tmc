import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Users,
  GraduationCap,
  CheckSquare,
  Square,
  Check,
  CreditCard,
  Clock,
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

interface StudentGuestItem {
  id: string;
  fullName: string;
  nationalIdMasked: string;
  relationship: string;
  hasAttended: boolean;
  checkedInAt?: string | null;
  busNumber?: number | null;
  seatNumber?: number | null;
}

interface StudentSearchResult {
  id: number;
  militaryNumber: string;
  fullName: string;
  totalGuests: number;
  attendedGuests: number;
  absentGuests: number;
  guests: StudentGuestItem[];
}

interface BatchResultItem {
  guestId: string;
  guestName: string;
  success: boolean;
  alreadyCheckedIn: boolean;
  busNumber: number;
  seatNumber: number;
  message: string;
}

interface FastCheckinProps {
  onNavigateToAddGuest: () => void;
}

export const FastCheckin: React.FC<FastCheckinProps> = ({ onNavigateToAddGuest }) => {
  // Mode: 'national-id' | 'military-number'
  const [searchMode, setSearchMode] = useState<'national-id' | 'military-number'>('national-id');

  // --- Mode 1: 7-digit National ID State ---
  const [suffixInput, setSuffixInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [searchError, setSearchError] = useState('');
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

  // --- Mode 2: Student Military Number State ---
  const [militaryInput, setMilitaryInput] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [studentCandidates, setStudentCandidates] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isBatchCheckingIn, setIsBatchCheckingIn] = useState(false);
  const [batchSuccessInfo, setBatchSuccessInfo] = useState<{
    successfulCount: number;
    totalRequested: number;
    results: BatchResultItem[];
    busFullAlert: boolean;
    fullBusNumber: number;
    message: string;
  } | null>(null);

  // --- Live Attendance Stats ---
  const [stats, setStats] = useState<{ totalGuests: number; attendedGuests: number; absentGuests: number } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiRequest<{ totalGuests: number; attendedGuests: number; absentGuests: number }>('/checkin/stats');
      setStats(res);
    } catch {
      // Silently fail — stats are supplementary
    }
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const militaryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchMode === 'national-id') {
      inputRef.current?.focus();
    } else {
      militaryInputRef.current?.focus();
    }
  }, [searchMode]);

  // Fetch stats on mount and every 15 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // --- Handlers for Mode 1: 7-digit National ID ---
  const handleSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeNumerals(raw);
    if (normalized.length <= 7) {
      setSuffixInput(normalized);
      setSearchError('');
    }
  };

  const handleSuffixSearch = async (e?: React.FormEvent) => {
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

      // Refresh stats after successful check-in
      fetchStats();

      setSuccessInfo({
        message: res.message,
        busNumber: res.busNumber,
        seatNumber: res.seatNumber,
        guestName: guest.fullName,
        isBusNowFull: res.isBusNowFull,
        requiresLeader: res.requiresLeader,
      });

      setSelectedGuest({
        ...guest,
        hasAttended: true,
        busNumber: res.busNumber,
        seatNumber: res.seatNumber,
        checkedInAt: new Date().toISOString(),
      });

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

  // --- Handlers for Mode 2: Student Military Number ---
  const handleMilitaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeNumerals(raw);
    setMilitaryInput(normalized);
    setStudentError('');
  };

  const handleStudentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizeNumerals(militaryInput).trim();

    if (!clean) {
      setStudentError('يرجى إدخال الرقم العسكري للطالب أو اسمه');
      return;
    }

    setIsSearchingStudent(true);
    setStudentError('');
    setSelectedStudent(null);
    setStudentCandidates([]);
    setStudentNotFound(false);
    setSelectedGuestIds(new Set());
    setBatchSuccessInfo(null);

    try {
      const res = await apiRequest<{
        found: boolean;
        studentsCount: number;
        students: StudentSearchResult[];
        message?: string;
      }>(`/checkin/student-search?query=${encodeURIComponent(clean)}`);

      if (!res.found || res.students.length === 0) {
        setStudentNotFound(true);
      } else if (res.students.length === 1) {
        setSelectedStudent(res.students[0]);
      } else {
        setStudentCandidates(res.students);
      }
    } catch (err: any) {
      setStudentError(err.message || 'فشل البحث عن الطالب');
    } finally {
      setIsSearchingStudent(false);
    }
  };

  const handleSelectStudentCandidate = (st: StudentSearchResult) => {
    setSelectedStudent(st);
    setStudentCandidates([]);
    setSelectedGuestIds(new Set());
    setBatchSuccessInfo(null);
  };

  const toggleGuestSelection = (guestId: string, hasAttended: boolean) => {
    if (hasAttended) return; // Cannot select already-attended guests
    const newSet = new Set(selectedGuestIds);
    if (newSet.has(guestId)) {
      newSet.delete(guestId);
    } else {
      newSet.add(guestId);
    }
    setSelectedGuestIds(newSet);
  };

  const handleSelectAllUnattended = () => {
    if (!selectedStudent) return;
    const unattended = selectedStudent.guests.filter((g) => !g.hasAttended);
    if (selectedGuestIds.size === unattended.length) {
      // Deselect all
      setSelectedGuestIds(new Set());
    } else {
      // Select all unattended
      setSelectedGuestIds(new Set(unattended.map((g) => g.id)));
    }
  };

  const handleExecuteBatchCheckin = async () => {
    if (selectedGuestIds.size === 0 || !selectedStudent) return;

    setIsBatchCheckingIn(true);
    setStudentError('');

    try {
      const guestIdsArray = Array.from(selectedGuestIds);
      const res = await apiRequest<{
        success: boolean;
        totalRequested: number;
        successfulCount: number;
        results: BatchResultItem[];
        busFullAlert: boolean;
        fullBusNumber: number;
        message: string;
      }>('/checkin/batch-execute', {
        method: 'POST',
        body: JSON.stringify({ guestIds: guestIdsArray }),
      });

      // Refresh stats after batch check-in
      fetchStats();

      setBatchSuccessInfo(res);

      // Update student guest list in local state
      const resultMap = new Map(res.results.map((r) => [r.guestId, r]));
      const updatedGuests = selectedStudent.guests.map((g) => {
        const item = resultMap.get(g.id);
        if (item && item.success) {
          return {
            ...g,
            hasAttended: true,
            busNumber: item.busNumber,
            seatNumber: item.seatNumber,
            checkedInAt: new Date().toISOString(),
          };
        }
        return g;
      });

      const newAttended = updatedGuests.filter((g) => g.hasAttended).length;

      setSelectedStudent({
        ...selectedStudent,
        attendedGuests: newAttended,
        absentGuests: selectedStudent.totalGuests - newAttended,
        guests: updatedGuests,
      });

      // Clear selections
      setSelectedGuestIds(new Set());
    } catch (err: any) {
      setStudentError(err.message || 'فشل تسكين المدعوين المحددين');
    } finally {
      setIsBatchCheckingIn(false);
    }
  };

  const handleResetAll = () => {
    setSuffixInput('');
    setSelectedGuest(null);
    setMultipleCandidates([]);
    setNotFound(false);
    setSuccessInfo(null);
    setSearchError('');

    setMilitaryInput('');
    setSelectedStudent(null);
    setStudentCandidates([]);
    setStudentNotFound(false);
    setSelectedGuestIds(new Set());
    setBatchSuccessInfo(null);
    setStudentError('');

    if (searchMode === 'national-id') {
      inputRef.current?.focus();
    } else {
      militaryInputRef.current?.focus();
    }
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
              ابحث بآخر ٧ أرقام من الرقم القومي أو بالرقم العسكري للطالب لتحديد الحاضرين وتسكينهم فوراً
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-tmc-navy-800 hover:bg-tmc-navy-700 text-slate-200 text-xs font-bold rounded-lg border border-tmc-navy-600 transition shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بحث جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Attendance Counter */}
      {stats && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-2xl font-black text-slate-900">{stats.totalGuests}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-0.5">إجمالي المدعوين</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="text-2xl font-black text-emerald-700">{stats.attendedGuests}</div>
              <div className="text-[11px] font-bold text-emerald-600 mt-0.5">حضروا ✓</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="text-2xl font-black text-amber-700">{stats.absentGuests}</div>
              <div className="text-[11px] font-bold text-amber-600 mt-0.5">لم يحضروا بعد</div>
            </div>
          </div>
          {stats.totalGuests > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((stats.attendedGuests / stats.totalGuests) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-bold text-center mt-1">
                نسبة الحضور: {Math.round((stats.attendedGuests / stats.totalGuests) * 100)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dual Search Mode Switcher Tabs */}
      <div className="bg-slate-200/80 p-1.5 rounded-xl flex items-center gap-2 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setSearchMode('national-id');
            setSearchError('');
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            searchMode === 'national-id'
              ? 'bg-tmc-navy text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <CreditCard className="w-4 h-4 text-tmc-gold" />
          <span>البحث بالرقم القومي (آخر ٧ أرقام)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSearchMode('military-number');
            setStudentError('');
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            searchMode === 'military-number'
              ? 'bg-tmc-navy text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-tmc-gold" />
          <span>البحث بالرقم العسكري للطالب (تسكين عائلي)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: Search by Last 7 Digits of National ID                           */}
      {/* ========================================================================= */}
      {searchMode === 'national-id' && (
        <>
          <div className="bg-white rounded-xl border-2 border-tmc-navy-300 p-6 sm:p-8 shadow-md">
            <form onSubmit={handleSuffixSearch} className="space-y-4">
              <label
                htmlFor="suffix-input"
                className="block text-sm sm:text-base font-extrabold text-slate-900 text-center"
              >
                " أدخل آخر ٧ أرقام من الرقم القومي للمدعو "
              </label>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <div className="relative w-full sm:max-w-md">
                  <input
                    ref={inputRef}
                    id="suffix-input"
                    type="text"
                    inputMode="numeric"
                    value={suffixInput}
                    onChange={handleSuffixChange}
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

          {/* Simple Success Toast after Check-in */}
          {successInfo && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-3 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>تم التسكين — {successInfo.guestName} → أتوبيس {successInfo.busNumber} مقعد {successInfo.seatNumber}</span>
              </div>
              {successInfo.isBusNowFull && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  الأتوبيس {successInfo.busNumber} اكتمل
                </span>
              )}
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
                        onClick={handleResetAll}
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
                  onClick={handleResetAll}
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
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: Search by Student Military Number (Family Batch Check-in)       */}
      {/* ========================================================================= */}
      {searchMode === 'military-number' && (
        <>
          <div className="bg-white rounded-xl border-2 border-tmc-navy-300 p-6 sm:p-8 shadow-md">
            <form onSubmit={handleStudentSearch} className="space-y-4">
              <label
                htmlFor="military-input"
                className="block text-sm sm:text-base font-extrabold text-slate-900 text-center"
              >
                " أدخل الرقم العسكري للطالب لعرض جميع مدعويه وتسكينهم "
              </label>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <div className="relative w-full sm:max-w-md">
                  <input
                    ref={militaryInputRef}
                    id="military-input"
                    type="text"
                    value={militaryInput}
                    onChange={handleMilitaryChange}
                    placeholder="مثال: 102345 أو اسم الطالب"
                    className="w-full text-center font-mono text-xl sm:text-2xl font-black py-3.5 px-4 bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-tmc-navy-600 focus:ring-4 focus:ring-tmc-navy-100 focus:outline-none transition"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearchingStudent || !militaryInput.trim()}
                  className="w-full sm:w-auto px-8 py-4 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-extrabold text-base rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Search className={`w-5 h-5 ${isSearchingStudent ? 'animate-spin' : ''}`} />
                  <span>{isSearchingStudent ? 'جاري البحث...' : 'عرض مدعوي الطالب'}</span>
                </button>
              </div>

              {studentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{studentError}</span>
                </div>
              )}

              <div className="text-center text-[11px] text-slate-400">
                يدعم الأرقام باللغة العربية (٠-٩) أو الإنجليزية (0-9) أو كتابة اسم الطالب. اضغط <kbd className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">Enter</kbd> للبحث.
              </div>
            </form>
          </div>

          {/* Multiple Matching Students List (Disambiguation) */}
          {studentCandidates.length > 0 && (
            <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-md">
              <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-tmc-navy" />
                <span>تم العثور على أكثر من طالب يطابق البحث ({studentCandidates.length} طالب):</span>
              </div>
              <div className="divide-y divide-slate-200">
                {studentCandidates.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="text-base font-black text-slate-900">{st.fullName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span>الرقم العسكري: <strong className="font-mono text-slate-800">{st.militaryNumber}</strong></span>
                        <span>•</span>
                        <span>إجمالي المدعوين: <strong className="text-slate-800">{st.totalGuests}</strong></span>
                        <span>•</span>
                        <span className="text-emerald-700">حضر: {st.attendedGuests}</span>
                        <span>•</span>
                        <span className="text-amber-700">بانتظار الحضور: {st.absentGuests}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectStudentCandidate(st)}
                      className="px-4 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-bold text-xs rounded-lg transition self-end sm:self-center flex items-center gap-1.5"
                    >
                      <span>اختيار هذا الطالب وعرض مدعويه</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Not Found View */}
          {studentNotFound && (
            <div className="bg-white border-2 border-red-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
              <div className="inline-block p-3 bg-red-100 text-red-700 rounded-full">
                <UserX className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  لم يتم العثور على الطالب
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  لا يوجد طالب مسجل يطابق المدخل [{militaryInput}]. يرجى التحقق من الرقم العسكري للطالب.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleResetAll}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  محاولة برقم عسكري آخر
                </button>
              </div>
            </div>
          )}

          {/* Simple Batch Success Toast */}
          {batchSuccessInfo && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-3 shadow-sm animate-fadeIn space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>تم التسكين — {batchSuccessInfo.successfulCount} مدعو تم تسكينهم بنجاح</span>
                {batchSuccessInfo.busFullAlert && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 mr-auto">
                    الأتوبيس {batchSuccessInfo.fullBusNumber} اكتمل
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {batchSuccessInfo.results
                  .filter((r) => r.success)
                  .map((r) => (
                    <span key={r.guestId} className="text-[11px] font-bold bg-white border border-emerald-200 text-slate-700 px-2 py-1 rounded">
                      {r.guestName} → أتوبيس {r.busNumber} مقعد {r.seatNumber}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Selected Student Card with Guest Checklist */}
          {selectedStudent && (
            <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-lg space-y-0">
              {/* Student Header Summary */}
              <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-tmc-gold/20 border-2 border-tmc-gold flex items-center justify-center text-tmc-gold font-bold flex-shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-tmc-gold font-bold">ملف الطالب المعتمد</div>
                    <h3 className="text-lg font-black text-white">{selectedStudent.fullName}</h3>
                    <div className="text-xs text-slate-300 font-mono">
                      الرقم العسكري: <strong>{selectedStudent.militaryNumber}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block">إجمالي المدعوين</span>
                    <span className="text-base font-black text-white">{selectedStudent.totalGuests}</span>
                  </div>
                  <div className="bg-emerald-950/80 border border-emerald-700 px-3 py-1.5 rounded-lg text-center">
                    <span className="text-[10px] text-emerald-300 block">حضروا</span>
                    <span className="text-base font-black text-emerald-300">{selectedStudent.attendedGuests}</span>
                  </div>
                  <div className="bg-amber-950/80 border border-amber-700 px-3 py-1.5 rounded-lg text-center">
                    <span className="text-[10px] text-amber-300 block">لم يحضروا بعد</span>
                    <span className="text-base font-black text-amber-300">{selectedStudent.absentGuests}</span>
                  </div>
                </div>
              </div>

              {/* Guests Checklist Header */}
              <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-tmc-navy" />
                  <span>
                    المدعوون التابعون للطالب — حدد الحاضرين أمامك عند البوابة للتسكين المباشر:
                  </span>
                </div>

                {selectedStudent.absentGuests > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllUnattended}
                    className="text-xs font-bold text-tmc-navy hover:text-tmc-navy-700 underline flex items-center gap-1.5 self-end sm:self-center"
                  >
                    {selectedGuestIds.size === selectedStudent.absentGuests ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>إلغاء تحديد الكل</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-tmc-gold" />
                        <span>تحديد كل المتواجدين حالياً ({selectedStudent.absentGuests})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Guests Checklist Table / Rows */}
              <div className="divide-y divide-slate-200">
                {selectedStudent.guests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-semibold text-sm">
                    لا يوجد مدعوون مسجلون لهذا الطالب في المنظومة.
                  </div>
                ) : (
                  selectedStudent.guests.map((guest, idx) => {
                    const isSelected = selectedGuestIds.has(guest.id);
                    const isAttended = guest.hasAttended;

                    return (
                      <div
                        key={guest.id}
                        onClick={() => toggleGuestSelection(guest.id, isAttended)}
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition cursor-pointer select-none ${
                          isAttended
                            ? 'bg-emerald-50/40 cursor-default opacity-85'
                            : isSelected
                            ? 'bg-tmc-navy-50/80 border-r-4 border-tmc-navy'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          {/* Checkbox indicator */}
                          <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                            {isAttended ? (
                              <div className="h-6 w-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : isSelected ? (
                              <div className="h-6 w-6 rounded-md bg-tmc-navy text-white flex items-center justify-center shadow-sm border-2 border-tmc-navy">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-md bg-white border-2 border-slate-400 hover:border-tmc-navy flex items-center justify-center transition" />
                            )}
                          </div>

                          {/* Guest info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                              <span className="text-base font-black text-slate-900">{guest.fullName}</span>
                              <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                                {guest.relationship}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 font-mono">
                              <span>الرقم القومي: {guest.nationalIdMasked}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status / Bus Allocation Badge */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isAttended ? (
                            <div className="text-right flex flex-col sm:items-end">
                              <span className="text-xs font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                <Bus className="w-4 h-4 text-emerald-700" />
                                <span>أتوبيس رقم [ {guest.busNumber} ] — مقعد [ {guest.seatNumber} ]</span>
                              </span>
                              {guest.checkedInAt && (
                                <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>سُجل: {new Date(guest.checkedInAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-lg border transition ${
                                isSelected
                                  ? 'bg-tmc-navy text-white border-tmc-navy'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}
                            >
                              {isSelected ? '✓ محدد للتسكين الفوري' : 'لم يحضر بعد (جاهز للتسكين)'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs font-bold text-slate-700">
                  {selectedGuestIds.size > 0 ? (
                    <span className="text-tmc-navy font-black text-sm">
                      تم تحديد ({selectedGuestIds.size}) مدعو للتسكين في الأتوبيس الآن
                    </span>
                  ) : (
                    <span>اختر المدعوين الحاضرين حالياً عبر الضغط على المربعات أعلاه</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExecuteBatchCheckin}
                  disabled={selectedGuestIds.size === 0 || isBatchCheckingIn}
                  className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base rounded-xl shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserCheck className={`w-5 h-5 ${isBatchCheckingIn ? 'animate-spin' : ''}`} />
                  <span>
                    {isBatchCheckingIn
                      ? 'جاري التسكين المتسلسل في الأتوبيسات...'
                      : `تسجيل وتسكين المحدد (${selectedGuestIds.size}) في الأتوبيس الآن`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
