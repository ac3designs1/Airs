import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, Shield, Clock, TrendingUp,
  FileText, ChevronRight, Activity, Star, ArrowRightLeft,
  ClipboardList, Radio, MapPin, Zap, AlertOctagon, Siren
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  total_officers: number; on_duty: number; active_warrants: number;
  active_bolos: number; active_calls: number; total_incidents: number;
  pending_calls: number; total_citizens: number;
  recent_activity: { id: string; action: string; officer_name: string; details: string; created_at: string }[];
}
interface Call { id: string; call_number: string; type: string; location: string; priority: number; status: string; created_at: string; }

const P_COLOR: Record<number, string> = { 1: 'p1', 2: 'p2', 3: 'p3' };
const P_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };

const QUICK = [
  { to: '/roster',         icon: Users,          label: 'Roster',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.20)' },
  { to: '/warrants',       icon: AlertTriangle,  label: 'Warrants', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.20)' },
  { to: '/in-city-requests', icon: Radio,        label: 'Dispatch', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.20)' },
  { to: '/fpo-tracker',    icon: Shield,         label: 'FPO',      color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.20)' },
  { to: '/shifts',         icon: Clock,          label: 'Shifts',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.20)' },
  { to: '/certifications', icon: Star,           label: 'Certs',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.20)' },
  { to: '/leave-requests', icon: ArrowRightLeft, label: 'Leave',    color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.20)' },
  { to: '/reports',        icon: FileText,       label: 'Reports',  color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.20)' },
] as const;

