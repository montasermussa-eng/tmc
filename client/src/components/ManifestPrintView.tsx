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
    <div
      className="manifest-print-view bg-white text-black p-4 font-cairo print:p-0 max-w-[210mm] mx-auto"
      dir="rtl"
      style={{ fontFamily: 'Cairo, sans-serif', color: '#000000' }}
    >
      {/* 1. Centered Clean Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        {/* Logo centered */}
        <div className="flex justify-center mb-1">
          <img
            src="/logo.jpg"
            alt="شعار الكلية العسكرية التكنولوجية"
            className="h-16 w-16 object-contain"
          />
        </div>

        {/* Academy & College Name */}
        <div className="text-xs font-bold text-black">
          الاكاديمية العسكرية المصرية
        </div>
        <h1 className="text-base font-black text-black mt-0.5">
          الكلية العسكرية التكنولوجية
        </h1>

        {/* Title */}
        <h2 className="text-sm font-extrabold text-black mt-1">
          كشف اسماء المدعويين
        </h2>

        {/* Bus Number Pill */}
        <div className="mt-1.5 inline-block bg-white border border-black px-5 py-0.5 rounded font-black text-sm text-black">
          أتوبيس رقم [ {bus.busNumber} ]
        </div>

        {/* One-line operational summary */}
        <div className="text-[10px] text-black mt-1.5 flex items-center justify-center gap-4">
          <span>
            <strong>عدد المدعوين:</strong> {bus.assignedGuests} / 36
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

      {/* 2. Compact Table with Bus Leader as the FIRST entry */}
      <div className="w-full overflow-hidden">
        <table className="w-full text-right border-collapse border border-black text-[10px] leading-tight text-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-bold text-black whitespace-nowrap">
              <th className="border border-black py-1 px-1 w-6 text-center text-black">م</th>
              <th className="border border-black py-1 px-1 w-12 text-center text-black">المقعد</th>
              <th className="border border-black py-1 px-2 text-right text-black">اسم المدعو رباعي</th>
              <th className="border border-black py-1 px-1.5 text-center text-black">الرقم القومي</th>
              <th className="border border-black py-1 px-2 text-right text-black">اسم الطالب المرتبط به</th>
              <th className="border border-black py-1 px-1.5 text-center text-black">الرقم العسكري</th>
              <th className="border border-black py-1 px-1.5 text-center text-black">القرابة</th>
              <th className="border border-black py-1 px-1 text-center text-black">وقت الحضور</th>
            </tr>
          </thead>
          <tbody>
            {/* Bus Leader as the VERY FIRST ENTRY */}
            <tr className="bg-slate-50 border-b-2 border-black font-bold whitespace-nowrap text-black">
              <td className="border border-black py-1 px-1 text-center font-black text-black text-xs">
                ★
              </td>
              <td className="border border-black py-1 px-1 text-center text-[9.5px] font-black text-black">
                المقدمة
              </td>
              <td className="border border-black py-1 px-2 font-black text-black text-[11px]">
                {bus.leader
                  ? `قائد الأتوبيس: ${bus.leader.rank} / ${bus.leader.fullName}`
                  : 'قائد الأتوبيس: (لم يسجل بعد)'}
              </td>
              <td className="border border-black py-1 px-1.5 text-center text-[9.5px] text-black">
                {bus.leader?.phone ? `هاتف: ${bus.leader.phone}` : '—'}
              </td>
              <td colSpan={2} className="border border-black py-1 px-2 text-center text-[9.5px] text-black">
                المسؤول الأمني والإداري المعتمد عن الأتوبيس
              </td>
              <td colSpan={2} className="border border-black py-1 px-1.5 text-center text-[9.5px] font-bold text-black">
                معتمد رسمياً (الفرد الأول)
              </td>
            </tr>

            {/* Guest Passengers Rows */}
            {bus.manifest.length > 0 ? (
              bus.manifest.map((guest, idx) => (
                <tr
                  key={guest.guestId}
                  className={`border-b border-black whitespace-nowrap text-black ${
                    idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="border border-black py-0.5 px-1 text-center font-semibold text-black">
                    {guest.sequence}
                  </td>
                  <td className="border border-black py-0.5 px-1 text-center font-black text-black">
                    {guest.seatNumber}
                  </td>
                  <td className="border border-black py-0.5 px-2 font-black text-black whitespace-nowrap text-[10.5px]">
                    {guest.fullName}
                  </td>
                  <td className="border border-black py-0.5 px-1.5 text-center font-medium whitespace-nowrap text-[9.5px] text-black">
                    {guest.nationalId}
                  </td>
                  <td className="border border-black py-0.5 px-2 text-black whitespace-nowrap">
                    {guest.studentName}
                  </td>
                  <td className="border border-black py-0.5 px-1.5 text-center font-bold whitespace-nowrap text-black">
                    {guest.studentMilitaryNumber}
                  </td>
                  <td className="border border-black py-0.5 px-1.5 text-center whitespace-nowrap text-black">
                    {guest.relationship}
                  </td>
                  <td className="border border-black py-0.5 px-1 text-center text-[9px] text-black whitespace-nowrap">
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
                  className="border border-black p-4 text-center text-black font-semibold"
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
