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
} from 'lucide-react';
import { apiRequest } from '../api/client';
import {
  validateEgyptianNationalId,
  normalizeNumerals,
} from '../utils/nationalId';

interface AddGuestProps {
  onSuccessNavigate?: (tab: string) => void;
}

export const AddGuest: React.FC<AddGuestProps> = ({ onSuccessNavigate }) => {
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

  // Real-time National ID validation
  const idValidation = nationalId ? validateEgyptianNationalId(nationalId) : null;

  // Search student when military number is entered
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

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-black text-tmc-navy flex items-center gap-2">
          <span>تسجيل وإضافة مدعو جديد</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-semibold">
            إضافة يدوية موثقة
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          تسجيل ضيف غير مدرج في كشوف الإكسيل المستوردة وربطه بالطالب أو تسجيله كمدعو مستقل
        </p>
      </div>

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

      {/* Main Registration Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
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
                    <span>
                      <strong>تاريخ الميلاد:</strong> {idValidation.details.birthDate} ({idValidation.details.age} سنة)
                    </span>
                    <span>
                      <strong>المحافظة:</strong> {idValidation.details.governorate}
                    </span>
                    <span>
                      <strong>النوع:</strong> {idValidation.details.gender}
                    </span>
                  </div>
                ) : (
                  <div className="bg-red-50 border-red-200 text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    <span>{idValidation?.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Relationship Radio Button */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              هل المدعو قريب لأحد الطلبة الخريجين؟
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="radio"
                  name="isRelated"
                  checked={isRelatedToStudent}
                  onChange={() => setIsRelatedToStudent(true)}
                  className="w-4 h-4 text-tmc-navy focus:ring-tmc-navy-500"
                />
                <span>نعم — مرتبط بطالب خريج</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="radio"
                  name="isRelated"
                  checked={!isRelatedToStudent}
                  onChange={() => {
                    setIsRelatedToStudent(false);
                    setMilitaryNumber('');
                    setStudentName('');
                    setStudentSearchError('');
                  }}
                  className="w-4 h-4 text-tmc-navy focus:ring-tmc-navy-500"
                />
                <span>لا — مدعو مستقل (غير مرتبط بطالب)</span>
              </label>
            </div>
          </div>

          {/* Conditional Fields if Related to Student */}
          {isRelatedToStudent && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Military Number & Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                      placeholder="أدخل الرقم العسكري"
                      className="w-full bg-white font-mono border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleStudentLookup}
                      disabled={isSearchingStudent || !militaryNumber}
                      className="px-3 py-2 bg-tmc-navy hover:bg-tmc-navy-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isSearchingStudent ? 'جاري...' : 'استعلام'}</span>
                    </button>
                  </div>

                  {studentSearchError && (
                    <div className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{studentSearchError}</span>
                    </div>
                  )}
                </div>

                {/* Auto-populated Student Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الطالب (آلي من قاعدة البيانات)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={studentName}
                    placeholder="سيظهر الاسم تلقائياً بعد الاستعلام"
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Relationship dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  درجة القرابة للطالب <span className="text-red-500">*</span>
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
                  required={isRelatedToStudent}
                >
                  <option value="">-- اختر درجة القرابة --</option>
                  {relationships.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات أو تصاريح خاصة..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-tmc-navy-500 focus:outline-none"
            />
          </div>

          {/* Notice */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
            <span className="font-bold text-tmc-navy">قاعدة بيانات المنظومة:</span> إضافة المدعو هنا تسجله في قاعدة البيانات كمدعو "لم يحضر بعد". سيتم تسكينه تلقائياً في الأتوبيس الشاغر التالي لحظة تسجيل دخوله الفعلي عبر شاشة البوابة.
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
  );
};