export default function Dashboard() {
  const { auth } = useAuth();
  const user = auth.user!;
  const isAdmin = ['admin', 'administrator', 'leadership', 'senior_command'].includes(user.role);

  const [stats, setStats] = useState<Stats | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dispatch/stats'),
      api.get('/dispatch?status=active&limit=6'),
    ]).then(([sRes, cRes]) => {
      setStats(sRes.data);
      setCalls(cRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dutyPct = stats ? Math.round((stats.on_duty / Math.max(stats.total_officers, 1)) * 100) : 0;
  const statusColor = user.status === 'on_duty' ? '#22c55e' : user.status === 'busy' ? '#eab308' : '#475569';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Welcome banner ────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(2,132,199,0.18) 0%, rgba(14,165,233,0.08) 40%, rgba(99,102,241,0.10) 100%)',
          border: '1px solid rgba(14,165,233,0.20)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 32px rgba(14,165,233,0.08)',
        }}>
        {/* Glow orb */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14), transparent 65%)' }} />
        <div className="absolute -left-8 -bottom-8 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 65%)' }} />
        {/* Scan line */}
        <div className="absolute top-0 left-0 w-full h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.5), transparent)' }} />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-glow-blue"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #6366f1)', boxShadow: '0 0 24px rgba(14,165,233,0.35)' }}>
                  {user.first_name[0]}{user.last_name[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ background: statusColor, borderColor: '#060810', boxShadow: `0 0 8px ${statusColor}99` }}>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    Welcome back, {(user as unknown as { in_city_name?: string }).in_city_name || user.first_name}
                  </h1>
                  <span className="chip chip-green text-[10px] hidden sm:inline-flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  <span className="text-slate-300 font-semibold">{user.rank}</span>
                  <span className="text-slate-600 mx-2">·</span>
                  {user.department}
                  {user.callsign && <><span className="text-slate-600 mx-2">·</span><span className="font-mono text-sky-400">{user.callsign}</span></>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-white text-sm font-semibold">{new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="text-slate-500 text-xs mt-0.5">Melbourne · AEST</div>
              </div>
              {isAdmin && (
                <Link to="/command-centre"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5', boxShadow: '0 0 12px rgba(239,68,68,0.10)' }}>
                  <AlertOctagon className="w-4 h-4" />
                  <span className="hidden sm:inline">Command Centre</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total Officers', value: stats?.total_officers ?? '—', icon: Users,         color: '#0ea5e9', to: '/roster' },
          { label: 'On Duty',        value: stats ? `${stats.on_duty}/${stats.total_officers}` : '—', icon: Activity, color: '#22c55e' },
          { label: 'Active Calls',   value: stats?.active_calls ?? '—',   icon: Siren,         color: '#a78bfa', pulse: (stats?.active_calls ?? 0) > 0 },
          { label: 'Warrants',       value: stats?.active_warrants ?? '—', icon: AlertTriangle, color: '#ef4444', to: '/warrants' },
          { label: 'BOLOs',          value: stats?.active_bolos ?? '—',   icon: Shield,        color: '#f59e0b' },
          { label: 'Citizens',       value: stats?.total_citizens ?? '—', icon: FileText,      color: '#64748b' },
        ].map(s => {
          const inner = (
            <div className="stat-card group h-full"
              style={{ borderColor: `${s.color}28` }}>
              {s.pulse && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle at 80% 20%, ${s.color}0A, transparent 60%)` }} />
              )}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-600 mb-2.5 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-black text-white">{loading ? <span className="skeleton block w-8 h-6" /> : s.value}</p>
                </div>
                <div className="p-2.5 rounded-xl flex-shrink-0 mt-0.5" style={{ background: `${s.color}15` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
              </div>
              {s.to && <ChevronRight className="absolute bottom-4 right-4 w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />}
            </div>
          );
          return s.to
            ? <Link key={s.label} to={s.to} className="block">{inner}</Link>
            : <div key={s.label}>{inner}</div>;
        })}
      </div>

      {/* ── Duty coverage bar ─────────────────────────────────── */}
      {stats && (
        <div className="glass p-4 rounded-xl flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.9)' }} />
            <span className="text-xs font-semibold text-slate-500">Duty Coverage</span>
          </div>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(14,165,233,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${dutyPct}%`, background: 'linear-gradient(to right, #0ea5e9, #22c55e)' }} />
          </div>
          <span className="text-sm font-black text-sky-400 flex-shrink-0 font-mono">{dutyPct}%</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* ── Active dispatch calls ──────────────────────────── */}
        <div className="xl:col-span-8 glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.18)' }}>
                <Radio className="w-4 h-4" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Active Dispatch</h2>
                <p className="text-[11px] text-slate-500">Live calls in queue</p>
              </div>
            </div>
            <Link to="/in-city-requests"
              className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-2.5">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl skeleton" />)}
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.08)' }}>
                  <Zap className="w-7 h-7 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-slate-600">All clear — no active calls</p>
                <p className="text-xs text-slate-700 mt-1">New calls will appear here in real time</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map(c => (
                  <div key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${c.priority === 1 ? 'p1-pulse' : ''}`}
                    style={{ background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.07)' }}>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0 ${P_COLOR[c.priority] ?? 'chip-gray'}`}>
                      {P_LABEL[c.priority] ?? 'P?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{c.type}</span>
                        <span className="font-mono text-[10px] text-slate-600 flex-shrink-0">{c.call_number}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${c.status === 'active' ? 'chip-green' : c.status === 'pending' ? 'chip-yellow' : 'chip-gray'}`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] text-slate-600 hidden sm:block">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────── */}
        <div className="xl:col-span-4 flex flex-col gap-4">

          {/* Quick access */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Quick Access</h2>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map(q => (
                <Link key={q.to} to={q.to}
                  className="group flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
                  style={{ background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.07)' }}>
                  <div className="p-2 rounded-lg transition-all group-hover:shadow-lg"
                    style={{ background: q.bg, border: `1px solid ${q.border}` }}>
                    <q.icon className="w-3.5 h-3.5" style={{ color: q.color }} />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 group-hover:text-slate-300 transition-colors text-center leading-tight">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Officer record */}
          <div className="glass rounded-2xl p-5 flex-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Your Record</h2>
            <div className="space-y-0">
              {[
                { label: 'Callsign',   value: user.callsign || '—',                 mono: true,  color: '#38bdf8' },
                { label: 'Rank',       value: user.rank },
                { label: 'Division',   value: user.department },
                { label: 'Role',       value: user.role?.replace(/_/g, ' '),        cap: true },
                { label: 'Status',     value: user.status?.replace(/_/g, ' '),      cap: true,   color: user.status === 'on_duty' ? '#22c55e' : user.status === 'busy' ? '#eab308' : undefined },
              ].map((row, i, arr) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: 'rgba(14,165,233,0.06)' }}>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.cap ? 'capitalize' : ''} ${row.mono ? 'font-mono text-sm' : ''}`}
                    style={{ color: row.color ?? '#cbd5e1' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link to="/shifts"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-sky-400 transition-all hover:bg-sky-500/5"
                style={{ border: '1px solid rgba(14,165,233,0.09)' }}>
                <Clock className="w-3.5 h-3.5" /> My Shifts
              </Link>
              <Link to="/statistics"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-sky-400 transition-all hover:bg-sky-500/5"
                style={{ border: '1px solid rgba(14,165,233,0.09)' }}>
                <TrendingUp className="w-3.5 h-3.5" /> Statistics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent activity ────────────────────────────────────── */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.14)' }}>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Recent Activity</h2>
              <p className="text-[11px] text-slate-500">Latest system events</p>
            </div>
          </div>
          <div>
            {stats.recent_activity.slice(0, 8).map((a, i) => (
              <div key={a.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-sky-500/[0.02] transition-colors"
                style={{ borderBottom: i < Math.min(stats.recent_activity.length, 8) - 1 ? '1px solid rgba(14,165,233,0.05)' : 'none' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#0ea5e9', boxShadow: '0 0 4px rgba(14,165,233,0.6)' }} />
                  <span className="text-sm text-slate-400 truncate">{a.details ?? a.action}</span>
                  {a.officer_name && <span className="text-xs text-slate-600 hidden sm:block flex-shrink-0">· {a.officer_name}</span>}
                </div>
                <span className="text-[10px] text-slate-600 font-mono flex-shrink-0 ml-4">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin shortcut ─────────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/leadership-applications', icon: ClipboardList, label: 'Applications', desc: 'Review pending officer applications', color: '#22c55e' },
            { to: '/command-centre',          icon: AlertOctagon,  label: 'Command Centre', desc: 'Live ops, alerts & announcements',  color: '#ef4444' },
            { to: '/promotions',              icon: TrendingUp,    label: 'Promotions',  desc: 'Manage officer rank promotions',     color: '#f59e0b' },
          ].map(s => (
            <Link key={s.to} to={s.to}
              className="glass rounded-xl p-4 flex items-center gap-3 hover:scale-[1.01] transition-all group">
              <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{s.label}</p>
                <p className="text-xs text-slate-500 truncate">{s.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
