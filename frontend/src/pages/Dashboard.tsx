import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, Siren, Shield, Clock, TrendingUp,
  FileText, ChevronRight, Activity, Star, ArrowRightLeft,
  ClipboardList, BarChart2, Settings, Radio, MapPin, Zap, AlertOctagon
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
  { to: '/roster', icon: Users, label: 'Roster', color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
  { to: '/warrants', icon: AlertTriangle, label: 'Warrants', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  { to: '/in-city-requests', icon: Radio, label: 'Dispatch', color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  { to: '/fpo-tracker', icon: Shield, label: 'FPO', color: '#f43f5e', bg: 'rgba(244,63,94,0.10)' },
  { to: '/shifts', icon: Clock, label: 'Shifts', color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  { to: '/certifications', icon: Star, label: 'Certs', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  { to: '/leave-requests', icon: ArrowRightLeft, label: 'Leave', color: '#818cf8', bg: 'rgba(129,140,248,0.10)' },
  { to: '/reports', icon: FileText, label: 'Reports', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
] as const;

export default function Dashboard() {
  const { auth } = useAuth();
  const user = auth.user!;
  const isAdmin = ['administrator', 'leadership', 'senior_command'].includes(user.role);

  const [stats, setStats] = useState<Stats | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dispatch/stats'),
      api.get('/dispatch?limit=6'),
    ]).then(([sRes, cRes]) => {
      setStats(sRes.data);
      setCalls(cRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dutyPct = stats ? Math.round((stats.on_duty / Math.max(stats.total_officers, 1)) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Welcome banner ────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden scan-line"
        style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.15) 0%, rgba(14,165,233,0.06) 40%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(14,165,233,0.18)' }}>
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12), transparent 70%)' }} />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-glow-blue flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0284c7, #6366f1)' }}>
                {user.first_name[0]}{user.last_name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome back, {user.first_name}</h1>
                  <span className="chip chip-green text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-0.5 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-slate-500 text-sm">
                  {user.rank} · {user.department}{user.callsign ? ` · ${user.callsign}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-white text-sm font-semibold">{new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="text-slate-500 text-xs mt-0.5">Melbourne Time (AEST)</div>
              </div>
              {isAdmin && (
                <Link to="/command-centre"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                  <AlertOctagon className="w-4 h-4" />
                  <span className="hidden sm:inline">Command Centre</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI stat strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total Officers', value: stats?.total_officers ?? '—', icon: Users, color: '#0ea5e9', border: 'rgba(14,165,233,0.18)', to: '/roster' },
          { label: 'On Duty', value: `${stats?.on_duty ?? '—'}${stats ? ` / ${stats.total_officers}` : ''}`, icon: Activity, color: '#22c55e', border: 'rgba(34,197,94,0.18)' },
          { label: 'Active Calls', value: stats?.active_calls ?? '—', icon: Siren, color: '#a78bfa', border: 'rgba(167,139,250,0.18)', pulse: (stats?.active_calls ?? 0) > 0 },
          { label: 'Active Warrants', value: stats?.active_warrants ?? '—', icon: AlertTriangle, color: '#ef4444', border: 'rgba(239,68,68,0.18)', to: '/warrants' },
          { label: 'Active BOLOs', value: stats?.active_bolos ?? '—', icon: Shield, color: '#f59e0b', border: 'rgba(245,158,11,0.18)' },
          { label: 'Citizens', value: stats?.total_citizens ?? '—', icon: FileText, color: '#64748b', border: 'rgba(100,116,139,0.18)' },
        ].map(s => {
          const inner = (
            <div className="stat-card group relative overflow-hidden"
              style={{ borderColor: s.border }}>
              {s.pulse && <div className="absolute inset-0 rounded-2xl animate-ping opacity-10" style={{ background: s.color, animationDuration: '2s' }} />}
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-2">{s.label}</p>
                  <p className="text-2xl font-bold text-white">{loading ? '—' : s.value}</p>
                </div>
                <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${s.color}18` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
              </div>
              {s.to && <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />}
            </div>
          );
          return s.to ? <Link key={s.label} to={s.to}>{inner}</Link> : <div key={s.label}>{inner}</div>;
        })}
      </div>

      {/* ── Duty bar ───────────────────────────────────────── */}
      {stats && (
        <div className="glass p-4 rounded-xl flex items-center gap-4">
          <span className="text-xs text-slate-500 flex-shrink-0">Duty Coverage</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(14,165,233,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${dutyPct}%`, background: 'linear-gradient(to right, #0ea5e9, #22c55e)' }} />
          </div>
          <span className="text-xs font-bold text-sky-400 flex-shrink-0">{dutyPct}%</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Active Dispatch Calls ─────────────────────────── */}
        <div className="xl:col-span-8 glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(167,139,250,0.12)' }}>
                <Radio className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#a78bfa' }} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Active Dispatch</h2>
                <p className="text-[11px] text-slate-500">Live calls — refreshing</p>
              </div>
            </div>
            <Link to="/in-city-requests"
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl skeleton" />)}
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <Zap className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No active calls — all clear</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map(c => (
                  <div key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-default ${c.priority === 1 ? 'p1-pulse' : ''}`}
                    style={{ background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.06)' }}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${P_COLOR[c.priority] ?? 'chip-gray'}`}>
                      {P_LABEL[c.priority] ?? 'P?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm truncate">{c.type}</span>
                        <span className="font-mono text-[10px] text-slate-600 flex-shrink-0">{c.call_number}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${c.status === 'active' ? 'chip-green' : c.status === 'pending' ? 'chip-yellow' : 'chip-gray'}`}>
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
        <div className="xl:col-span-4 flex flex-col gap-5">

          {/* Quick access grid */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Quick Access</h2>
            <div className="grid grid-cols-4 gap-2.5">
              {QUICK.map(q => (
                <Link key={q.to} to={q.to}
                  className="group flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                  style={{ background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.06)' }}>
                  <div className="p-2 rounded-lg transition-transform group-hover:scale-110"
                    style={{ background: q.bg }}>
                    <q.icon className="w-4 h-4" style={{ color: q.color }} />
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors text-center leading-tight">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Officer info card */}
          <div className="glass rounded-2xl p-5 flex-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Your Record</h2>
            <div className="space-y-3">
              {[
                { label: 'Callsign', value: user.callsign || '—', mono: true },
                { label: 'Rank', value: user.rank },
                { label: 'Department', value: user.department },
                { label: 'Role', value: user.role?.replace('_', ' '), cap: true },
                { label: 'Status', value: user.status?.replace('_', ' '), cap: true, highlight: user.status === 'on_duty' ? '#22c55e' : undefined },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: '1px solid rgba(14,165,233,0.05)' }}>
                  <span className="text-[11px] text-slate-600 uppercase tracking-wider font-semibold">{row.label}</span>
                  <span className={`text-sm font-medium ${row.cap ? 'capitalize' : ''} ${row.mono ? 'font-mono text-sky-400' : ''}`}
                    style={{ color: row.highlight ?? '#e2e8f0' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Action links */}
            <div className="grid grid-cols-2 gap-2 mt-5">
              <Link to="/shifts" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-sky-400 transition-colors"
                style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.08)' }}>
                <Clock className="w-3.5 h-3.5" /><span>My Shifts</span>
              </Link>
              <Link to="/statistics" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-sky-400 transition-colors"
                style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.08)' }}>
                <TrendingUp className="w-3.5 h-3.5" /><span>Statistics</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent activity ────────────────────────────────── */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)' }}>
                <Activity className="w-4 h-4 text-sky-400" />
              </div>
              <h2 className="font-semibold text-white text-sm">Recent Activity</h2>
            </div>
          </div>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'rgba(14,165,233,0.05)' } as React.CSSProperties}>
            {stats.recent_activity.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center justify-between px-6 py-3 hover:bg-sky-500/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#0ea5e9' }} />
                  <span className="text-sm text-slate-400">{a.details ?? a.action}</span>
                  {a.officer_name && <span className="text-xs text-slate-600 hidden sm:block">· {a.officer_name}</span>}
                </div>
                <span className="text-[11px] text-slate-600 font-mono flex-shrink-0 ml-4">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
