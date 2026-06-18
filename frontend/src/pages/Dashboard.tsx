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
  { to: '/roster',           icon: Users,          label: 'Roster',    color: '#06b6d4' },
  { to: '/warrants',         icon: AlertTriangle,  label: 'Warrants',  color: '#ef4444' },
  { to: '/in-city-requests', icon: Radio,          label: 'Dispatch',  color: '#a78bfa' },
  { to: '/fpo-tracker',      icon: Shield,         label: 'FPO',       color: '#f43f5e' },
  { to: '/shifts',           icon: Clock,          label: 'Shifts',    color: '#22c55e' },
  { to: '/certifications',   icon: Star,           label: 'Certs',     color: '#f59e0b' },
  { to: '/leave-requests',   icon: ArrowRightLeft, label: 'Leave',     color: '#818cf8' },
  { to: '/reports',          icon: FileText,       label: 'Reports',   color: '#64748b' },
] as const;

export default function Dashboard() {
  const { auth } = useAuth();
  const user = auth.user!;
  const isAdmin = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command'].includes(user.role);

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
  const statusLabel = user.status === 'on_duty' ? 'On Duty' : user.status === 'busy' ? 'Busy' : 'Off Duty';

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Officer header strip ──────────────────────────────── */}
      <div style={{ background: '#0d1526', border: '1px solid rgba(6,182,212,0.16)', borderRadius: 12, padding: '20px 24px' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0 relative"
              style={{ background: user.role === 'commissioner' ? 'linear-gradient(135deg, #b45309, #f59e0b)' : 'linear-gradient(135deg, #0891b2, #1d4ed8)', boxShadow: user.role === 'commissioner' ? '0 0 20px rgba(245,158,11,0.35)' : undefined }}>
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-black text-white">
                  {(user as unknown as { in_city_name?: string }).in_city_name || `${user.first_name} ${user.last_name}`}
                </h1>
                {user.role === 'commissioner' && (
                  <span className="chip chip-gold text-[10px]" style={{ letterSpacing: '0.1em' }}>⭐ COMMISSIONER</span>
                )}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: statusColor }}>{statusLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                <span className="font-semibold text-slate-300">{user.rank}</span>
                <span className="text-slate-600">·</span>
                <span>{user.department}</span>
                {user.callsign && <><span className="text-slate-600">·</span><span className="font-mono text-[13px]" style={{ color: '#06b6d4' }}>{user.callsign}</span></>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white">{new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">Melbourne · AEST</div>
            </div>
            {isAdmin && (
              <Link to="/command-centre"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: '#f87171' }}>
                <AlertOctagon className="w-4 h-4" />
                <span className="hidden sm:inline">Command Centre</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total Officers', value: stats?.total_officers,  icon: Users,         color: '#06b6d4',  to: '/roster' },
          { label: 'On Duty',        value: stats ? `${stats.on_duty}/${stats.total_officers}` : undefined, icon: Activity, color: '#22c55e' },
          { label: 'Active Calls',   value: stats?.active_calls,    icon: Siren,         color: '#a78bfa',  alert: (stats?.active_calls ?? 0) > 0 },
          { label: 'Warrants',       value: stats?.active_warrants, icon: AlertTriangle, color: '#ef4444',  to: '/warrants' },
          { label: 'BOLOs',          value: stats?.active_bolos,    icon: Shield,        color: '#f59e0b' },
          { label: 'Citizens',       value: stats?.total_citizens,  icon: FileText,      color: '#64748b' },
        ].map(s => {
          const inner = (
            <div className="stat-card group" style={{ borderColor: `${s.color}22` }}>
              {s.alert && (
                <div className="absolute inset-0 rounded-xl pointer-events-none opacity-30 animate-pulse-ring"
                  style={{ border: `2px solid ${s.color}` }} />
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                {s.to && <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />}
              </div>
              <div className="text-2xl font-black text-white mb-1">
                {loading ? <div className="skeleton h-7 w-12 inline-block" /> : (s.value ?? '—')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(6,182,212,0.55)' }}>{s.label}</div>
            </div>
          );
          return s.to
            ? <Link key={s.label} to={s.to} className="block">{inner}</Link>
            : <div key={s.label}>{inner}</div>;
        })}
      </div>

      {/* ── Duty coverage ────────────────────────────────────── */}
      {stats && (
        <div className="glass p-4 flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex-shrink-0 w-28">Duty Coverage</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(6,182,212,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${dutyPct}%`, background: 'linear-gradient(90deg, #06b6d4, #22c55e)' }} />
          </div>
          <span className="text-sm font-black font-mono flex-shrink-0" style={{ color: '#06b6d4' }}>{dutyPct}%</span>
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* Active dispatch */}
        <div className="xl:col-span-8 glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(6,182,212,0.10)', background: 'rgba(6,182,212,0.03)' }}>
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4" style={{ color: '#06b6d4' }} />
              <span className="text-sm font-bold text-white">Active Dispatch</span>
              {calls.length > 0 && (
                <span className="chip chip-cyan">{calls.length} active</span>
              )}
            </div>
            <Link to="/in-city-requests"
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors"
              style={{ color: 'rgba(6,182,212,0.6)' }}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 skeleton" />)}
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
                  <Zap className="w-5 h-5 text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-500">All clear — no active calls</p>
                  <p className="text-xs text-slate-700 mt-0.5">Live calls will appear here automatically</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {calls.map(c => (
                  <div key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-cyan-500/[0.03] ${c.priority === 1 ? 'p1-pulse' : ''}`}
                    style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.08)' }}>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded flex-shrink-0 ${P_COLOR[c.priority] ?? 'chip-gray'}`}>
                      {P_LABEL[c.priority] ?? 'P?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{c.type}</span>
                        <span className="font-mono text-[10px] text-slate-600 flex-shrink-0">{c.call_number}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 truncate">{c.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${c.status === 'active' ? 'chip-green' : c.status === 'pending' ? 'chip-yellow' : 'chip-gray'}`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono hidden sm:block">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-4 flex flex-col gap-4">

          {/* Quick access */}
          <div className="glass rounded-xl p-5">
            <div className="section-label mb-4">Quick Access</div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map(q => (
                <Link key={q.to} to={q.to}
                  className="group flex flex-col items-center gap-1.5 py-3 rounded-lg transition-all hover:scale-[1.04]"
                  style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}>
                  <div className="p-2 rounded-lg" style={{ background: `${q.color}14`, border: `1px solid ${q.color}22` }}>
                    <q.icon className="w-3.5 h-3.5" style={{ color: q.color }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 group-hover:text-slate-300 transition-colors text-center">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Officer record */}
          <div className="glass rounded-xl p-5 flex-1">
            <div className="section-label mb-4">Your Record</div>
            <div className="space-y-0">
              {[
                { label: 'Callsign', value: user.callsign || '—', mono: true, color: '#06b6d4' },
                { label: 'Rank',     value: user.rank },
                { label: 'Division', value: user.department },
                { label: 'Role',     value: user.role === 'commissioner' ? 'Commissioner' : user.role?.replace(/_/g, ' '), cap: true, gold: user.role === 'commissioner' },
                { label: 'Status',   value: user.status?.replace(/_/g, ' '), cap: true, color: statusColor },
              ].map((row, i, arr) => (
                <div key={row.label}
                  className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-cyan-500/[0.07]' : ''}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.cap ? 'capitalize' : ''} ${row.mono ? 'font-mono' : ''}`}
                    style={{ color: (row as {gold?: boolean}).gold ? '#fcd34d' : (row.color ?? '#cbd5e1') }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { to: '/shifts',     icon: Clock,       label: 'My Shifts' },
                { to: '/statistics', icon: TrendingUp,  label: 'Stats' },
              ].map(l => (
                <Link key={l.to} to={l.to}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  style={{ border: '1px solid rgba(6,182,212,0.10)', background: 'rgba(6,182,212,0.04)' }}>
                  <l.icon className="w-3.5 h-3.5" /> {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent activity ───────────────────────────────────── */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(6,182,212,0.10)', background: 'rgba(6,182,212,0.03)' }}>
            <Activity className="w-4 h-4" style={{ color: '#06b6d4' }} />
            <span className="text-sm font-bold text-white">Recent Activity</span>
          </div>
          <div>
            {stats.recent_activity.slice(0, 8).map((a, i, arr) => (
              <div key={a.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-cyan-500/[0.02] transition-colors"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(6,182,212,0.06)' : 'none' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#06b6d4' }} />
                  <span className="text-sm text-slate-400 truncate">{a.details ?? a.action}</span>
                  {a.officer_name && <span className="text-xs text-slate-600 hidden sm:block flex-shrink-0">— {a.officer_name}</span>}
                </div>
                <span className="text-[10px] text-slate-600 font-mono ml-4 flex-shrink-0">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leadership shortcuts ──────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/leadership-applications', icon: ClipboardList, label: 'Applications',   desc: 'Review pending applications',       color: '#22c55e' },
            { to: '/command-centre',          icon: AlertOctagon,  label: 'Command Centre', desc: 'Live ops, alerts & announcements',   color: '#ef4444' },
            { to: '/promotions',              icon: TrendingUp,    label: 'Promotions',     desc: 'Manage officer rank promotions',     color: '#f59e0b' },
          ].map(s => (
            <Link key={s.to} to={s.to}
              className="glass rounded-xl p-4 flex items-center gap-3 group hover:scale-[1.01] transition-all">
              <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: `${s.color}14`, border: `1px solid ${s.color}22` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
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
