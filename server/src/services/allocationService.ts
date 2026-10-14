import { prisma } from '../db';

export interface CheckinResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  guest: any;
  busNumber: number;
  seatNumber: number;
  isBusNowFull: boolean;
  requiresLeader: boolean;
  timestamp: Date;
}

/**
 * Deterministic Sequential Bus Allocation Engine
 * - Assigns newly checked-in guest to lowest numbered bus (1..27) with < 36 seats
 * - Exactly 36 seats per bus (excluding leader)
 * - Safe against concurrency via Prisma transactions
 */
export async function checkinAndAllocateGuest(
  guestId: string,
  operatorId?: string,
  operatorName?: string,
  ipAddress?: string
): Promise<CheckinResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch guest with lock/transaction
    const guest = await tx.guest.findUnique({
      where: { id: guestId },
      include: {
        student: true,
        bus: {
          include: {
            leader: true,
          },
        },
      },
    });

    if (!guest) {
      throw new Error('لم يتم العثور على سجل المدعو في المنظومة');
    }

    // 2. Prevent duplicate check-in
    if (guest.hasAttended && guest.busId) {
      return {
        success: true,
        alreadyCheckedIn: true,
        message: `المدعو تم تسجيل دخوله مسبقاً في ${guest.checkedInAt?.toLocaleString('ar-EG')} وتم تسكينه في أتوبيس رقم ${guest.bus?.busNumber} (المقعد ${guest.seatNumber})`,
        guest,
        busNumber: guest.bus?.busNumber || 0,
        seatNumber: guest.seatNumber || 0,
        isBusNowFull: false,
        requiresLeader: false,
        timestamp: guest.checkedInAt || new Date(),
      };
    }

    // 3. Find lowest-numbered open bus that has less than 36 guests
    const allBuses = await tx.bus.findMany({
      where: {
        status: {
          not: 'CLOSED',
        },
      },
      orderBy: {
        busNumber: 'asc',
      },
      include: {
        _count: {
          select: { guests: true },
        },
        leader: true,
      },
    });

    // Find the first bus with < 36 guests
    const targetBus = allBuses.find((b) => b._count.guests < 36);

    if (!targetBus) {
      throw new Error(
        'عفواً، تم استيعاب الحد الأقصى لسعة الأتوبيسات بالكامل (972 مقعداً في 27 أتوبيساً). لا يمكن تسكين المزيد من المدعوين دون مراجعة إدارة العمليات.'
      );
    }

    const currentGuestCount = targetBus._count.guests;
    const assignedSeatNumber = currentGuestCount + 1;
    const checkinTime = new Date();

    // 4. Update the guest record
    const updatedGuest = await tx.guest.update({
      where: { id: guestId },
      data: {
        hasAttended: true,
        checkedInAt: checkinTime,
        checkedInBy: operatorName || operatorId || 'بوابة الدخول',
        busId: targetBus.id,
        seatNumber: assignedSeatNumber,
      },
      include: {
        student: true,
        bus: true,
      },
    });

    // 5. Update bus status
    const newGuestCount = currentGuestCount + 1;
    const isNowFull = newGuestCount >= 36;
    const newBusStatus = isNowFull ? 'FULL' : 'IN_PROGRESS';

    await tx.bus.update({
      where: { id: targetBus.id },
      data: {
        status: newBusStatus,
      },
    });

    const requiresLeader = isNowFull && !targetBus.leader;

    // 6. Record Audit Log entry
    await tx.auditLog.create({
      data: {
        action: 'CHECK_IN',
        entityType: 'GUEST',
        entityId: guestId,
        details: `تسجيل حضور المدعو (${guest.fullName}) وتسكينه في أتوبيس رقم [${targetBus.busNumber}] - مقعد [${assignedSeatNumber}]`,
        userId: operatorId,
        userName: operatorName || 'موظف البوابة',
        userRole: 'GATE_OPERATOR',
        ipAddress: ipAddress || '127.0.0.1',
      },
    });

    return {
      success: true,
      alreadyCheckedIn: false,
      message: `تم تسجيل الدخول بنجاح — تم التسكين في أتوبيس رقم [${targetBus.busNumber}]، المقعد [${assignedSeatNumber}]`,
      guest: updatedGuest,
      busNumber: targetBus.busNumber,
      seatNumber: assignedSeatNumber,
      isBusNowFull: isNowFull,
      requiresLeader,
      timestamp: checkinTime,
    };
  });
}
