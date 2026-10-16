@echo off
chcp 65001 >nul
title منظومة تسجيل حضور المدعويين لحفل تخرج الدفعة رقم ١
echo =======================================================
echo   الكلية العسكرية التكنولوجية
echo   منظومة تسجيل حضور المدعويين لحفل تخرج الدفعة رقم ١
echo =======================================================
echo.

:: 1. التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] برنامج Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميل وتثبيت Node.js (الإصدار LTS) من الموقع: https://nodejs.org
    echo بعد التثبيت، أعد الضغط على هذا الملف.
    echo.
    pause
    exit /b
)

:: 2. الانتقال إلى مجلد الخادم
cd /d "%~dp0server"

:: 3. التأكد من وجود ملف الإعدادات .env
if not exist ".env" (
    echo PORT=5001 > .env
    echo NODE_ENV=production >> .env
    echo JWT_SECRET=tmc-military-tech-college-secret-key-2026 >> .env
    echo DATABASE_URL="file:./dev.db" >> .env
)

:: 4. تثبيت المكتبات إذا لم تكن موجودة
if not exist "node_modules\" (
    echo [تنبيه] جاري تجهيز مكتبات النظام لأول مرة على بيئة ويندوز...
    call npm install
)

:: 5. تهيئة محرك قاعدة البيانات لويندوز
echo جاري تهيئة محرك قاعدة البيانات لنظام ويندوز...
call npx prisma generate

:: 6. إنشاء وتغذية قاعدة البيانات في حال كانت جديدة
if not exist "dev.db" (
    echo جاري إنشاء قاعدة البيانات الأولية وتسجيل حسابات المسؤولين والأتوبيسات...
    call npx prisma db push
    call npx tsx prisma/seed.ts
)

:: 7. فتح المتصفح تلقائياً
echo جاري تشغيل المنظومة وفتح المتصفح...
start http://localhost:5001

:: 8. تشغيل السيرفر
echo.
echo =======================================================
echo [نجاح] المنظومة تعمل الآن بنجاح على: http://localhost:5001
echo اسم المستخدم الافتراضي: admin
echo كلمة المرور الافتراضية: admin123
echo.
echo ملاحظة: اترك هذه الشاشة السوداء مفتوحة أثناء استخدام المنظومة.
echo لإيقاف المنظومة، يمكنك إغلاق هذه النافذة في أي وقت.
echo =======================================================
echo.
call node dist/index.js

pause
