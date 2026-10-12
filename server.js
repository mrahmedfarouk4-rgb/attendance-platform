import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(process.cwd(), 'dist')));

// ---------- ثوابت المنصة ----------
const TRACKS = [
  { id: 'visual', name: 'الفنون البصرية', icon: '🎨' },
  { id: 'performing', name: 'الفنون الأدائية', icon: '🎭' },
  { id: 'music', name: 'الموسيقى', icon: '🎵' },
];
const GRADES = [
  { id: 'grade4', name: 'الصف الرابع الابتدائي', short: 'الرابع' },
  { id: 'grade5', name: 'الصف الخامس الابتدائي', short: 'الخامس' },
  { id: 'grade_int1', name: 'الصف الأول متوسط', short: 'الأول متوسط' },
  { id: 'grade_int2', name: 'الصف الثاني متوسط', short: 'الثاني متوسط' },
];
const TRACK_IDS = TRACKS.map((t) => t.id);
const GRADE_IDS = GRADES.map((g) => g.id);
const ATT_STATUSES = ['present', 'absent', 'late', 'excused'];

// ---------- التقويم الدراسي (من ملف البصرية القديم V7) ----------
const SEMESTER_SCHEDULE = [
  { id: 1, label: 'الأسبوع الأول', startDay: 23, startMonth: 8, startYear: 2026 },
  { id: 2, label: 'الأسبوع الثاني', startDay: 30, startMonth: 8, startYear: 2026 },
  { id: 3, label: 'الأسبوع الثالث', startDay: 6, startMonth: 9, startYear: 2026 },
  { id: 4, label: 'الأسبوع الرابع', startDay: 13, startMonth: 9, startYear: 2026 },
  { id: 5, label: 'الأسبوع الخامس', startDay: 20, startMonth: 9, startYear: 2026 },
  { id: 6, label: 'الأسبوع السادس', startDay: 27, startMonth: 9, startYear: 2026 },
  { id: 7, label: 'الأسبوع السابع', startDay: 4, startMonth: 10, startYear: 2026 },
  { id: 8, label: 'الأسبوع الثامن', startDay: 11, startMonth: 10, startYear: 2026 },
  { id: 9, label: 'الأسبوع التاسع', startDay: 18, startMonth: 10, startYear: 2026 },
  { id: 10, label: 'الأسبوع العاشر', startDay: 25, startMonth: 10, startYear: 2026 },
  { id: 11, label: 'الأسبوع الحادي عشر', startDay: 1, startMonth: 11, startYear: 2026 },
  { id: 12, label: 'الأسبوع الثاني عشر', startDay: 8, startMonth: 11, startYear: 2026 },
  { id: 13, label: 'الأسبوع الثالث عشر', startDay: 15, startMonth: 11, startYear: 2026 },
  { id: 14, label: 'الأسبوع الرابع عشر', startDay: 29, startMonth: 11, startYear: 2026 },
  { id: 15, label: 'الأسبوع الخامس عشر', startDay: 6, startMonth: 12, startYear: 2026 },
  { id: 16, label: 'الأسبوع السادس عشر', startDay: 13, startMonth: 12, startYear: 2026 },
  { id: 17, label: 'الأسبوع السابع عشر', startDay: 20, startMonth: 12, startYear: 2026 },
  { id: 18, label: 'الأسبوع الثامن عشر', startDay: 27, startMonth: 12, startYear: 2026 },
  { id: 19, label: 'الأسبوع التاسع عشر', startDay: 3, startMonth: 1, startYear: 2027 },
];
const genWeekDates = (day, month, year) => {
  const out = [];
  const base = new Date(year, month - 1, day);
  for (let i = 0; i < 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
};
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-attendance-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('⚠️  JWT_SECRET غير مضبوط — استخدم مفتاح تطوير مؤقت. اضبطه في الإنتاج!');

const parseJsonArray = (v) => {
  try {
    const a = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(a) ? a : [];
  } catch { return []; }
};
const sanitizeUser = (u) => {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return { ...rest, allowedTracks: parseJsonArray(u.allowedTracks), allowedGrades: parseJsonArray(u.allowedGrades) };
};
const canAccess = (user, track, gradeId) => {
  if (!user || user.active === false) return false;
  if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'developer') return true;
  const tracks = parseJsonArray(user.allowedTracks);
  const grades = parseJsonArray(user.allowedGrades);
  if (track && tracks.length && !tracks.includes(track)) return false;
  if (gradeId && grades.length && !grades.includes(gradeId)) return false;
  if (track && !tracks.length) return false;
  if (gradeId && !grades.length) return false;
  return true;
};

const requireAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'غير مصرح — سجل الدخول أولاً' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.active) return res.status(401).json({ error: 'الحساب غير موجود أو موقوف' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'جلسة غير صالحة — سجل الدخول مجدداً' });
  }
};
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'صلاحية غير كافية' });
  next();
};

async function ensureDefaultAdmin() {
  try {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim();
    const password = (process.env.ADMIN_PASSWORD || 'admin123').trim();
    const existing = await prisma.user.findUnique({ where: { username } });
    // كلمة مرور المدير تُدار من ADMIN_PASSWORD وتُزامن عند كل إقلاع (مثل المطور)
    if (existing) {
      const same = await bcrypt.compare(password, existing.passwordHash).catch(() => false);
      if (!same) {
        await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(password, 10), active: true } });
        console.log('✅ تمت مزامنة كلمة مرور المدير من متغيرات البيئة');
      }
      return;
    }
    if ((await prisma.user.count()) > 0) return;
    await prisma.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, 10), displayName: 'مدير المنصة', role: 'admin', allowedTracks: '[]', allowedGrades: '[]', active: true },
    });
    console.log(`✅ مدير افتراضي: ${username} — غيّر كلمة المرور فوراً!`);
  } catch (e) { console.error('ensureDefaultAdmin:', e.message); }
}

// حساب مطور المنصة: مخفي، كلمة مروره تُدار من DEVELOPER_PASSWORD (تُزامن عند كل إقلاع)
async function ensureDeveloper() {
  try {
    const username = (process.env.DEVELOPER_USERNAME || '').trim();
    const password = (process.env.DEVELOPER_PASSWORD || '').trim();
    if (!username || !password) return;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      if (existing.role !== 'developer') {
        await prisma.user.update({ where: { id: existing.id }, data: { role: 'developer', active: true } });
      }
      // مزامنة كلمة المرور من البيئة إن اختلفت (تغيير .env يتطلب إعادة تشغيل فقط)
      const same = await bcrypt.compare(password, existing.passwordHash).catch(() => false);
      if (!same) {
        await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(password, 10), active: true } });
        console.log('✅ تمت مزامنة كلمة مرور مطور المنصة من متغيرات البيئة');
      }
      return;
    }
    await prisma.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, 10), displayName: 'مطور المنصة', role: 'developer', allowedTracks: '[]', allowedGrades: '[]', active: true },
    });
    console.log('✅ حساب مطور المنصة جاهز (مخفي عن القوائم)');
  } catch (e) { console.error('ensureDeveloper:', e.message); }
}
const isProtectedAccount = (u) => u && (u.role === 'admin' || u.role === 'developer');

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) { res.status(500).json({ status: 'error', error: e.message }); }
});

// ---- مصادقة ----
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة المرور' });
    const user = await prisma.user.findUnique({ where: { username: String(username).trim() } });
    if (!user || !user.active) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    if (!(await bcrypt.compare(String(password), user.passwordHash))) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: sanitizeUser(user), tracks: TRACKS, grades: GRADES });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: sanitizeUser(req.user), tracks: TRACKS, grades: GRADES }));
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'الجديدة 6 أحرف على الأقل' });
    if (req.user.role !== 'admin' && req.user.role !== 'developer' && !(await bcrypt.compare(String(oldPassword || ''), req.user.passwordHash))) {
      return res.status(400).json({ error: 'الحالية غير صحيحة' });
    }
    const updated = await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(String(newPassword), 10) } });
    res.json({ message: 'تم التغيير', user: sanitizeUser(updated) });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});

