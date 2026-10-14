import React from 'react';
import { maskNationalId } from '../utils/nationalId';

interface ManifestItem {
  sequence: number;
  seatNumber: number;
  guestId: string;
  fullName: string;
  nationalId: string;
  relationship: string;
  studentName: string;
  studentMilitaryNumber: string;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
}

interface BusDetailsData {
  busNumber: number;
  capacity: number;
  assignedGuests: number;
  remainingSeats: number;
  status: string;
  totalManifestCount: number;
  leader?: {
    rank: string;
    fullName: string;
    phone?: string | null;
  } | null;
  manifest: ManifestItem[];
}

interface ManifestPrintViewProps {
  bus: BusDetailsData;
}

export const ManifestPrintView: React.FC<ManifestPrintViewProps> = ({ bus }) => {
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white text-black p-8 font-cairo print:p-0" dir="rtl">
      {/* Official Institutional Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          {/* Right Header */}
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800">جمهورية مصر العربية</div>
            <div className="text-sm font-bold text-slate-800">وزارة الدفاع</div>
            <div className="text-base font-extrabold text-slate-950 mt-0.5">
              الكلية العسكرية التكنولوجية
            </div>
            <div className="text-xs text-slate-600 mt-1">فرع الشئون الإدارية والأمن</div>
          </div>

          {/* Official Emblem */}
          <div className="flex flex-col items-center">
            <img
              src="/logo.jpg"
              alt="شعار الكلية العسكرية التكنولوجية"
              className="h-24 w-24 object-contain"
            />
            <div className="text-[10px] font-bold text-slate-700 tracking-wider mt-1">
              TECHNOLOGICAL MILITARY COLLEGE
            </div>
          </div>

          {/* Left Header Metadata */}
          <div className="text-left text-xs space-y-1">
            <div>
              <span className="font-bold">تاريخ الطباعة: </span>
              <span>{printDate}</span>
            </div>
            <div>
              <span className="font-bold">الرقم المرجعي: </span>
              <span className="font-mono">TMC-BUS-{String(bus.busNumber).padStart(2, '0')}</span>
            </div>
            <div>
              <span className="font-bold">حالة الكشف: </span>
              <span className="font-semibold">
                {bus.leader && bus.assignedGuests >= 36 ? 'كشف نهائي معتمد' : 'كشف تشغيلي'}
              </span>
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="mt-4 text-center border-t border-slate-300 pt-3">
          <h2 className="text-xl font-black text-slate-950 tracking-wide">
            كشف توزيع وتسكين المدعوين — حفل تخرج طلبة الكلية
          </h2>
          <div className="mt-1 inline-block bg-slate-100 border border-slate-400 px-6 py-1 rounded font-bold text-base text-slate-900">
            أتوبيس رقم [ {bus.busNumber} ]
          </div>
        </div>
      </div>

      {/* Bus Operational Meta Summary */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-300 p-3 rounded text-xs mb-6 text-center">
        <div>
          <span className="text-slate-500 block">سعة المدعوين المقررة</span>
          <span className="font-bold text-slate-900 text-sm">36 مقعداً</span>
        </div>
        <div>
          <span className="text-slate-500 block">عدد المدعوين المسجلين</span>
          <span className="font-bold text-slate-900 text-sm">{bus.assignedGuests} مدعو</span>
        </div>
        <div>
          <span className="text-slate-500 block">المقاعد المتبقية</span>
          <span className="font-bold text-slate-900 text-sm">{bus.remainingSeats} مقعد</span>
        </div>
        <div>
          <span className="text-slate-500 block">إجمالي ركاب الأتوبيس</span>
          <span className="font-bold text-slate-900 text-sm">
            {bus.totalManifestCount} فرداً {bus.leader ? '(بما فيهم القائد)' : ''}
          </span>
        </div>
      </div>

      {/* Official Passenger Manifest Table */}
      <table className="w-full text-right border-collapse border border-slate-400 text-xs mb-6">
        <thead>
          <tr className="bg-slate-200 border-b border-slate-400 font-bold text-slate-900">
            <th className="border border-slate-400 p-2 w-10 text-center">م</th>
            <th className="border border-slate-400 p-2 w-16 text-center">المقعد</th>
            <th className="border border-slate-400 p-2">اسم المدعو رباعي</th>
            <th className="border border-slate-400 p-2 w-32 font-mono text-center">الرقم القومي</th>
            <th className="border border-slate-400 p-2">اسم الطالب المرتبط به</th>
            <th className="border border-slate-400 p-2 w-24 text-center">الرقم العسكري</th>
            <th className="border border-slate-400 p-2 w-20 text-center">القرابة</th>
            <th className="border border-slate-400 p-2 w-24 text-center">وقت الحضور</th>
          </tr>
        </thead>
        <tbody>
          {bus.manifest.length > 0 ? (
            bus.manifest.map((guest, idx) => (
              <tr
                key={guest.guestId}
                className={`border-b border-slate-300 ${
                  idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                }`}
              >
                <td className="border border-slate-300 p-1.5 text-center font-bold">
                  {guest.sequence}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-800">
                  {guest.seatNumber}
                </td>
                <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                  {guest.fullName}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono">
                  {guest.nationalId}
                </td>
                <td className="border border-slate-300 p-1.5 text-slate-800">
                  {guest.studentName}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono font-semibold">
                  {guest.studentMilitaryNumber}
                </td>
                <td className="border border-slate-300 p-1.5 text-center">
                  {guest.relationship}
                </td>
                <td className="border border-slate-300 p-1.5 text-center text-[10px] text-slate-600">
                  {guest.checkedInAt
                    ? new Date(guest.checkedInAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={8}
                className="border border-slate-300 p-6 text-center text-slate-500 font-semibold"
              >
                لا يوجد مدعوون مسجلون في هذا الأتوبيس حتى الآن
              </td>
            </tr>
          )}

          {/* Section: Bus Leader (Distinct 37th person entry) */}
          <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold">
            <td className="border border-slate-400 p-2 text-center bg-slate-200">
              ★
            </td>
            <td className="border border-slate-400 p-2 text-center font-semibold text-tmc-navy">
              المقدمة
            </td>
            <td className="border border-slate-400 p-2 text-slate-950 font-black">
              {bus.leader
                ? `قائد الأتوبيس: ${bus.leader.rank} / ${bus.leader.fullName}`
                : 'قائد الأتوبيس: (لم يتم تسجيل القائد حتى الآن)'}
            </td>
            <td className="border border-slate-400 p-2 text-center font-mono">
              {bus.leader?.phone ? `هاتف: ${bus.leader.phone}` : '—'}
            </td>
            <td colSpan={2} className="border border-slate-400 p-2 text-center text-slate-700">
              المسؤول الأمني والإداري عن الأتوبيس
            </td>
            <td colSpan={2} className="border border-slate-400 p-2 text-center text-slate-700 font-mono">
              معتمد رسمياً
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bus Leader Detailed Card (if registered) */}
      <div className="bg-slate-50 border border-slate-300 rounded p-4 mb-8 text-xs">
        <div className="font-bold text-slate-900 text-sm mb-2 border-b border-slate-200 pb-1">
          بيانات قائد الأتوبيس المعتمد
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 block">الرتبة العسكرية:</span>
            <span className="font-bold text-slate-900 text-sm">{bus.leader?.rank || 'غير محدد'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">الاسم الكامل:</span>
            <span className="font-bold text-slate-900 text-sm">{bus.leader?.fullName || 'غير مسجل'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">رقم هاتف الطوارئ:</span>
            <span className="font-bold text-slate-900 text-sm font-mono">{bus.leader?.phone || '—'}</span>
          </div>
        </div>
      </div>

      {/* Official Signatures Section */}
      <div className="page-break-inside-avoid mt-8 pt-4 border-t-2 border-slate-400">
        <div className="grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-900">
          <div>
            <p className="mb-12">توقيع قائد الأتوبيس</p>
            <p className="border-t border-dotted border-slate-500 pt-1 font-normal text-slate-600">
              {bus.leader ? `${bus.leader.rank} / ${bus.leader.fullName}` : 'الاسم والتوقيع'}
            </p>
          </div>
          <div>
            <p className="mb-12">توقيع ضابط أمن الحفل</p>
            <p className="border-t border-dotted border-slate-500 pt-1 font-normal text-slate-600">
              الاسم والتوقيع
            </p>
          </div>
          <div>
            <p className="mb-12">يعتمد، مدير الكلية العسكرية التكنولوجية</p>
            <p className="border-t border-dotted border-slate-500 pt-1 font-normal text-slate-600">
              الخاتم والتوقيع الرسمي
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
