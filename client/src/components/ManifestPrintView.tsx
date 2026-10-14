import React from 'react';

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
  return (
    <div className="bg-white text-black p-4 font-cairo print:p-0 max-w-[210mm] mx-auto" dir="rtl">
      
      {/* 1. Centered Clean Header */}
      <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
        {/* Logo centered */}
        <div className="flex justify-center mb-1">
          <img
            src="/logo.jpg"
            alt="شعار الكلية العسكرية التكنولوجية"
            className="h-16 w-16 object-contain"
          />
        </div>

        {/* Ministry & College Name */}
        <div className="text-xs font-bold text-slate-700">
          وزارة الدفاع - الاكاديمية العسكرية المصرية
        </div>
        <h1 className="text-base font-black text-slate-950 mt-0.5">
          الكلية العسكرية التكنولوجية
        </h1>

        {/* Title */}
        <h2 className="text-sm font-extrabold text-slate-900 mt-1">
          كشف توزيع المدعوين — حفل تخرج الطلبة
        </h2>

        {/* Bus Number Pill */}
        <div className="mt-1.5 inline-block bg-slate-100 border border-slate-600 px-5 py-0.5 rounded font-black text-sm text-slate-950">
          أتوبيس رقم [ {bus.busNumber} ]
        </div>

        {/* One-line operational summary */}
        <div className="text-[10px] text-slate-600 mt-1.5 flex items-center justify-center gap-4">
          <span>
            <strong>عدد المدعوين:</strong> {bus.assignedGuests} / 36
          </span>
          <span>•</span>
          <span>
            <strong>المقاعد المتبقية:</strong> {bus.remainingSeats}
          </span>
          <span>•</span>
          <span>
            <strong>قائد الأتوبيس:</strong>{' '}
            {bus.leader ? `${bus.leader.rank} / ${bus.leader.fullName}` : 'لم يسجل بعد'}
          </span>
          <span>•</span>
          <span>
            <strong>إجمالي الركاب:</strong> {bus.totalManifestCount}
          </span>
        </div>
      </div>

      {/* 2. Compact, Single-Row Table with Bus Leader as the FIRST entry */}
      <div className="w-full overflow-hidden">
        <table className="w-full text-right border-collapse border border-slate-500 text-[10px] leading-tight">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-500 font-bold text-slate-900 whitespace-nowrap">
              <th className="border border-slate-500 py-1 px-1 w-6 text-center">م</th>
              <th className="border border-slate-500 py-1 px-1 w-12 text-center">المقعد</th>
              <th className="border border-slate-500 py-1 px-2 text-right">اسم المدعو رباعي</th>
              <th className="border border-slate-500 py-1 px-1.5 text-center font-mono">الرقم القومي</th>
              <th className="border border-slate-500 py-1 px-2 text-right">اسم الطالب المرتبط به</th>
              <th className="border border-slate-500 py-1 px-1.5 text-center font-mono">الرقم العسكري</th>
              <th className="border border-slate-500 py-1 px-1.5 text-center">القرابة</th>
              <th className="border border-slate-500 py-1 px-1 text-center font-mono">وقت الحضور</th>
            </tr>
          </thead>
          <tbody>
            {/* Bus Leader as the VERY FIRST ENTRY */}
            <tr className="bg-slate-100 border-b-2 border-slate-600 font-bold whitespace-nowrap">
              <td className="border border-slate-500 py-1 px-1 text-center font-black text-tmc-navy text-xs">
                ★
              </td>
              <td className="border border-slate-500 py-1 px-1 text-center text-[9.5px] font-black text-tmc-navy">
                المقدمة
              </td>
              <td className="border border-slate-500 py-1 px-2 font-black text-slate-950 text-[11px]">
                {bus.leader
                  ? `قائد الأتوبيس: ${bus.leader.rank} / ${bus.leader.fullName}`
                  : 'قائد الأتوبيس: (لم يسجل بعد)'}
              </td>
              <td className="border border-slate-500 py-1 px-1.5 text-center font-mono text-[9.5px]">
                {bus.leader?.phone ? `هاتف: ${bus.leader.phone}` : '—'}
              </td>
              <td colSpan={2} className="border border-slate-500 py-1 px-2 text-center text-[9.5px] text-slate-700">
                المسؤول الأمني والإداري المعتمد عن الأتوبيس
              </td>
              <td colSpan={2} className="border border-slate-500 py-1 px-1.5 text-center text-[9.5px] font-semibold text-slate-900">
                معتمد رسمياً (الفرد الأول)
              </td>
            </tr>

            {/* Guest Passengers Rows */}
            {bus.manifest.length > 0 ? (
              bus.manifest.map((guest, idx) => (
                <tr
                  key={guest.guestId}
                  className={`border-b border-slate-300 whitespace-nowrap ${
                    idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                  }`}
                >
                  <td className="border border-slate-400 py-0.5 px-1 text-center font-semibold text-slate-700">
                    {guest.sequence}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-1 text-center font-black text-slate-900">
                    {guest.seatNumber}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-2 font-black text-slate-950 whitespace-nowrap text-[10.5px]">
                    {guest.fullName}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-1.5 text-center font-mono font-medium whitespace-nowrap text-[9.5px]">
                    {guest.nationalId}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-2 text-slate-800 whitespace-nowrap">
                    {guest.studentName}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-1.5 text-center font-mono font-bold whitespace-nowrap text-slate-800">
                    {guest.studentMilitaryNumber}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-1.5 text-center whitespace-nowrap text-slate-700">
                    {guest.relationship}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-1 text-center text-[9px] text-slate-600 whitespace-nowrap font-mono">
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
                  className="border border-slate-400 p-4 text-center text-slate-500 font-semibold"
                >
                  لا يوجد مدعوون مسجلون في هذا الأتوبيس حتى الآن
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
