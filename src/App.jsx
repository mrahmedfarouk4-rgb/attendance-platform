import { useState, useEffect, useMemo } from 'react';
import { Palette, Users, ClipboardCheck, BarChart3, LogOut, Printer, Plus, Trash2, Save, Check, X, UserCog, KeyRound, Search, GraduationCap, Music4, Drama, FileDown, FileUp, Building2, Eye, EyeOff, UserRound, LockKeyhole } from 'lucide-react';

const api = async (path, { method = 'GET', body, token } = {}) => {
  const t = token || localStorage.getItem('att_token');
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطأ في الاتصال');
  return data;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
const weekFirstISO = (w) => {
  const d = new Date(w.startYear, w.startMonth - 1, w.startDay);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const weekLastISO = (w) => {
  const d = new Date(w.startYear, w.startMonth - 1, w.startDay + 4);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const findWeekForDate = (iso) => {
  const hit = SEMESTER_SCHEDULE.find(w => iso >= weekFirstISO(w) && iso <= weekLastISO(w));
  if (hit) return hit.id;
  if (iso < weekFirstISO(SEMESTER_SCHEDULE[0])) return SEMESTER_SCHEDULE[0].id;
  return SEMESTER_SCHEDULE[SEMESTER_SCHEDULE.length - 1].id;
};
const weekRange = (w) => {
  const a = new Date(w.startYear, w.startMonth - 1, w.startDay);
  const b = new Date(a); b.setDate(a.getDate() + 4);
  const f = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${f(a)} - ${f(b)}`;
};
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const shortDM = (iso) => { const [, m, d] = String(iso).split('-'); return `${parseInt(d, 10)}/${parseInt(m, 10)}`; };

const statusLabel = { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'مستأذن' };
const trackStyle = {
  visual: { chip: 'bg-[#fddcc8] text-[#7a3c12] border-[#d17e30]', img: '/gallery/visual-boys.jpg', icon: <Palette className="w-5 h-5" /> },
  performing: { chip: 'bg-[#c6eee5] text-[#004645] border-[#83d5c4]', img: '/gallery/performing-boys.jpg', icon: <Drama className="w-5 h-5" /> },
  music: { chip: 'bg-[#c0e1f7] text-[#262674] border-[#83c3eb]', img: '/gallery/music-boys.jpg', icon: <Music4 className="w-5 h-5" /> },
};
// هوية كل مسار: تلوّن كامل صفحة التسجيل (بانر، أيام، صفوف، أزرار)
const TRACK_THEMES = {
  visual: { primary: '#621244', dark: '#4a0d33' },
  performing: { primary: '#004645', dark: '#013937' },
  music: { primary: '#262674', dark: '#1b1b52' },
};
const roleStyle = {
  admin: 'bg-[#fddcc8] text-[#7a3c12] border border-[#d17e30]',
  supervisor: 'bg-[#c0e1f7] text-[#262674] border border-[#83c3eb]',
  teacher: 'bg-[#f5d7e8] text-[#621244] border border-[#e5a1c8]',
  developer: 'bg-[#621244] text-[#fbe122] border border-[#fbe122]',
};
const roleLabel = { admin: 'مدير', supervisor: 'مشرف', teacher: 'معلم', developer: 'مطور المنصة' };
const avatarTones = ['bg-slate-200 text-slate-700', 'bg-[#f5d7e8] text-[#621244]', 'bg-[#c0e1f7] text-[#262674]', 'bg-[#fddcc8] text-[#7a3c12]', 'bg-[#fbe122] text-[#621244]'];

// استخراج الأسماء من ملف عام: JSON (مصفوفة أو كائن) أو CSV/TXT (سطر لكل اسم)
function parseNamesFile(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  if (t[0] === '[' || t[0] === '{') {
    const j = JSON.parse(t);
    const arr = Array.isArray(j) ? j : j.students || j.names || j.data || [];
    return [...new Set(arr.map(n => String(typeof n === 'object' ? (n?.name ?? '') : n).replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 500);
  }
  return [...new Set(t.split('\n').map(line => {
    let v = String(line).trim().replace(/^["'\uFEFF]+|["']+$/g, '');
    if (v.includes(',')) v = v.split(',')[0].trim().replace(/^["']|["']$/g, '');
    return v.replace(/\s+/g, ' ').trim();
  }).filter(v => v && !/^(الاسم|name|الطالب)$/i.test(v)))].slice(0, 500);
}

function Login({ onDone }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      localStorage.setItem('att_token', data.token);
      onDone(data);
    } catch (e2) { setErr(e2.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 overflow-hidden" style={{ backgroundImage: 'url(/gallery/school-gate.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' }}>
      <div className="absolute inset-0 bg-[#621244]/65" />
      <div className="relative w-full max-w-md text-center animate-fade-up">
        <img src="/hero-logo.png" alt="أكاديمية آفاق للفنون والثقافة" className="mx-auto w-40" />
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <span className="relative inline-block">
            منظومة الحضور والغياب
            <span className="absolute -bottom-1.5 right-0 w-full h-1 bg-[#fbe122] rounded-full" />
          </span>
        </h1>
        <p className="text-sm text-white/85 font-bold mt-3">الفنون البصرية — الأدائية — الموسيقى</p>
        <form onSubmit={submit} className="mt-7 bg-white rounded-3xl shadow-2xl p-7 md:p-8 space-y-4 text-right">
          <h2 className="font-black text-xl text-slate-900 text-center">تسجيل الدخول</h2>
          {err && <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 text-sm font-bold rounded-lg px-4 py-3">{err}</div>}
          <div>
            <label className="text-xs font-black text-slate-600">اسم المستخدم</label>
            <div className="relative mt-1.5">
              <input value={username} onChange={e => setUsername(e.target.value)} autoFocus dir="ltr" className="w-full border border-slate-300 rounded-xl pl-11 pr-4 py-3.5 font-bold outline-none focus:border-[#621244] focus:ring-4 focus:ring-[#621244]/10 transition text-left" />
              <UserRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-600">كلمة المرور</label>
            <div className="relative mt-1.5">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} dir="ltr" className="w-full border border-slate-300 rounded-xl pl-20 pr-11 py-3.5 font-bold outline-none focus:border-[#621244] focus:ring-4 focus:ring-[#621244]/10 transition text-left" />
              <LockKeyhole className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition" title={showPw ? 'إخفاء' : 'إظهار'}>
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button disabled={loading} className="w-full py-4 rounded-full bg-[#621244] text-white font-black text-base hover:bg-[#4a0d33] active:scale-[0.99] transition disabled:opacity-50 shadow-lg">{loading ? 'جاري التحقق...' : 'دخول'}</button>
        </form>
        <div className="flex items-center justify-center gap-5 mt-6">
          <img src="/logo-afaq.png" alt="وزارة الثقافة" className="h-9 object-contain brightness-0 invert" />
          <img src="/logo-edu.png" alt="وزارة التعليم" className="h-9 object-contain brightness-0 invert" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [view, setView] = useState('attendance');

  useEffect(() => {
    const t = localStorage.getItem('att_token');
    if (!t) return;
    api('/api/auth/me', {}).then(setAuth).catch(() => localStorage.removeItem('att_token'));
  }, []);

  if (!auth) return <Login onDone={setAuth} />;

  const { user, tracks, grades } = auth;
  const myTracks = user.role === 'teacher' ? tracks.filter(t => user.allowedTracks.includes(t.id)) : tracks;
  const myGrades = user.role === 'teacher' ? grades.filter(g => user.allowedGrades.includes(g.id)) : grades;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo-afaq.png" alt="وزارة الثقافة" className="h-11 object-contain" />
            <img src="/logo-edu.png" alt="وزارة التعليم" className="h-11 object-contain" />
            <div className="border-r border-slate-200 pr-3">
              <h1 className="font-black text-sm md:text-base leading-tight text-slate-900">منظومة الحضور والغياب</h1>
              <p className="text-[11px] text-slate-500 font-bold">أكاديمية آفاق للفنون والثقافة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full ${roleStyle[user.role]}`}>{roleLabel[user.role]}</span>
            <span className="text-xs font-bold text-slate-600">{user.displayName}</span>
            <button onClick={() => { localStorage.removeItem('att_token'); location.reload(); }} className="no-print flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#621244] hover:bg-[#4a0d33] px-4 py-1.5 rounded-full transition"><LogOut className="w-3.5 h-3.5" />خروج</button>
          </div>
        </div>
        <div className="h-1 bg-[#fbe122]" />
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 flex-1 w-full">
        <nav className="no-print bg-white rounded-full shadow-sm border border-slate-200 p-1.5 flex gap-1 overflow-x-auto mb-6 w-fit max-w-full">
          <NavBtn active={view === 'attendance'} onClick={() => setView('attendance')} icon={<ClipboardCheck className="w-4 h-4" />} label="تسجيل الحضور" />
          <NavBtn active={view === 'reports'} onClick={() => setView('reports')} icon={<BarChart3 className="w-4 h-4" />} label="التقارير" />
          {(user.role === 'admin' || user.role === 'supervisor') && <NavBtn active={view === 'students'} onClick={() => setView('students')} icon={<Users className="w-4 h-4" />} label="الطلاب" />}
          {(user.role === 'admin' || user.role === 'developer') && <NavBtn active={view === 'users'} onClick={() => setView('users')} icon={<UserCog className="w-4 h-4" />} label="المستخدمون" />}
          <NavBtn active={view === 'password'} onClick={() => setView('password')} icon={<KeyRound className="w-4 h-4" />} label="كلمة المرور" />
        </nav>

        <div className="animate-fade-up" key={view}>
          {view === 'attendance' && <AttendanceView myTracks={myTracks} myGrades={myGrades} />}
          {view === 'reports' && <ReportsView myTracks={myTracks} myGrades={myGrades} tracks={tracks} grades={grades} />}
          {view === 'students' && <StudentsView grades={grades} tracks={tracks} />}
          {view === 'users' && (user.role === 'admin' || user.role === 'developer') && <UsersView tracks={tracks} grades={grades} me={user} />}
          {view === 'password' && <PasswordView />}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="no-print mb-4">
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 relative inline-block">
        {children}
        <span className="absolute -bottom-1.5 right-0 w-2/3 h-1 bg-[#fbe122] rounded-full" />
      </h2>
      {sub && <p className="text-xs text-slate-500 font-bold mt-2.5">{sub}</p>}
    </div>
  );
}

function PageHero({ img, title, sub, color }) {
  return (
    <div className="no-print relative overflow-hidden rounded-3xl shadow-md">
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 opacity-[0.55]" style={{ backgroundColor: color || '#621244' }} />
      <div className="relative px-6 py-7 md:px-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow">
            <span className="relative inline-block">
              {title}
              <span className="absolute -bottom-1.5 right-0 w-2/3 h-1 bg-[#fbe122] rounded-full" />
            </span>
          </h2>
          {sub && <p className="text-sm text-white/80 font-bold mt-3">{sub}</p>}
        </div>
        <img src="/hero-logo.png" alt="أكاديمية آفاق" className="hidden md:block h-20 object-contain bg-white/10 rounded-2xl px-4 py-2 backdrop-blur-sm shrink-0" />
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="no-print mt-10 border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <img src="/logo-afaq.png" alt="وزارة الثقافة" className="h-10 object-contain" />
          <img src="/logo-edu.png" alt="وزارة التعليم" className="h-10 object-contain" />
        </div>
        <div className="text-[11px] text-slate-400 font-bold text-center">منظومة الحضور والغياب — أكاديمية آفاق للفنون والثقافة — جميع الحقوق محفوظة</div>
      </div>
    </footer>
  );
}
function NavBtn({ active, onClick, icon, label }) {
  return <button onClick={onClick} className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-lg transition whitespace-nowrap ${active ? 'bg-[#621244] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{icon}{label}</button>;
}

function StatCard({ label, value, sub, tone }) {
  const tones = {
    dark: 'bg-[#1f2937] text-white',
    green: 'bg-[#262674] text-white',
    red: 'bg-[#621244] text-white',
    gold: 'bg-[#d17e30] text-white',
  };
  return (
    <div className={`rounded-xl p-4 border border-slate-200 shadow-sm ${tones[tone] || tones.dark}`}>
      <div className="text-[11px] font-bold opacity-80">{label}</div>
      <div className="text-2xl font-black">{value}</div>
      {sub && <div className="text-[11px] font-bold opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

// ---------- تسجيل الحضور (شبكة أسبوعية) ----------
function AttendanceView({ myTracks, myGrades }) {
  const [track, setTrack] = useState(myTracks[0]?.id || '');
  const [gradeId, setGradeId] = useState(myGrades[0]?.id || '');
  const [weekId, setWeekId] = useState(() => findWeekForDate(todayStr()));
  const [dates, setDates] = useState([]);
  const [students, setStudents] = useState([]);
  const [grid, setGrid] = useState({});
  const [dirty, setDirty] = useState({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (!track || !gradeId || !weekId) return;
    setLoading(true); setMsg('');
    try {
      const st = await api(`/api/attendance/students?gradeId=${gradeId}&track=${track}`);
      setStudents(st);
      const wk = await api(`/api/attendance/week?weekId=${weekId}&track=${track}&gradeId=${gradeId}`);
      setDates(wk.dates);
      const m = {};
      wk.records.forEach(r => { m[`${r.studentId}|${r.date}`] = r.status; });
      setGrid(m);
      setDirty({});
    } catch (e) { setMsg(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [track, gradeId, weekId]);

  const toggle = (sid, date, type) => {
    const k = `${sid}|${date}`;
    setGrid(prev => {
      const cur = prev[k];
      const next = cur === type ? null : type;
      setDirty(d => ({ ...d, [k]: next }));
      if (next === null) { const n = { ...prev }; delete n[k]; return n; }
      return { ...prev, [k]: next };
    });
  };
  const markDayAll = (date, type) => {
    setGrid(prev => {
      const n = { ...prev };
      const d = {};
      students.forEach(s => { const k = `${s.id}|${date}`; n[k] = type; d[k] = type; });
      setDirty(old => ({ ...old, ...d }));
      return n;
    });
  };

  const filtered = useMemo(() => students.filter(s => s.name.includes(q.trim())), [students, q]);
  const stats = useMemo(() => {
    const vals = Object.values(grid);
    return { total: students.length, present: vals.filter(v => v === 'present').length, absent: vals.filter(v => v === 'absent').length };
  }, [grid, students]);
  const dirtyCount = Object.keys(dirty).length;
  const week = SEMESTER_SCHEDULE.find(w => w.id === weekId);
  const tCfg = trackStyle[track] || trackStyle.visual;
  const currentWeekId = findWeekForDate(todayStr());

  const save = async () => {
    const records = Object.entries(dirty).map(([k, status]) => {
      const [sid, date] = k.split('|');
      return { date, studentId: parseInt(sid, 10), status };
    });
    if (!records.length) { setMsg('لا توجد تغييرات للحفظ'); return; }
    setSaving(true); setMsg('');
    try {
      const r = await api('/api/attendance/week', { method: 'POST', body: { track, gradeId, records } });
      setMsg(`تم الحفظ — ${r.saved} تسجيل${r.deleted ? ` — حُذف ${r.deleted}` : ''} (${week?.label})`);
      setDirty({});
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const th = TRACK_THEMES[track] || TRACK_THEMES.visual;
  const themeVars = { '--track': th.primary, '--track-dark': th.dark };

  return (
    <div className="space-y-5" style={themeVars}>
      <div className="no-print relative overflow-hidden rounded-3xl shadow-md">
        <img src="/hero-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 opacity-[0.55]" style={{ backgroundColor: 'var(--track)' }} />
        <div className="relative px-6 py-8 md:px-10 md:py-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-black text-[#fbe122] tracking-widest drop-shadow-md">منظومة الحضور والغياب — أكاديمية آفاق للفنون والثقافة</div>
            <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white mt-2 drop-shadow-lg" style={{ fontFamily: "'Cairo', sans-serif" }}>
              <span className="relative inline-block pb-2">
                {myTracks.find(t => t.id === track)?.name}
                <span className="absolute -bottom-0.5 right-0 w-2/3 h-1.5 bg-[#fbe122] rounded-full" />
              </span>
            </h2>
            <p className="text-xs md:text-sm text-white/85 font-bold mt-2.5 drop-shadow" style={{ fontFamily: "'Cairo', sans-serif" }}>{myGrades.find(g => g.id === gradeId)?.name} — {SEMESTER_SCHEDULE.find(w => w.id === weekId)?.label} <span dir="ltr" className="text-white/70">({dates.length ? `${shortDM(dates[0])} - ${shortDM(dates[4])}` : ''})</span></p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 border border-white/25 backdrop-blur rounded-2xl px-6 py-4 text-center min-w-[104px]">
              <div className="text-xl md:text-2xl font-extrabold text-white drop-shadow">{stats.total}</div>
              <div className="text-xs font-black text-white/80 mt-1">طلاب الصف</div>
            </div>
            <div className="bg-white/10 border border-white/25 backdrop-blur rounded-2xl px-6 py-4 text-center min-w-[104px]">
              <div className="text-xl md:text-2xl font-extrabold text-[#fbe122] drop-shadow">{stats.present}</div>
              <div className="text-xs font-black text-white/80 mt-1">حضور الأسبوع</div>
            </div>
            <div className="bg-white/10 border border-white/25 backdrop-blur rounded-2xl px-6 py-4 text-center min-w-[104px]">
              <div className="text-xl md:text-2xl font-extrabold text-white drop-shadow">{stats.absent}</div>
              <div className="text-xs font-black text-white/80 mt-1">غياب الأسبوع</div>
            </div>
          </div>
        </div>
      </div>
      <div className="no-print grid md:grid-cols-3 gap-5">
        {myTracks.map(t => {
          const c = trackStyle[t.id] || trackStyle.visual;
          const on = track === t.id;
          return (
            <button key={t.id} onClick={() => setTrack(t.id)} className="bg-white rounded-3xl overflow-hidden text-right transition border-2 shadow-sm hover:shadow-md" style={track === t.id ? { borderColor: (TRACK_THEMES[t.id] || TRACK_THEMES.visual).primary, boxShadow: '0 10px 25px -10px rgba(0,0,0,0.35)' } : { borderColor: 'transparent' }}>
              <div className="relative h-28">
                <img src={c.img} alt={t.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                {on && <span className="absolute top-2 left-2 text-[10px] font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fbe122', color: (TRACK_THEMES[t.id] || TRACK_THEMES.visual).primary }}>المحددة</span>}
              </div>
              <div className="p-3.5 flex items-center gap-2.5">
                <span className={`p-2 rounded-xl border ${c.chip}`}>{c.icon}</span>
                <span className="font-black text-sm text-slate-900">{t.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="no-print bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {myGrades.map(g => <button key={g.id} onClick={() => setGradeId(g.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition ${gradeId === g.id ? 'text-white bg-[var(--track)] border-[var(--track)]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}><GraduationCap className="w-4 h-4" />{g.name}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <button onClick={() => setWeekId(w => Math.max(1, w - 1))} disabled={weekId <= 1} className="px-2 py-1 font-black text-slate-700 disabled:opacity-30">‹</button>
            <select value={weekId} onChange={e => setWeekId(parseInt(e.target.value, 10))} className="bg-transparent outline-none text-xs font-bold max-w-[220px] text-slate-800">
              {SEMESTER_SCHEDULE.map(w => <option key={w.id} value={w.id}>{w.label} ({weekRange(w)}){w.id === currentWeekId ? ' — الحالي' : ''}</option>)}
            </select>
            <button onClick={() => setWeekId(w => Math.min(19, w + 1))} disabled={weekId >= 19} className="px-2 py-1 font-black text-slate-700 disabled:opacity-30">›</button>
            {weekId !== currentWeekId && <button onClick={() => setWeekId(currentWeekId)} className="text-[10px] font-bold text-white px-2 py-1 rounded-md bg-[var(--track)]">الأسبوع الحالي</button>}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[160px]"><Search className="w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث باسم الطالب..." className="bg-transparent outline-none text-sm font-bold w-full" /></div>
          <button onClick={save} disabled={saving || !dirtyCount} className="flex items-center gap-1.5 text-sm font-black text-white px-6 py-2 rounded-full transition disabled:opacity-40 bg-[var(--track)] hover:bg-[var(--track-dark)]"><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : `حفظ الأسبوع${dirtyCount ? ` (${dirtyCount})` : ''}`}</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-lg bg-[var(--track)] hover:bg-[var(--track-dark)]"><Printer className="w-4 h-4" />طباعة</button>
        </div>
        {msg && <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">{msg}</div>}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto print-sheet print-shadow-none">
        <div className="print-head text-white px-5 py-4 flex flex-wrap justify-between items-center gap-3 border-b-4 border-[#fbe122] bg-[var(--track)]">
          <div>
            <div className="font-black text-base">منظومة الحضور والغياب — أكاديمية آفاق للفنون والثقافة</div>
            <div className="text-xs font-bold text-slate-300 mt-1">كشف الحضور الأسبوعي — {myTracks.find(t => t.id === track)?.name} — {myGrades.find(g => g.id === gradeId)?.name}</div>
          </div>
          <div className="text-center">
            <div className="font-black text-sm">{week?.label}</div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5" dir="ltr">{dates.length ? `${shortDM(dates[0])} - ${shortDM(dates[4])}` : ''}</div>
          </div>
        </div>
        {loading ? <div className="p-10 text-center font-bold text-slate-400">جاري تحميل الكشف...</div> : (
          <table className="att-table w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-[11px] text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="p-2 w-10">#</th>
                <th className="p-2 text-right min-w-[150px]">اسم الطالب</th>
                {dates.map((d, i) => (
                  <th key={d} className="p-2 border-r border-slate-100" style={{ backgroundColor: 'color-mix(in srgb, var(--track) 7%, white)' }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-bold text-[var(--track)]">{DAY_NAMES[i]}</span>
                      <span dir="ltr" className="text-[10px] font-bold text-slate-500">{shortDM(d)}</span>
                      <button onClick={() => markDayAll(d, 'present')} title="تحديد الكل حاضر لهذا اليوم" className="no-print text-[10px] font-bold text-[var(--track)] hover:underline">الكل حاضر</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition att-row">
                  <td className="p-2 text-center font-bold text-slate-300">{i + 1}</td>
                  <td className="p-2"><span className="flex items-center gap-2"><span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 print-avatar ${avatarTones[s.id % avatarTones.length]}`}>{s.name.trim()[0]}</span><span className="font-bold text-slate-800">{s.name}</span></span></td>
                  {dates.map(d => {
                    const cur = grid[`${s.id}|${d}`];
                    return (
                      <td key={d} className="p-1.5 text-center border-r border-slate-100">
                        <div className="no-print flex justify-center gap-1">
                          <button onClick={() => toggle(s.id, d, 'present')} title="حاضر" className={`w-9 h-9 rounded-md border font-black text-sm transition ${cur === 'present' ? 'text-white bg-[var(--track)] border-[var(--track-dark)]' : 'bg-white border-slate-300 text-slate-400 hover:border-[var(--track)]'}`}>ح</button>
                          <button onClick={() => toggle(s.id, d, 'absent')} title="غائب" className={`w-9 h-9 rounded-md border font-black text-sm transition ${cur === 'absent' ? 'bg-[#621244] border-[#4a0d33] text-white' : 'bg-white border-slate-300 text-slate-400 hover:border-[#621244]'}`}>غ</button>
                        </div>
                        {(cur === 'late' || cur === 'excused') && <div className="no-print text-[10px] font-bold text-amber-700 mt-0.5">{cur === 'late' ? 'متأخر' : 'مستأذن'}</div>}
                        <div className={`hidden print:block font-black print-mark ${cur === 'present' ? 'print-p' : cur === 'absent' ? 'print-a' : ''}`}>{cur === 'present' ? 'ح' : cur === 'absent' ? 'غ' : cur === 'late' ? 'م' : cur === 'excused' ? 'ع' : '—'}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold">{students.length ? 'لا نتائج مطابقة للبحث' : 'لا يوجد طلاب في هذا الصف — أضفهم من صفحة الطلاب'}</td></tr>}
            </tbody>
          </table>
        )}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="bg-white border border-slate-200 px-3 py-1 rounded-md">الحضور: {stats.present}</span>
          <span className="bg-white border border-slate-200 px-3 py-1 rounded-md">الغياب: {stats.absent}</span>
          <span className="bg-white border border-slate-200 px-3 py-1 rounded-md">الطلاب: {stats.total}</span>
          {dirtyCount > 0 && <span className="no-print bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1 rounded-md">تغييرات غير محفوظة: {dirtyCount}</span>}
        </div>
        <div className="hidden print:block px-6 pb-5 pt-2">
          <div className="text-center text-[10px] font-bold print-foot mt-1">طُبع بتاريخ <span dir="ltr">{todayStr()}</span> — أكاديمية آفاق للفنون والثقافة</div>
        </div>
      </div>
    </div>
  );
}

// ---------- التقارير ----------
function ReportsView({ myTracks, myGrades, tracks, grades }) {
  const [from, setFrom] = useState(todayStr().slice(0, 8) + '01');
  const [to, setTo] = useState(todayStr());
  const [track, setTrack] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const tName = (id) => tracks.find(t => t.id === id)?.name || id;
  const gName = (id) => grades.find(g => g.id === id)?.name || id;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;

  const run = async () => {
    setMsg('');
    try {
      const q = new URLSearchParams({ from, to });
      if (track) q.set('track', track);
      if (gradeId) q.set('gradeId', gradeId);
      const data = await api('/api/attendance/report?' + q.toString());
      setRows(data.rows);
      setMsg(`السجلات: ${data.count} — الطلاب: ${data.rows.length}`);
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { run(); }, []);

  const csv = () => {
    const head = 'الطالب,المادة,الصف,حاضر,غائب,متأخر,مستأذن,الإجمالي,النسبة%';
    const lines = rows.map(r => [r.studentName, tName(r.track), gName(r.gradeId), r.present, r.absent, r.late, r.excused, r.total, r.rate].join(','));
    const blob = new Blob(['\ufeff' + head + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `تقرير_الحضور_${from}_${to}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <PageHero img="/gallery/c4_s.jpg" title="تقارير الحضور" sub="نسب الحضور والغياب لكل طالب حسب الفترة المحددة" />
      <div className="no-print bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        <label className="text-[11px] font-bold text-slate-500">من:<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="block border border-slate-300 rounded-lg px-3 py-1.5 font-bold mt-1 text-slate-800" /></label>
        <label className="text-[11px] font-bold text-slate-500">إلى:<input type="date" value={to} onChange={e => setTo(e.target.value)} className="block border border-slate-300 rounded-lg px-3 py-1.5 font-bold mt-1 text-slate-800" /></label>
        <label className="text-[11px] font-bold text-slate-500">المادة:<select value={track} onChange={e => setTrack(e.target.value)} className="block border border-slate-300 rounded-lg px-3 py-1.5 font-bold mt-1 text-slate-800"><option value="">الكل</option>{myTracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-[11px] font-bold text-slate-500">الصف:<select value={gradeId} onChange={e => setGradeId(e.target.value)} className="block border border-slate-300 rounded-lg px-3 py-1.5 font-bold mt-1 text-slate-800"><option value="">الكل</option>{myGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <button onClick={run} className="bg-[#621244] text-white text-sm font-bold px-6 py-2 rounded-full">عرض التقرير</button>
        <button onClick={csv} className="flex items-center gap-1.5 bg-[#621244] text-white text-sm font-bold px-4 py-2 rounded-lg"><FileDown className="w-4 h-4" />تصدير CSV</button>
        <button onClick={() => window.print()} className="bg-white border border-slate-300 text-slate-700 text-sm font-bold px-4 py-2 rounded-lg">طباعة</button>
        {msg && <span className="text-[11px] font-bold text-slate-400">{msg}</span>}
      </div>
      <div className="no-print grid grid-cols-3 gap-3">
        <StatCard label="عدد الطلاب" value={rows.length} tone="dark" />
        <StatCard label="متوسط الحضور" value={avg + '%'} tone="green" />
        <StatCard label="الفترة" value="مخصصة" sub={`${from} ← ${to}`} tone="gold" />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-slate-900 border-b border-slate-200 text-sm">تقرير الحضور <span className="text-slate-400 text-xs font-bold">({from} ← {to})</span></div>
        <table className="w-full text-sm">
          <thead><tr className="text-[11px] text-slate-500 bg-slate-50 border-b border-slate-200"><th className="p-3 text-right">الطالب</th><th className="p-3">المادة</th><th className="p-3">الصف</th><th className="p-3">حاضر</th><th className="p-3">غائب</th><th className="p-3">النسبة</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="p-3 font-bold text-slate-800">{r.studentName}</td>
              <td className="p-3 text-center text-xs font-bold text-slate-600">{tName(r.track)}</td>
              <td className="p-3 text-center text-[11px] text-slate-500 font-bold">{gName(r.gradeId)}</td>
              <td className="p-3 text-center text-emerald-700 font-black">{r.present}</td>
              <td className="p-3 text-center text-rose-700 font-black">{r.absent}</td>
              <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.rate >= 85 ? 'bg-[#621244]' : r.rate >= 60 ? 'bg-[#d17e30]' : 'bg-[#621244]'}`} style={{ width: r.rate + '%' }} /></div><span className="font-black text-xs w-10 text-slate-700">{r.rate}%</span></div></td>
            </tr>))}
            {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-bold">لا توجد بيانات في الفترة المحددة</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- الطلاب (قائمة مستقلة لكل مادة × صف) ----------
function StudentsView({ grades, tracks }) {
  const trackName = (id) => tracks.find(t => t.id === id)?.name || id;
  const [track, setTrack] = useState('visual');
  const [gradeId, setGradeId] = useState('grade4');
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [bulk, setBulk] = useState('');
  const [msg, setMsg] = useState('');
  const [fileMsg, setFileMsg] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const [editing, setEditing] = useState(null); // {id,name,track,gradeId,moveRecords}
  const load = async (t = track, g = gradeId) => {
    try { setList(await api(`/api/attendance/students?gradeId=${g}&track=${t}`)); } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [track, gradeId]);
  const add = async () => {
    if (!name.trim()) return;
    try { await api('/api/attendance/students', { method: 'POST', body: { name: name.trim(), gradeId, track } }); setName(''); load(); } catch (e) { setMsg(e.message); }
  };
  const addBulk = async () => {
    const names = bulk.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    try { const r = await api('/api/attendance/students/bulk', { method: 'POST', body: { gradeId, track, names } }); setMsg(`تمت إضافة ${r.added} — مكرر: ${r.skipped}`); setBulk(''); load(); } catch (e) { setMsg(e.message); }
  };
  const importFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFileBusy(true); setFileMsg('جاري قراءة الملف...');
    try {
      const names = parseNamesFile(await f.text());
      if (!names.length) throw new Error('لم يتم العثور على أسماء في الملف');
      const r = await api('/api/attendance/students/bulk', { method: 'POST', body: { gradeId, track, names } });
      setFileMsg(`تم الاستيراد — جديد: ${r.added} — مكرر: ${r.skipped} (من ${names.length} اسم)`);
      load();
    } catch (err) { setFileMsg(err.message); }
    finally { setFileBusy(false); }
  };
  const saveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    try {
      await api(`/api/attendance/students/${editing.id}`, { method: 'PATCH', body: { name: editing.name.trim(), track: editing.track, gradeId: editing.gradeId, moveRecords: editing.moveRecords } });
      setEditing(null); load();
    } catch (e) { setMsg(e.message); }
  };
  const del = async (id) => {
    if (!confirm('حذف الطالب وسجلات حضوره نهائياً؟')) return;
    try { await api(`/api/attendance/students/${id}`, { method: 'DELETE' }); load(); } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="space-y-4">
      <PageHero img="/gallery/b1_s.jpg" title="إدارة الطلاب" sub="قائمة مستقلة لكل مادة وصف — 12 قائمة" color={(TRACK_THEMES[track] || TRACK_THEMES.visual).primary} />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2">{tracks.map(t => <button key={t.id} onClick={() => setTrack(t.id)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${track === t.id ? 'bg-[#621244] text-white border-[#621244]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{t.icon} {t.name}</button>)}</div>
        <div className="flex flex-wrap gap-2">{grades.map(g => <button key={g.id} onClick={() => setGradeId(g.id)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${gradeId === g.id ? 'bg-[#621244] text-white border-[#621244]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{g.name} <span className="opacity-60">({list.length})</span></button>)}</div>
        <div className="text-[11px] font-bold text-slate-500">القائمة الحالية: {trackName(track)} — {grades.find(g => g.id === gradeId)?.name} ({list.length} طالب)</div>
        <div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="اسم طالب جديد..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 font-bold outline-none focus:border-[#621244]" /><button onClick={add} className="flex items-center gap-1 bg-[#621244] text-white text-sm font-bold px-5 py-2 rounded-lg"><Plus className="w-4 h-4" />إضافة</button></div>
        <div className="flex gap-2"><textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={3} placeholder="لصق جماعي — كل اسم في سطر مستقل" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#621244]" /><button onClick={addBulk} className="bg-[#621244] text-white text-sm font-bold px-5 py-2 rounded-lg h-fit">لصق جماعي</button></div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <label className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition border ${fileBusy ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-300 hover:border-[#621244]'}`}><FileUp className="w-4 h-4" />{fileBusy ? 'جاري الاستيراد...' : 'استيراد ملف (CSV / JSON)'}<input type="file" accept=".json,.csv,.txt" className="hidden" onChange={importFile} disabled={fileBusy} /></label>
          <span className="text-[11px] text-slate-400 font-bold">إلى القائمة الحالية فقط</span>
        </div>
        {(fileMsg || msg) && <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">{fileMsg || msg}</div>}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {list.map((s, i) => (
          <div key={s.id} className="border-t first:border-0 border-slate-100 px-4 py-2.5 hover:bg-slate-50">
            {editing?.id === s.id ? (
              <div className="space-y-2">
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-[#621244]" />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={editing.track} onChange={e => setEditing({ ...editing, track: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold">{tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <select value={editing.gradeId} onChange={e => setEditing({ ...editing, gradeId: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold">{grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600"><input type="checkbox" checked={editing.moveRecords} onChange={e => setEditing({ ...editing, moveRecords: e.target.checked })} className="accent-slate-900" />نقل سجلات حضوره معه</label>
                  <button onClick={saveEdit} className="text-xs font-bold bg-[#621244] text-white px-3 py-1.5 rounded-lg">حفظ</button>
                  <button onClick={() => setEditing(null)} className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg">إلغاء</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2.5 text-slate-800"><span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${avatarTones[s.id % avatarTones.length]}`}>{s.name.trim()[0]}</span>{i + 1}. {s.name}</span>
                <span className="flex gap-1">
                  <button onClick={() => setEditing({ id: s.id, name: s.name, track: s.track || track, gradeId: s.gradeId || gradeId, moveRecords: true })} className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg">تعديل / نقل</button>
                  <button onClick={() => del(s.id)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                </span>
              </div>
            )}
          </div>
        ))}
        {!list.length && <div className="p-10 text-center text-slate-400 font-bold">لا يوجد طلاب في هذه القائمة بعد</div>}
      </div>
    </div>
  );
}

// ---------- المستخدمون ----------
function UsersView({ tracks, grades, me }) {
  const isDev = me?.role === 'developer';
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'teacher', allowedTracks: ['visual'], allowedGrades: ['grade4'] });
  const [msg, setMsg] = useState('');
  const load = async () => { try { setList(await api('/api/auth/users')); } catch (e) { setMsg(e.message); } };
  useEffect(() => { load(); }, []);
  const toggle = (key, id) => setForm(f => ({ ...f, [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id] }));
  const create = async () => {
    try { await api('/api/auth/users', { method: 'POST', body: form }); setMsg('تم إنشاء الحساب بنجاح'); setForm({ username: '', password: '', displayName: '', role: 'teacher', allowedTracks: ['visual'], allowedGrades: ['grade4'] }); load(); }
    catch (e) { setMsg(e.message); }
  };
  const remove = async (id) => { if (!confirm('حذف المستخدم نهائياً؟')) return; try { await api(`/api/auth/users/${id}`, { method: 'DELETE' }); load(); } catch (e) { setMsg(e.message); } };
  const setActive = async (u) => { try { await api(`/api/auth/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }); load(); } catch (e) { setMsg(e.message); } };
  const resetPw = async (u) => { const p = prompt(`كلمة مرور جديدة لـ ${u.username} (6 أحرف على الأقل)`); if (!p) return; try { await api(`/api/auth/users/${u.id}`, { method: 'PATCH', body: { password: p } }); setMsg('تم تعيين كلمة المرور'); } catch (e) { setMsg(e.message); } };
  return (
    <div className="space-y-4">
      <PageHero img="/gallery/d2_s.jpg" title="المستخدمون والصلاحيات" sub="إنشاء الحسابات وإسناد المواد والصفوف" />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
        <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm"><UserCog className="w-5 h-5" />إنشاء حساب جديد</h3>
        <div className="grid md:grid-cols-4 gap-2">
          <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="اسم المستخدم" dir="ltr" className="border border-slate-300 rounded-lg px-3 py-2 font-bold outline-none focus:border-[#621244] text-left" />
          <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="كلمة المرور" dir="ltr" className="border border-slate-300 rounded-lg px-3 py-2 font-bold outline-none focus:border-[#621244] text-left" />
          <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="الاسم المعروض" className="border border-slate-300 rounded-lg px-3 py-2 font-bold outline-none focus:border-[#621244]" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"><option value="teacher">معلم</option><option value="supervisor">مشرف</option><option value="admin">مدير</option>{isDev && <option value="developer">مطور المنصة</option>}</select>
        </div>
        <div className="text-xs font-bold text-slate-600">المواد:<div className="flex gap-1.5 mt-1.5 flex-wrap">{tracks.map(t => <button key={t.id} onClick={() => toggle('allowedTracks', t.id)} className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition ${form.allowedTracks.includes(t.id) ? 'bg-[#621244] text-white border-[#621244]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{t.icon} {t.name}</button>)}</div></div>
        <div className="text-xs font-bold text-slate-600">الصفوف:<div className="flex gap-1.5 mt-1.5 flex-wrap">{grades.map(g => <button key={g.id} onClick={() => toggle('allowedGrades', g.id)} className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition ${form.allowedGrades.includes(g.id) ? 'bg-[#621244] text-white border-[#621244]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{g.short}</button>)}</div></div>
        <button onClick={create} className="flex items-center gap-1.5 bg-[#621244] text-white text-sm font-bold px-6 py-2.5 rounded-lg"><Check className="w-4 h-4" />إنشاء الحساب</button>
        {msg && <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">{msg}</div>}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {list.map(u => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-t first:border-0 border-slate-100 px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center gap-3"><span className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${avatarTones[u.id % avatarTones.length]}`}>{u.displayName.trim()[0]}</span>
              <div><div className="font-black text-sm text-slate-900">{u.displayName} <span className="text-[11px] text-slate-400 font-mono" dir="ltr">@{u.username}</span> <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleStyle[u.role]}`}>{roleLabel[u.role]}</span></div>
              <div className="text-[11px] text-slate-500 font-bold">المواد: {(u.allowedTracks.length ? u.allowedTracks : ['الكل']).join('،')} — الصفوف: {(u.allowedGrades.length ? u.allowedGrades : ['الكل']).join('،')} — {u.active ? 'نشط' : 'موقوف'}</div></div></div>
            <div className="flex gap-1.5">
              {(u.role === 'admin' || u.role === 'developer') && !isDev ? (
                <span className="text-[11px] font-bold text-slate-400">إدارة هذا الحساب للمطور فقط</span>
              ) : (
                <>
              <button onClick={() => setActive(u)} className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">{u.active ? 'إيقاف' : 'تفعيل'}</button>
              <button onClick={() => resetPw(u)} className="text-xs font-bold bg-white border border-slate-300 hover:border-slate-500 text-slate-700 px-3 py-1.5 rounded-lg">تعيين كلمة</button>
              <button onClick={() => remove(u.id)} className="text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg"><X className="w-3 h-3 inline" />حذف</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PasswordView() {
  const [o, setO] = useState(''); const [n, setN] = useState(''); const [msg, setMsg] = useState('');
  const save = async () => {
    try { await api('/api/auth/change-password', { method: 'POST', body: { oldPassword: o, newPassword: n } }); setMsg('تم تغيير كلمة المرور بنجاح'); setO(''); setN(''); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div className="space-y-4">
      <PageHero img="/hero-bg.jpg" title="كلمة المرور" sub="تغيير كلمة المرور الخاصة بك" />
    <div className="max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
      <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm"><KeyRound className="w-5 h-5" />تغيير كلمة المرور</h3>
      <input value={o} onChange={e => setO(e.target.value)} type="password" placeholder="كلمة المرور الحالية" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-bold outline-none focus:border-[#621244]" />
      <input value={n} onChange={e => setN(e.target.value)} type="password" placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-bold outline-none focus:border-[#621244]" />
      <button onClick={save} className="bg-[#621244] text-white font-bold px-6 py-2.5 rounded-lg">حفظ التغيير</button>
      {msg && <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">{msg}</div>}
    </div>
    </div>
  );
}
