import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- بدء تهيئة قاعدة البيانات لمنظومة الكلية العسكرية التكنولوجية ---');

  // 1. Seed System Settings
  const defaultSettings = [
    { key: 'EVENT_NAME', value: 'حفل تخرج دفعات الكلية العسكرية التكنولوجية', description: 'اسم الفعالية الرسمية' },
    { key: 'TOTAL_BUSES', value: '27', description: 'إجمالي عدد الأتوبيسات' },
    { key: 'SEATS_PER_BUS', value: '36', description: 'سعة المقاعد لكل أتوبيس (باستثناء قائد الأتوبيس)' },
    { key: 'ALLOW_NEW_GUESTS_AT_GATE', value: 'true', description: 'السماح بتسجيل مدعو جديد عند البوابة' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log('✓ تم حفظ إعدادات النظام');

  // 2. Seed Military Ranks
  const ranks = [
    { name: 'ملازم', order: 1 },
    { name: 'ملازم أول', order: 2 },
    { name: 'نقيب', order: 3 },
    { name: 'رائد', order: 4 },
    { name: 'مقدم', order: 5 },
    { name: 'عقيد', order: 6 },
    { name: 'عميد', order: 7 },
    { name: 'لواء', order: 8 },
  ];

  for (const rank of ranks) {
    await prisma.militaryRank.upsert({
      where: { name: rank.name },
      update: { order: rank.order },
      create: rank,
    });
  }
  console.log('✓ تم تسجيل الرتب العسكرية لقادة الأتوبيسات');

  // 3. Seed Relationship Types
  const relationships = [
    { name: 'والد', order: 1 },
    { name: 'والدة', order: 2 },
    { name: 'أخ', order: 3 },
    { name: 'أخت', order: 4 },
    { name: 'زوجة', order: 5 },
    { name: 'ابن', order: 6 },
    { name: 'ابنة', order: 7 },
    { name: 'عم', order: 8 },
    { name: 'خال', order: 9 },
    { name: 'أخرى', order: 10 },
  ];

  for (const rel of relationships) {
    await prisma.relationshipType.upsert({
      where: { name: rel.name },
      update: { order: rel.order },
      create: rel,
    });
  }
  console.log('✓ تم تسجيل درجات القرابة المعتمدة');

  // 4. Seed Exactly 27 Buses
  for (let i = 1; i <= 27; i++) {
    await prisma.bus.upsert({
      where: { id: i },
      update: { capacity: 36 },
      create: {
        id: i,
        busNumber: i,
        capacity: 36,
        status: 'AVAILABLE',
      },
    });
  }
  console.log('✓ تم تسجيل الـ 27 أتوبيساً بسعة 36 مقعداً لكل أتوبيس (إجمالي 972 مقعداً)');

  // 5. Seed Default User Accounts
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const gatePasswordHash = await bcrypt.hash('gate123', 10);
  const supervisorPasswordHash = await bcrypt.hash('super123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'مدير المنظومة / ضابط النظم',
      role: 'ADMIN',
      militaryNumber: 'M-10001',
    },
  });

  await prisma.user.upsert({
    where: { username: 'gate1' },
    update: { passwordHash: gatePasswordHash },
    create: {
      username: 'gate1',
      passwordHash: gatePasswordHash,
      fullName: 'مسؤول بوابة الدخول الرئيسية',
      role: 'GATE_OPERATOR',
      militaryNumber: 'M-10002',
    },
  });

  await prisma.user.upsert({
    where: { username: 'supervisor' },
    update: { passwordHash: supervisorPasswordHash },
    create: {
      username: 'supervisor',
      passwordHash: supervisorPasswordHash,
      fullName: 'مشرف قطاع النقل وتسكين الأتوبيسات',
      role: 'SUPERVISOR',
      militaryNumber: 'M-10003',
    },
  });
  console.log('✓ تم إنشاء حسابات المستخدمين (admin, gate1, supervisor)');

  // 6. Seed Demonstration / Test Students & Guests (for realistic initial verification)
  const existingStudents = await prisma.student.count();
  if (existingStudents === 0) {
    const student1 = await prisma.student.create({
      data: {
        militaryNumber: '102345',
        fullName: 'أحمد محمود علي إبراهيم',
      },
    });

    const student2 = await prisma.student.create({
      data: {
        militaryNumber: '102346',
        fullName: 'كريم حسام الدين مصطفى',
      },
    });

    const student3 = await prisma.student.create({
      data: {
        militaryNumber: '102347',
        fullName: 'طارق عبد الرحمن السعيد سالم',
      },
    });

    // Seed Guests for student1
    await prisma.guest.createMany({
      data: [
        {
          fullName: 'محمود علي إبراهيم عبد الله',
          nationalId: '26508150102431',
          nationalIdSuffix: '0102431',
          studentId: student1.id,
          relationship: 'والد',
          hasAttended: false,
        },
        {
          fullName: 'فاطمة حسن إبراهيم رضوان',
          nationalId: '27210200103528',
          nationalIdSuffix: '0103528',
          studentId: student1.id,
          relationship: 'والدة',
          hasAttended: false,
        },
        {
          fullName: 'ياسر محمود علي إبراهيم',
          nationalId: '29803120101915',
          nationalIdSuffix: '0101915',
          studentId: student1.id,
          relationship: 'أخ',
          hasAttended: false,
        },
      ],
    });

    // Seed Guests for student2
    await prisma.guest.createMany({
      data: [
        {
          fullName: 'حسام الدين مصطفى الشناوي',
          nationalId: '26804111201853',
          nationalIdSuffix: '1201853',
          studentId: student2.id,
          relationship: 'والد',
          hasAttended: false,
        },
        {
          fullName: 'سناء كمال عبد العزيز عمر',
          nationalId: '27409251202426',
          nationalIdSuffix: '1202426',
          studentId: student2.id,
          relationship: 'والدة',
          hasAttended: false,
        },
      ],
    });

    // Seed Guests for student3
    await prisma.guest.createMany({
      data: [
        {
          fullName: 'عبد الرحمن السعيد سالم عطية',
          nationalId: '26312151601742',
          nationalIdSuffix: '1601742',
          studentId: student3.id,
          relationship: 'والد',
          hasAttended: false,
        },
      ],
    });

    console.log('✓ تم تسجيل عينة طلبة وضيافتهم للتحقق الأولي');
  }

  console.log('=== اكتملت تهيئة قاعدة البيانات بنجاح ===');
}

main()
  .catch((e) => {
    console.error('خطأ أثناء تهيئة قاعدة البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
