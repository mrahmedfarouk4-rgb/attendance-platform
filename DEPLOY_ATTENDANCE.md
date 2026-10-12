# منصة الحضور والغياب — التربية الفنية (سحابية)

منصة حضور وغياب فقط (بدون تقييم) لثلاث مواد × أربع مراحل، بثلاثة أدوار، جاهزة للنشر على Render / Railway مع Postgres.

## المواد والمراحل
- المواد: `visual` الفنون البصرية 🎨 / `performing` الفنون الأدائية 🎭 / `music` الموسيقى 🎵
- الصفوف: `grade4` الرابع الابتدائي / `grade5` الخامس الابتدائي / `grade_int1` الأول متوسط / `grade_int2` الثاني متوسط

## الأدوار والصلاحيات
| الدور | الصلاحية |
|---|---|
| `admin` مدير | كل شيء: إدارة المستخدمين + الطلاب + كل التقارير + تعيين المواد/الصفوف للمعلمين |
| `supervisor` مشرف | رؤية كل المواد/الصفوف + إدارة الطلاب + التقارير الشاملة. لا يدير المستخدمين |
| `teacher` معلم | فقط المواد والصفوف المسندة له (`allowedTracks` + `allowedGrades`). تسجيل حضور + تقاريره فقط |

المعلم بدون مواد/صفوف مسندة = ممنوع من كل شيء (يجب إسناد مادة وصف واحد على الأقل عند الإنشاء).

## متغيرات البيئة
```
DATABASE_URL="postgresql://... (من Render/Railway) أو file:./dev.db محلياً"
JWT_SECRET="مفتاح-طويل-عشوائي-64-حرف"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="غيّرها-فوراً"
PORT=8000
```

أول تشغيل ينشئ مديراً افتراضياً (`admin` / `admin123` إن لم تضبط المتغيرات) — غيّر كلمة المرور فوراً من صفحة «كلمتي».

## التشغيل محلياً
```
npm.cmd install
npm.cmd run db:push
npm.cmd run dev     # الواجهة :5173
npm.cmd start       # الإنتاج :8000 (بعد build)
```

## النشر على Render
1. ادفع الكود إلى GitHub.
2. New → Web Service → Build: `npm install && npm run build` → Start: `npm run deploy`.
3. أضف Postgres (Free) واربط `DATABASE_URL`، وأضف `JWT_SECRET` و `ADMIN_USERNAME` و `ADMIN_PASSWORD` و `NODE_ENV=production`.
4. أول نشر ينفذ `prisma db push` تلقائياً عبر `npm run deploy` وينشئ حساب المدير.

## النشر على Railway
- نفس الأوامر (`railway.toml` موجود). أضف Postgres plugin ثم متغيرات `JWT_SECRET` / `ADMIN_*`.
- `npm run deploy` = `prisma db push && node seed.js && node server.js` — تأكد أن `seed.js` لا يكسر الإقلاع إن فشل (المنصة تعمل بدونه).

## أهم الواجهات
- `POST /api/auth/login` {username,password} → {token,user}
- `GET /api/auth/me` (Bearer)
- `GET/POST /api/auth/users` + `PATCH/DELETE /api/auth/users/:id` (مدير)
- `POST /api/auth/change-password`
- `GET /api/attendance/meta` — المواد/الصفوف/الحالات
- `GET /api/attendance/students?gradeId=` (+ فلترة صلاحيات المعلم)
- `POST /api/attendance/students` + `/bulk` + `PATCH/DELETE /:id` (مدير/مشرف)
- `GET/POST /api/attendance/records` — كشف يومي + حفظ جماعي (upsert)
- `GET /api/attendance/report?from=&to=&track=&gradeId=` — مجاميع ونسب (المعلم تُفلتر تلقائياً حسب إسناده)

## ملاحظات أمنية
- كلمات المرور `bcrypt` (10 rounds)، الجلسات `JWT` صلاحية 7 أيام.
- لا يوجد تسجيل ذاتي — الحسابات ينشئها المدير فقط.
- غيّر `JWT_SECRET` و `ADMIN_PASSWORD` في الإنتاج. لا ترفع `.env` إلى Git.
