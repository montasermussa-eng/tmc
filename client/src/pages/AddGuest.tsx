import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  UserCheck,
  Calendar,
  MapPin,
  HelpCircle,
  Users,
  Trash2,
  GraduationCap,
  Bus,
  RefreshCw,
  Undo2,
  X,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import {
  validateEgyptianNationalId,
  normalizeNumerals,
} from '../utils/nationalId';
import { NationalIdMask } from '../components/NationalIdMask';

interface AddGuestProps {
  onSuccessNavigate?: (tab: string) => void;
}

export const AddGuest: React.FC<AddGuestProps> = ({ onSuccessNavigate }) => {
  // Mode selection: 'add' or 'delete'
  const [activeTab, setActiveTab] = useState<'add' | 'delete'>('add');

  // ==================== ADD GUEST STATE ====================
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [isRelatedToStudent, setIsRelatedToStudent] = useState(true);
  const [militaryNumber, setMilitaryNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState('');
  const [relationship, setRelationship] = useState('');
  const [relationships, setRelationships] = useState<{ id: number; name: string }[]>([]);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState<string | null>(null);

  // ==================== DELETE GUEST STATE ====================
  const [deleteSearchMode, setDeleteSearchMode] = useState<'national-id' | 'military-number'>('national-id');

  // 1. National ID Suffix Search
  const [suffixInput, setSuffixInput] = useState('');
  const [isSearchingSuffix, setIsSearchingSuffix] = useState(false);
  const [suffixSearchError, setSuffixSearchError] = useState('');
  const [foundGuest, setFoundGuest] = useState<any | null>(null);
  const [multipleCandidates, setMultipleCandidates] = useState<any[]>([]);

  // 2. Student Search
  const [studentQuery, setStudentQuery] = useState('');
  const [isSearchingStudentQuery, setIsSearchingStudentQuery] = useState(false);
  const [studentQueryResult, setStudentQueryResult] = useState<any[] | null>(null);
  const [studentQueryError, setStudentQueryError] = useState('');

  // Delete Action Status
  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadRelationships();
  }, []);

  const loadRelationships = async () => {
    try {
      const res = await apiRequest<{ relationships: { id: number; name: string }[] }>('/settings');
      setRelationships(res.relationships);
      if (res.relationships.length > 0) {
        setRelationship(res.relationships[0].name);
      }
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  };

  // Real-time National ID validation for Adding
  const idValidation = nationalId ? validateEgyptianNationalId(nationalId) : null;

  // Search student when military number is entered (Add mode)
  const handleStudentLookup = async () => {
    const cleanMil = normalizeNumerals(militaryNumber);
    if (!cleanMil) {
      setStudentSearchError('يرجى إدخال الرقم العسكري للطالب');
      setStudentName('');
      return;
    }

    setIsSearchingStudent(true);
    setStudentSearchError('');
    try {
      const res = await apiRequest<{
        found: boolean;
        message?: string;
        student?: { id: number; fullName: string; militaryNumber: string };
      }>(`/students/lookup/${cleanMil}`);

      if (res.found && res.student) {
        setStudentName(res.student.fullName);
        setStudentSearchError('');
      } else {
        setStudentName('');
        setStudentSearchError(`لم يتم العثور على طالب بالرقم العسكري [${cleanMil}]`);
      }
    } catch (err: any) {
      setStudentName('');
      setStudentSearchError(err.message || 'فشل الاستعلام عن الطالب');
    } finally {
      setIsSearchingStudent(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setCreatedSuccess(null);

    // Validation
    if (!fullName.trim()) {
      setSubmitError('يرجى إدخال اسم المدعو رباعياً');
      return;
    }

    if (!idValidation || !idValidation.isValid) {
      setSubmitError(idValidation?.error || 'الرقم القومي غير صالح');
      return;
    }

    if (isRelatedToStudent) {
      if (!militaryNumber.trim() || !studentName) {
        setSubmitError('يرجى إدخال الرقم العسكري والتحقق من وجود الطالب في المنظومة');
        return;
      }
      if (!relationship) {
        setSubmitError('يرجى تحديد درجة القرابة للطالب');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        guest: any;
      }>('/guests', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          nationalId: normalizeNumerals(nationalId),
          isRelatedToStudent,
          militaryNumber: isRelatedToStudent ? normalizeNumerals(militaryNumber) : undefined,
          relationship: isRelatedToStudent ? relationship : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      setCreatedSuccess(res.message);

      // Reset form
      setFullName('');
      setNationalId('');
      setMilitaryNumber('');
      setStudentName('');
      setNotes('');
    } catch (err: any) {
      setSubmitError(err.message || 'فشل تسجيل المدعو');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== DELETE GUEST HANDLERS ====================
  const handleSuffixSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeNumerals(suffixInput.trim());
    if (clean.length !== 7) {
      setSuffixSearchError('يرجى إدخال ٧ أرقام بالضبط');
      return;
    }

    setIsSearchingSuffix(true);
    setSuffixSearchError('');
    setFoundGuest(null);
    setMultipleCandidates([]);
    setDeleteSuccess(null);
    setDeleteError(null);

    try {
      const res = await apiRequest<{
        matchesCount: number;
        guest?: any;
        multipleMatches?: boolean;
        candidates?: any[];
        message?: string;
      }>(`/checkin/search?suffix=${clean}`);

      if (res.matchesCount === 0) {
        setSuffixSearchError(`لم يتم العثور على أي مدعو ينتهي رقمه القومي بـ [${clean}]`);
      } else if (res.matchesCount === 1 && res.guest) {
        setFoundGuest(res.guest);
      } else if (res.multipleMatches && res.candidates) {
        setMultipleCandidates(res.candidates);
      }
    } catch (err: any) {
      setSuffixSearchError(err.message || 'فشل البحث عن المدعو');
    } finally {
      setIsSearchingSuffix(false);
    }
  };

  const handleStudentQuerySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = studentQuery.trim();
    if (!clean) {
      setStudentQueryError('يرجى إدخال الرقم العسكري للطالب أو اسمه');
      return;
    }

    setIsSearchingStudentQuery(true);
    setStudentQueryError('');
    setStudentQueryResult(null);
    setDeleteSuccess(null);
    setDeleteError(null);

    try {
      const res = await apiRequest<{
        found: boolean;
        studentsCount?: number;
        students?: any[];
        message?: string;
      }>(`/checkin/student-search?query=${encodeURIComponent(clean)}`);

      if (!res.found || !res.students || res.students.length === 0) {
        setStudentQueryError(res.message || `لم يتم العثور على طالب يطابق [${clean}]`);
      } else {
        setStudentQueryResult(res.students);
      }
    } catch (err: any) {
      setStudentQueryError(err.message || 'فشل البحث عن الطالب');
    } finally {
      setIsSearchingStudentQuery(false);
    }
  };

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    const confirmed = window.confirm(
      `هل أنت متأكد تماماً من رغبتك في حذف واستبعاد المدعو:\n\n[ ${guestName} ]\n\nنهائياً من قاعدة بيانات المنظومة؟\n(ملاحظة: سيتم إخلاء مقعده وتحديث كشف الأتوبيس تلقائياً إن كان مسكناً)`
    );
    if (!confirmed) return;

    setDeletingGuestId(guestId);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        `/guests/${guestId}`,
        { method: 'DELETE' }
      );

      setDeleteSuccess(res.message || `تم بنجاح حذف واستبعاد المدعو (${guestName}) من المنظومة.`);

      if (foundGuest && foundGuest.id === guestId) {
        setFoundGuest(null);
      }
      setMultipleCandidates((prev) => prev.filter((g) => g.id !== guestId));

      if (studentQueryResult) {
        handleStudentQuerySearch();
      }
    } catch (err: any) {
      console.error('Delete guest error:', err);
      setDeleteError(err.message || 'فشل حذف واستبعاد المدعو');
    } finally {
      setDeletingGuestId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title & Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
            <span>إدارة وتعديل كشوف المدعوين</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إضافة مدعوين جدد يدوياً أو استبعاد وحذف مدعوين مسجلين من قاعدة البيانات
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('add');
              setDeleteSuccess(null);
              setDeleteError(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === 'add'
                ? 'bg-tmc-navy text-white shadow-md'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserPlus className="w-4 h-4 text-tmc-gold" />
            <span>إضافة مدعو جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('delete');
              setCreatedSuccess(null);
              setSubmitError('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === 'delete'
                ? 'bg-red-700 text-white shadow-md'
                : 'bg-white border border-slate-300 text-red-700 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>استبعاد / حذف مدعو</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ADD NEW GUEST FORM                                                */}
      {/* ========================================================================= */}
      {activeTab === 'add' && (
        <div className="space-y-6">
          {createdSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-5 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">تم حفظ بيانات المدعو بنجاح</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    المدعو مسجل الآن في حالة "لم يحضر" وجاهز لتسجيل الدخول الفوري عند البوابة.
                  </p>
                </div>
              </div>

              {onSuccessNavigate && (
                <button
                  onClick={() => onSuccessNavigate('fast-checkin')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition self-end sm:self-center"
                >
                  الانتقال لتسجيل الدخول عند البوابة
                </button>
              )}
            </div>
          )}

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Registration Form Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleAddSubmit} className="space-y-6">
              {/* Guest Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المدعو رباعي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: عبد الرحيم محمود إبراهيم الدسوقي"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                  required
                />
              </div>

              {/* National ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الرقم القومي (14 رقماً) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  value={nationalId}
                  onChange={(e) => setNationalId(normalizeNumerals(e.target.value))}
                  placeholder="مثال: 29803120101915"
                  className="w-full bg-slate-50 font-mono tracking-wider border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                  required
                />

                {/* Live National ID Metadata Preview */}
                {nationalId && (
                  <div className="mt-2 p-3 rounded-lg text-xs transition-all border">
                    {idValidation?.isValid && idValidation.details ? (
                      <div className="bg-emerald-50 border-emerald-200 text-emerald-900 flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          الرقم القومي صالح
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          الميلاد: {idValidation.details.birthDate} ({idValidation.details.age} سنة)
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          المحافظة: {idValidation.details.governorate}
                        </span>
                        <span>النوع: {idValidation.details.gender}</span>
                      </div>
                    ) : (
                      <div className="bg-red-50 border-red-200 text-red-800 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{idValidation?.error || 'الرقم القومي غير مكتمل'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Relation to Student Switch */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <span className="block text-xs font-bold text-slate-700">
                  هل المدعو تابع لأحد الطلبة الخريجين؟
                </span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="relation-type"
                      checked={isRelatedToStudent}
                      onChange={() => setIsRelatedToStudent(true)}
                      className="w-4 h-4 text-tmc-navy focus:ring-tmc-navy-500"
                    />
                    <span>نعم — مدعو مرتبط بطالب خريج</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="relation-type"
                      checked={!isRelatedToStudent}
                      onChange={() => {
                        setIsRelatedToStudent(false);
                        setMilitaryNumber('');
                        setStudentName('');
                        setStudentSearchError('');
                      }}
                      className="w-4 h-4 text-tmc-navy focus:ring-tmc-navy-500"
                    />
                    <span>لا — مدعو عام / ضيف شرف مستقل</span>
                  </label>
                </div>

                {isRelatedToStudent && (
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                    {/* Student Military Number Lookup */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        الرقم العسكري للطالب <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={militaryNumber}
                          onChange={(e) => {
                            setMilitaryNumber(normalizeNumerals(e.target.value));
                            setStudentName('');
                          }}
                          placeholder="مثال: 12345"
                          className="w-full bg-white font-mono border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleStudentLookup}
                          disabled={isSearchingStudent || !militaryNumber}
                          className="px-3 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>تحقق</span>
                        </button>
                      </div>

                      {studentName && (
                        <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>الطالب: {studentName}</span>
                        </div>
                      )}

                      {studentSearchError && (
                        <div className="mt-2 text-xs text-red-700 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{studentSearchError}</span>
                        </div>
                      )}
                    </div>

                    {/* Relationship Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        درجة القرابة بالطالب <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                      >
                        {relationships.map((rel) => (
                          <option key={rel.id} value={rel.name}>
                            {rel.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ملاحظات إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات أو تصاريح خاصة..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !fullName || !idValidation?.isValid}
                  className="w-full py-3.5 bg-tmc-navy hover:bg-tmc-navy-700 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5 text-tmc-gold" />
                  <span>{isSubmitting ? 'جاري التحقق والحفظ...' : 'حفظ وتسجيل المدعو في المنظومة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DELETE / REMOVE GUEST FROM SYSTEM                                 */}
      {/* ========================================================================= */}
      {activeTab === 'delete' && (
        <div className="space-y-6">
          {/* Success / Error Feedback */}
          {deleteSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 text-emerald-950 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-sm">{deleteSuccess}</span>
              </div>
              <button
                onClick={() => setDeleteSuccess(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold p-1"
              >
                ✕
              </button>
            </div>
          )}

          {deleteError && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 text-red-950 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="font-bold text-sm">{deleteError}</span>
              </div>
              <button
                onClick={() => setDeleteError(null)}
                className="text-red-700 hover:text-red-950 font-bold p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Delete Search Mode Toggle */}
          <div className="flex bg-slate-200 p-1.5 rounded-xl gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDeleteSearchMode('national-id');
                setDeleteError(null);
                setDeleteSuccess(null);
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                deleteSearchMode === 'national-id'
                  ? 'bg-tmc-navy text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <Search className="w-4 h-4 text-tmc-gold" />
              <span>البحث بآخر ٧ أرقام في الرقم القومي للمدعو</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteSearchMode('military-number');
                setDeleteError(null);
                setDeleteSuccess(null);
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                deleteSearchMode === 'military-number'
                  ? 'bg-tmc-navy text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-tmc-gold" />
              <span>البحث بالرقم العسكري للطالب (عرض مدعويه)</span>
            </button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SEARCH MODE A: National ID Suffix                             */}
          {/* ------------------------------------------------------------- */}
          {deleteSearchMode === 'national-id' && (
            <div className="space-y-6">
              <div className="bg-white border-2 border-red-200 rounded-xl p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleSuffixSearch} className="space-y-4">
                  <label className="block text-sm sm:text-base font-extrabold text-slate-900 text-center">
                    " أدخل آخر ٧ أرقام من الرقم القومي للمدعو المراد حذفه "
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                    <div className="relative w-full sm:max-w-md">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={7}
                        value={suffixInput}
                        onChange={(e) => setSuffixInput(normalizeNumerals(e.target.value))}
                        placeholder="مثال: 0102431"
                        className="w-full text-center font-mono text-2xl sm:text-3xl tracking-widest font-black py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-100 focus:outline-none transition"
                        autoComplete="off"
                      />
                      <div className="absolute left-3 top-3.5 text-xs font-bold text-slate-400 font-mono">
                        {suffixInput.length}/7
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSearchingSuffix || suffixInput.length !== 7}
                      className="w-full sm:w-auto px-8 py-3.5 bg-red-700 hover:bg-red-800 text-white font-extrabold text-base rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Search className={`w-5 h-5 ${isSearchingSuffix ? 'animate-spin' : ''}`} />
                      <span>{isSearchingSuffix ? 'جاري البحث...' : 'بحث عن المدعو'}</span>
                    </button>
                  </div>

                  {suffixSearchError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{suffixSearchError}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Multiple Candidates Disambiguation */}
              {multipleCandidates.length > 0 && (
                <div className="bg-white border-2 border-amber-300 rounded-xl overflow-hidden shadow-md">
                  <div className="bg-amber-100 px-6 py-3 border-b border-amber-200 font-bold text-amber-950 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-700" />
                    <span>تم العثور على أكثر من مدعو يشتركون في آخر ٧ أرقام ({multipleCandidates.length} مدعوين):</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {multipleCandidates.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                      >
                        <div>
                          <div className="text-base font-black text-slate-900">{c.fullName}</div>
                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                            <span>الرقم القومي: {c.nationalIdMasked}</span>
                            <span>•</span>
                            <span>القرابة: {c.relationship}</span>
                            <span>•</span>
                            <span>الطالب: {c.studentName} ({c.studentMilitaryNumber})</span>
                          </div>
                          <div className="mt-1.5">
                            {c.hasAttended ? (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                حاضر — أتوبيس {c.busNumber} (مقعد {c.seatNumber})
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                لم يحضر بعد
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteGuest(c.id, c.fullName)}
                          disabled={deletingGuestId === c.id}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50 self-end sm:self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{deletingGuestId === c.id ? 'جاري الحذف...' : 'حذف هذا المدعو'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Found Guest Card */}
              {foundGuest && (
                <div className="bg-white border-2 border-red-300 rounded-xl overflow-hidden shadow-lg animate-fadeIn">
                  <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between">
                    <span className="font-black text-sm text-red-950 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-700" />
                      <span>بيانات المدعو المراد استبعاده وحذفه</span>
                    </span>
                    {foundGuest.hasAttended ? (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
                        حاضر ومُسكّن في أتوبيس [{foundGuest.busNumber}]
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full">
                        لم يحضر بعد
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block">اسم المدعو رباعي</span>
                        <span className="text-base font-black text-slate-900 mt-1 block">
                          {foundGuest.fullName}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block">الرقم القومي</span>
                        <span className="text-base font-mono font-bold text-slate-800 mt-1 block">
                          {foundGuest.nationalIdMasked}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block">الطالب المرتبط به</span>
                        <span className="text-sm font-bold text-slate-900 mt-1 block">
                          {foundGuest.studentName} ({foundGuest.studentMilitaryNumber})
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block">درجة القرابة</span>
                        <span className="text-sm font-bold text-slate-900 mt-1 block">
                          {foundGuest.relationship}
                        </span>
                      </div>
                    </div>

                    {foundGuest.hasAttended && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          تنبيه: هذا المدعو مُسكّن حالياً في أتوبيس رقم [{foundGuest.busNumber}] المقعد [{foundGuest.seatNumber}]. عند حذفه سيتم إخلاء مقعده وإعادة ترتيب ركاب الأتوبيس تلقائياً.
                        </span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteGuest(foundGuest.id, foundGuest.fullName)}
                        disabled={deletingGuestId === foundGuest.id}
                        className="w-full py-4 bg-red-700 hover:bg-red-800 text-white font-black text-base rounded-xl shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>
                          {deletingGuestId === foundGuest.id
                            ? 'جاري الحذف والاستبعاد...'
                            : `تأكيد حذف واستبعاد المدعو (${foundGuest.fullName}) نهائياً`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SEARCH MODE B: Student Military Number                        */}
          {/* ------------------------------------------------------------- */}
          {deleteSearchMode === 'military-number' && (
            <div className="space-y-6">
              <div className="bg-white border-2 border-red-200 rounded-xl p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleStudentQuerySearch} className="space-y-4">
                  <label className="block text-sm sm:text-base font-extrabold text-slate-900 text-center">
                    " أدخل الرقم العسكري للطالب أو اسمه لعرض مدعويه "
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                    <div className="relative w-full sm:max-w-md">
                      <input
                        type="text"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        placeholder="مثال: 10423 أو أحمد محمد"
                        className="w-full text-center font-bold text-lg sm:text-xl py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-red-600 focus:ring-4 focus:ring-red-100 focus:outline-none transition"
                        autoComplete="off"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearchingStudentQuery || !studentQuery.trim()}
                      className="w-full sm:w-auto px-8 py-3.5 bg-red-700 hover:bg-red-800 text-white font-extrabold text-base rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Search className={`w-5 h-5 ${isSearchingStudentQuery ? 'animate-spin' : ''}`} />
                      <span>{isSearchingStudentQuery ? 'جاري البحث...' : 'بحث عن الطالب'}</span>
                    </button>
                  </div>

                  {studentQueryError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{studentQueryError}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Student Query Results */}
              {studentQueryResult && studentQueryResult.length > 0 && (
                <div className="space-y-6">
                  {studentQueryResult.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-md"
                    >
                      {/* Student Profile Header */}
                      <div className="bg-slate-100 px-6 py-4 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-tmc-navy text-tmc-gold flex items-center justify-center font-bold shadow-inner">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-base font-black text-slate-900">{st.fullName}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              الرقم العسكري: {st.militaryNumber}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-white border border-slate-300 px-3 py-1 rounded-lg text-slate-700">
                            إجمالي المدعوين: {st.totalGuests}
                          </span>
                        </div>
                      </div>

                      {/* Student's Guests List */}
                      {st.guests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                          لا يوجد مدعوون مسجلون لهذا الطالب حالياً.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {st.guests.map((g: any) => (
                            <div
                              key={g.id}
                              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                            >
                              <div className="space-y-1">
                                <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                                  <span>{g.fullName}</span>
                                  <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-normal">
                                    {g.relationship}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                  الرقم القومي: {g.nationalIdMasked}
                                </div>
                                <div>
                                  {g.hasAttended ? (
                                    <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                      حاضر — أتوبيس {g.busNumber} (مقعد {g.seatNumber})
                                    </span>
                                  ) : (
                                    <span className="text-[10.5px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                      لم يحضر بعد
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteGuest(g.id, g.fullName)}
                                disabled={deletingGuestId === g.id}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50 self-end sm:self-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{deletingGuestId === g.id ? 'جاري الحذف...' : 'حذف واستبعاد'}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