// ---- مستخدمون (المدير يدير المشرفين والمعلمين فقط — حسابات المدير والمطور للمطور فقط) ----
const VALID_ROLES = ['admin', 'supervisor', 'teacher', 'developer'];
app.get('/api/auth/users', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const all = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  const visible = req.user.role === 'developer' ? all : all.filter((u) => u.role !== 'developer');
  res.json(visible.map(sanitizeUser));
});
app.post('/api/auth/users', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  try {
    const { username, password, displayName, role, allowedTracks, allowedGrades, active } = req.body || {};
    if (!username || !password || !displayName || !role) return res.status(400).json({ error: 'حقول ناقصة' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'دور غير صالح' });
    if ((role === 'admin' || role === 'developer') && req.user.role !== 'developer') return res.status(403).json({ error: 'غير مصرح' });
    if (String(password).length < 6) return res.status(400).json({ error: 'كلمة المرور 6+ أحرف' });
    const tracks = (Array.isArray(allowedTracks) ? allowedTracks : []).filter((t) => TRACK_IDS.includes(t));
    const grades = (Array.isArray(allowedGrades) ? allowedGrades : []).filter((g) => GRADE_IDS.includes(g));
    if (role === 'teacher' && (!tracks.length || !grades.length)) return res.status(400).json({ error: 'المعلم يحتاج مادة وصفاً على الأقل' });
    const created = await prisma.user.create({
      data: { username: String(username).trim(), passwordHash: await bcrypt.hash(String(password), 10), displayName: String(displayName).trim(), role, allowedTracks: JSON.stringify(tracks), allowedGrades: JSON.stringify(grades), active: active !== false },
    });
    res.json(sanitizeUser(created));
  } catch (e) {
    if (String(e.message).includes('Unique constraint')) return res.status(409).json({ error: 'اسم المستخدم موجود' });
    res.status(500).json({ error: 'خطأ داخلي', details: e.message });
  }
});
app.patch('/api/auth/users/:id', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (isProtectedAccount(target) && req.user.role !== 'developer') return res.status(403).json({ error: 'غير مصرح' });
    const { displayName, role, allowedTracks, allowedGrades, active, password } = req.body || {};
    const data = {};
    if (displayName !== undefined) data.displayName = String(displayName).trim();
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'دور غير صالح' });
      if ((role === 'admin' || role === 'developer') && req.user.role !== 'developer') return res.status(403).json({ error: 'غير مصرح' });
      if (target.role === 'developer' && role !== 'developer') return res.status(403).json({ error: 'لا يمكن تغيير دور المطور' });
      data.role = role;
    }
    if (allowedTracks !== undefined) data.allowedTracks = JSON.stringify((Array.isArray(allowedTracks) ? allowedTracks : []).filter((t) => TRACK_IDS.includes(t)));
    if (allowedGrades !== undefined) data.allowedGrades = JSON.stringify((Array.isArray(allowedGrades) ? allowedGrades : []).filter((g) => GRADE_IDS.includes(g)));
    if (active !== undefined) data.active = !!active;
    if (password) {
      if (String(password).length < 6) return res.status(400).json({ error: 'كلمة المرور 6+ أحرف' });
      data.passwordHash = await bcrypt.hash(String(password), 10);
    }
    if (id === req.user.id && data.active === false) return res.status(400).json({ error: 'لا توقف حسابك' });
    res.json(sanitizeUser(await prisma.user.update({ where: { id }, data })));
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.delete('/api/auth/users/:id', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'لا تحذف حسابك' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (isProtectedAccount(target) && req.user.role !== 'developer') return res.status(403).json({ error: 'غير مصرح' });
    if (target.role === 'developer') return res.status(403).json({ error: 'لا يمكن حذف حساب المطور' });
    await prisma.attendanceRecord.updateMany({ where: { markedById: id }, data: { markedById: null } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'تم الحذف' });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});

