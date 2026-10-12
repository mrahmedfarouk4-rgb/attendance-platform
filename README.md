# منصة الحضور والغياب — التربية الفنية

مجلد مستقل لمنصة الحضور فقط (منفصل تماماً عن مجلد منصة التقييمات).

## التشغيل محلياً
```
npm install
npm run db:push
npm start
```
ثم افتح `http://localhost:8000` — الدخول الأول `admin / admin123`.

## النشر
- Render/Railway مع Postgres — اضبط `DATABASE_URL` و `JWT_SECRET` و `ADMIN_USERNAME` و `ADMIN_PASSWORD`.
- `npm run deploy` ينفذ `prisma db push` ثم يشغل السيرفر وينشئ المدير تلقائياً.