// ---- طلاب ----
app.get('/api/attendance/meta', requireAuth, (req, res) => res.json({ tracks: TRACKS, grades: GRADES, statuses: ATT_STATUSES, weeks: SEMESTER_SCHEDULE, user: sanitizeUser(req.user) }));
app.get('/api/attendance/students', requireAuth, async (req, res) => {
  try {
    const { gradeId, track } = req.query;
    const where = { active: true };
    if (gradeId) {
      if (!GRADE_IDS.includes(String(gradeId))) return res.status(400).json({ error: 'صف غير صالح' });
      if (req.user.role === 'teacher' && !parseJsonArray(req.user.allowedGrades).includes(String(gradeId))) return res.status(403).json({ error: 'غير مصرح لهذا الصف' });
      where.gradeId = String(gradeId);
    } else if (req.user.role === 'teacher') where.gradeId = { in: parseJsonArray(req.user.allowedGrades) };
    if (track) {
      if (!TRACK_IDS.includes(String(track))) return res.status(400).json({ error: 'مادة غير صالحة' });
      if (req.user.role === 'teacher' && !parseJsonArray(req.user.allowedTracks).includes(String(track))) return res.status(403).json({ error: 'غير مصرح لهذه المادة' });
      where.track = String(track);
    } else if (req.user.role === 'teacher') where.track = { in: parseJsonArray(req.user.allowedTracks) };
    res.json(await prisma.student.findMany({ where, orderBy: { name: 'asc' } }));
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.post('/api/attendance/students', requireAuth, requireRole('admin', 'supervisor', 'developer'), async (req, res) => {
  try {
    const { name, gradeId, track } = req.body || {};
    if (!name || !gradeId) return res.status(400).json({ error: 'الاسم والصف مطلوبان' });
    if (!GRADE_IDS.includes(String(gradeId))) return res.status(400).json({ error: 'صف غير صالح' });
    const tr = TRACK_IDS.includes(String(track)) ? String(track) : 'visual';
    res.json(await prisma.student.create({ data: { name: String(name).trim(), gradeId: String(gradeId), track: tr, active: true } }));
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.post('/api/attendance/students/bulk', requireAuth, requireRole('admin', 'supervisor', 'developer'), async (req, res) => {
  try {
    const { gradeId, track, names } = req.body || {};
    if (!gradeId || !Array.isArray(names)) return res.status(400).json({ error: 'gradeId و names مطلوبان' });
    const tr = TRACK_IDS.includes(String(track)) ? String(track) : 'visual';
    const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))].slice(0, 500);
    if (!clean.length) return res.status(400).json({ error: 'لا أسماء صالحة' });
    const existing = new Set((await prisma.student.findMany({ where: { gradeId: String(gradeId), track: tr } })).map((s) => s.name.trim()));
    const fresh = clean.filter((n) => !existing.has(n));
    await prisma.student.createMany({ data: fresh.map((n) => ({ name: n, gradeId: String(gradeId), track: tr, active: true })) });
    res.json({ added: fresh.length, skipped: clean.length - fresh.length });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.patch('/api/attendance/students/:id', requireAuth, requireRole('admin', 'supervisor', 'developer'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, gradeId, track, active, moveRecords } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (gradeId !== undefined) {
      if (!GRADE_IDS.includes(String(gradeId))) return res.status(400).json({ error: 'صف غير صالح' });
      data.gradeId = String(gradeId);
    }
    if (track !== undefined) {
      if (!TRACK_IDS.includes(String(track))) return res.status(400).json({ error: 'مادة غير صالحة' });
      data.track = String(track);
    }
    if (active !== undefined) data.active = !!active;
    const updated = await prisma.student.update({ where: { id }, data });
    if ((gradeId !== undefined || track !== undefined) && moveRecords) {
      await prisma.attendanceRecord.updateMany({ where: { studentId: id }, data: { gradeId: updated.gradeId, track: updated.track } });
    }
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.delete('/api/attendance/students/:id', requireAuth, requireRole('admin', 'supervisor', 'developer'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.attendanceRecord.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'تم حذف الطالب وسجلاته' });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});

// ---- حضور ----
const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s).getTime());
app.get('/api/attendance/records', requireAuth, async (req, res) => {
  try {
    const { date, track, gradeId } = req.query;
    if (!isValidDate(date) || !TRACK_IDS.includes(String(track)) || !GRADE_IDS.includes(String(gradeId))) return res.status(400).json({ error: 'date/track/gradeId غير صالحة' });
    if (!canAccess(req.user, String(track), String(gradeId))) return res.status(403).json({ error: 'غير مصرح' });
    res.json(await prisma.attendanceRecord.findMany({ where: { date: String(date), track: String(track), gradeId: String(gradeId) }, include: { student: true } }));
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.post('/api/attendance/records', requireAuth, async (req, res) => {
  try {
    const { date, track, gradeId, records } = req.body || {};
    if (!isValidDate(date) || !TRACK_IDS.includes(String(track)) || !GRADE_IDS.includes(String(gradeId)) || !Array.isArray(records)) return res.status(400).json({ error: 'بيانات ناقصة' });
    if (!canAccess(req.user, String(track), String(gradeId))) return res.status(403).json({ error: 'غير مصرح' });
    const clean = records.filter((r) => r && Number.isInteger(r.studentId) && ATT_STATUSES.includes(r.status)).slice(0, 1000);
    if (!clean.length) return res.status(400).json({ error: 'لا سجلات صالحة' });
    const ids = [...new Set(clean.map((r) => r.studentId))];
    const byId = new Map((await prisma.student.findMany({ where: { id: { in: ids } } })).map((s) => [s.id, s]));
    const ops = [];
    for (const r of clean) {
      const st = byId.get(r.studentId);
      if (!st || st.gradeId !== String(gradeId) || (st.track && st.track !== String(track))) continue;
      ops.push(prisma.attendanceRecord.upsert({
        where: { date_track_gradeId_studentId: { date: String(date), track: String(track), gradeId: String(gradeId), studentId: r.studentId } },
        update: { status: r.status, note: r.note ? String(r.note).slice(0, 200) : null, markedById: req.user.id },
        create: { date: String(date), track: String(track), gradeId: String(gradeId), studentId: r.studentId, status: r.status, note: r.note ? String(r.note).slice(0, 200) : null, markedById: req.user.id },
      }));
    }
    const results = await prisma.$transaction(ops);
    res.json({ saved: results.length, date, track, gradeId });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.get('/api/attendance/week', requireAuth, async (req, res) => {
  try {
    const weekId = parseInt(req.query.weekId, 10);
    const { track, gradeId } = req.query;
    const sched = SEMESTER_SCHEDULE.find((w) => w.id === weekId);
    if (!sched || !TRACK_IDS.includes(String(track)) || !GRADE_IDS.includes(String(gradeId))) return res.status(400).json({ error: 'weekId/track/gradeId غير صالحة' });
    if (!canAccess(req.user, String(track), String(gradeId))) return res.status(403).json({ error: 'غير مصرح' });
    const dates = genWeekDates(sched.startDay, sched.startMonth, sched.startYear).map(toISODate);
    const records = await prisma.attendanceRecord.findMany({ where: { date: { in: dates }, track: String(track), gradeId: String(gradeId) } });
    res.json({ week: sched, dates, records });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.post('/api/attendance/week', requireAuth, async (req, res) => {
  try {
    const { track, gradeId, records } = req.body || {};
    if (!TRACK_IDS.includes(String(track)) || !GRADE_IDS.includes(String(gradeId)) || !Array.isArray(records)) return res.status(400).json({ error: 'بيانات ناقصة' });
    if (!canAccess(req.user, String(track), String(gradeId))) return res.status(403).json({ error: 'غير مصرح' });
    const clean = records.filter((r) => r && isValidDate(r.date) && Number.isInteger(r.studentId) && (r.status === null || ATT_STATUSES.includes(r.status))).slice(0, 2500);
    if (!clean.length) return res.status(400).json({ error: 'لا سجلات صالحة' });
    const ids = [...new Set(clean.map((r) => r.studentId))];
    const byId = new Map((await prisma.student.findMany({ where: { id: { in: ids } } })).map((s) => [s.id, s]));
    // إزالة التكرار داخل الطلب نفسه (آخر قيمة تفوز)
    const dedup = new Map();
    for (const r of clean) {
      const st = byId.get(r.studentId);
      if (!st || st.gradeId !== String(gradeId) || (st.track && st.track !== String(track))) continue;
      dedup.set(`${r.date}|${r.studentId}`, r);
    }
    const toDelete = [...dedup.values()].filter((r) => r.status === null);
    const toUpsert = [...dedup.values()].filter((r) => r.status !== null);
    if (toDelete.length) {
      await prisma.attendanceRecord.deleteMany({
        where: { track: String(track), gradeId: String(gradeId), OR: toDelete.map((r) => ({ date: String(r.date), studentId: r.studentId })) },
      });
    }
    const ops = toUpsert.map((r) => prisma.attendanceRecord.upsert({
      where: { date_track_gradeId_studentId: { date: String(r.date), track: String(track), gradeId: String(gradeId), studentId: r.studentId } },
      update: { status: r.status, markedById: req.user.id },
      create: { date: String(r.date), track: String(track), gradeId: String(gradeId), studentId: r.studentId, status: r.status, markedById: req.user.id },
    }));
    const results = toUpsert.length ? await prisma.$transaction(ops) : [];
    res.json({ saved: results.length, deleted: toDelete.length, track, gradeId });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});
app.get('/api/attendance/report', requireAuth, async (req, res) => {
  try {
    const { from, to, track, gradeId } = req.query;
    if (!isValidDate(from) || !isValidDate(to)) return res.status(400).json({ error: 'from/to بصيغة YYYY-MM-DD' });
    const t = track ? String(track) : null;
    const g = gradeId ? String(gradeId) : null;
    if (t && !TRACK_IDS.includes(t)) return res.status(400).json({ error: 'مادة غير صالحة' });
    if (g && !GRADE_IDS.includes(g)) return res.status(400).json({ error: 'صف غير صالح' });
    if (req.user.role === 'teacher') {
      const at = parseJsonArray(req.user.allowedTracks), ag = parseJsonArray(req.user.allowedGrades);
      if (t && !at.includes(t)) return res.status(403).json({ error: 'غير مصرح للمادة' });
      if (g && !ag.includes(g)) return res.status(403).json({ error: 'غير مصرح للصف' });
    }
    const where = { date: { gte: String(from), lte: String(to) } };
    if (t) where.track = t; else if (req.user.role === 'teacher') where.track = { in: parseJsonArray(req.user.allowedTracks) };
    if (g) where.gradeId = g; else if (req.user.role === 'teacher') where.gradeId = { in: parseJsonArray(req.user.allowedGrades) };
    const records = await prisma.attendanceRecord.findMany({ where, include: { student: true }, orderBy: { date: 'asc' } });
    const map = new Map();
    for (const r of records) {
      const k = r.studentId + '|' + r.track + '|' + r.gradeId;
      if (!map.has(k)) map.set(k, { studentId: r.studentId, studentName: r.student?.name || '#' + r.studentId, track: r.track, gradeId: r.gradeId, present: 0, absent: 0, late: 0, excused: 0, total: 0 });
      const e = map.get(k);
      e.total++;
      if (r.status === 'present') e.present++;
      else if (r.status === 'absent') e.absent++;
      else if (r.status === 'late') e.late++;
      else if (r.status === 'excused') e.excused++;
    }
    const rows = [...map.values()].map((e) => ({ ...e, rate: e.total ? Math.round(((e.present + e.late * 0.5 + e.excused * 0.5) / e.total) * 100) : 0 }));
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
    res.json({ from, to, count: records.length, rows });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});

// ---- معلومات النظام (مطور المنصة فقط) ----
app.get('/api/system/info', requireAuth, requireRole('developer'), async (req, res) => {
  try {
    const [users, students, records] = await Promise.all([
      prisma.user.count(), prisma.student.count(), prisma.attendanceRecord.count(),
    ]);
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    res.json({
      users, students, records, admins,
      jwtConfigured: !!process.env.JWT_SECRET,
      developerConfigured: !!(process.env.DEVELOPER_USERNAME && process.env.DEVELOPER_PASSWORD),
      database: (process.env.DATABASE_URL || '').split(':')[0] || 'unknown',
      uptimeSec: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', details: e.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend files not found. Run npm run build.');
  });
});

app.listen(port, async () => {
  console.log(`✅ منصة الحضور تعمل على المنفذ ${port}`);
  await ensureDefaultAdmin();
  await ensureDeveloper();
});
