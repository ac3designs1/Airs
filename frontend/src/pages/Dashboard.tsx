import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, Shield, Clock, TrendingUp,
  FileText, Activity, Star, ArrowRightLeft, Radio,
  MapPin, Zap, AlertOctagon, Siren, ClipboardList,
  ChevronRight, BarChart2, ArrowRight, Bell,
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
interface Call {
  id: string; call_number: string; type: string; location: string;
  priority: number; status: string; created_at: string;
}

const P_CLR: Record<number, string> = { 1: '#ef4444', 2: '#f59e0b', 3: '#a855f7' };
const P_BG:  Record<number, string> = { 1: 'rgba(239,68,68,0.10)',  2: 'rgba(245,158,11,0.10)', 3: 'rgba(168,85,247,0.08)' };
const P_LBL: Record<number, string> = { 1: 'EMERGENCY', 2: 'URGENT', 3: 'ROUTINE' };

const QUICK_LINKS = [
  { to: '/roster',           icon: Users,         label: 'Roster',    color: '#a855f7' },
  { to: '/warrants',         icon: AlertTriangle, label: 'Warrants',  color: '#ef4444' },
  { to: '/in-city-requests', icon: Radio,         label: 'Dispatch',  color: '#a78bfa' },
  { to: '/certifications',   icon: Star,          label: 'Certs',     color: '#f59e0b' },
  { to: '/shifts',           icon: Clock,         label: 'Shifts',    color: '#22c55e' },
  { to: '/leave-requests',   icon: ArrowRightLeft,label: 'Leave',     color: '#818cf8' },
  { to: '/reports',          icon: FileText,      label: 'Reports',   color: '#64748b' },
  { to: '/statistics',       icon: BarChart2,     label: 'Stats',     color: '#c084fc' },
] as const;

function SkeletonBox({ h = 'h-8', w = 'w-12' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} skeleton rounded-lg inline-block`} />;
}

export default function Dashboard() {
  const { auth }   = useAuth();
  const user       = auth.user!;
  const isAdmin    = ['commissioner','admin','administrator','leadership','senior_command'].includes(user.role);
  const isSuperv   = ['commissioner','admin','administrator','leadership','senior_command','supervisor'].includes(user.role);

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [calls,   setCalls]   = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dispatch/stats'),
      api.get('/dispatch?status=active&limit=8'),
    ]).then(([s, c]) => { setStats(s.data); setCalls(c.data); setLoading(false); })
      .catch(()  => setLoading(false));
  }, []);

  const statusColor = user.status === 'on_duty' ? '#22c55e' : user.status === 'busy' ? '#eab308' : '#475569';
  const statusLabel = user.status === 'on_duty' ? 'On Duty'  : user.status === 'busy' ? 'Busy'    : 'Off Duty';
  const dutyPct     = stats ? Math.round((stats.on_duty / Math.max(stats.total_officers, 1)) * 100) : 0;
  const inCityName  = (user as unknown as { in_city_name?: string }).in_city_name;
  const displayName = inCityName || `${user.first_name} ${user.last_name}`;
  const initials    = `${user.first_name[0]}${user.last_name[0]}`;
  const isComm      = user.role === 'commissioner';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ════════════════════════════════════════════════════════
          HERO BANNER
      ════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: isComm
            ? 'linear-gradient(135deg, #1c1200 0%, #0d0a14 55%, #0a0618 100%)'
            : 'linear-gradient(135deg, #0c0618 0%, #0d0a14 55%, #08050f 100%)',
          border: `1px solid ${isComm ? 'rgba(245,158,11,0.22)' : 'rgba(168,85,247,0.18)'}`,
          boxShadow: `0 8px 48px ${isComm ? 'rgba(245,158,11,0.06)' : 'rgba(168,85,247,0.06)'}`,
        }}>

        {/* Background accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '320px', height: '320px', borderRadius: '50%',
            background: isComm
              ? 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-40px', left: '20%',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          }} />
          {/* Subtle hex grid overlay */}
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 0, transparent 50%), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '28px 28px' }} />
        </div>

        <div className="relative p-6 pb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">

            {/* Left — avatar + info */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                  style={{
                    background: isComm
                      ? 'linear-gradient(135deg, #92400e, #f59e0b)'
                      : 'linear-gradient(135deg, #6d28d9, #a855f7)',
                    boxShadow: isComm
                      ? '0 0 28px rgba(245,158,11,0.45), 0 4px 16px rgba(0,0,0,0.4)'
                      : '0 0 28px rgba(168,85,247,0.35), 0 4px 16px rgba(0,0,0,0.4)',
                  }}>
                  {initials}
                </div>
                {/* Status dot */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0d0a14]"
                  style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              </div>

              {/* Name + details */}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h1 className="text-2xl font-black text-white tracking-tight leading-none">{displayName}</h1>
                  {isComm && (
                    <span className="chip chip-gold text-[10px] flex items-center gap-1">⭐ Commissioner</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-semibold text-slate-200">{user.rank}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-slate-400">{user.department}</span>
                  {user.callsign && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="font-mono font-bold text-[13px]" style={{ color: isComm ? '#fcd34d' : '#c084fc' }}>
                        {user.callsign}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5"
                  style={{ color: statusColor }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                  <span className="text-xs font-bold uppercase tracking-wider">{statusLabel}</span>
                </div>
              </div>
            </div>

            {/* Right — clock + action */}
            <div className="flex flex-col items-start sm:items-end gap-3">
              <div className="text-right">
                <div className="font-mono font-black text-3xl tracking-tight leading-none" style={{ color: isComm ? '#fcd34d' : '#c084fc' }}>
                  {timeStr}
                </div>
                <div className="text-xs text-slate-500 mt-1">{dateStr} · Melbourne AEST</div>
              </div>
              {isAdmin && (
                <Link to="/command-centre"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                  style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.32)', color: '#f87171' }}>
                  <AlertOctagon className="w-4 h-4" />
                  Command Centre
                  {(stats?.active_calls ?? 0) > 0 && (
                    <span className="chip chip-red text-[9px] ml-0.5">{stats!.active_calls}</span>
                  )}
                </Link>
              )}
            </div>
          </div>

          {/* Duty bar */}
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${isComm ? 'rgba(245,158,11,0.10)' : 'rgba(168,85,247,0.08)'}` }}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 w-28 flex-shrink-0">
                Force Strength
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-[1200ms]"
                  style={{
                    width: `${dutyPct}%`,
                    background: isComm
                      ? 'linear-gradient(90deg,#b45309,#f59e0b)'
                      : 'linear-gradient(90deg,#7c3aed,#22c55e)',
                  }} />
              </div>
              <span className="font-mono font-black text-sm w-10 text-right flex-shrink-0"
                style={{ color: isComm ? '#fcd34d' : '#a855f7' }}>
                {loading ? '—' : `${dutyPct}%`}
              </span>
              <span className="text-xs text-slate-600 hidden sm:block">
                {loading ? '…' : `${stats?.on_duty ?? 0} / ${stats?.total_officers ?? 0} officers`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          KPI STATS
      ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {([
          { label: 'Officers',    value: stats?.total_officers,  icon: Users,         color: '#a855f7', to: '/roster' },
          { label: 'On Duty',     value: stats ? `${stats.on_duty}/${stats.total_officers}` : undefined, icon: Activity, color: '#22c55e' },
          { label: 'Live Calls',  value: stats?.active_calls,    icon: Siren,         color: '#a78bfa', pulse: (stats?.active_calls ?? 0) > 0 },
          { label: 'Warrants',    value: stats?.active_warrants, icon: AlertTriangle, color: '#ef4444', to: '/warrants' },
          { label: 'BOLOs',       value: stats?.active_bolos,    icon: Shield,        color: '#f59e0b' },
          { label: 'Incidents',   value: stats?.total_incidents, icon: FileText,      color: '#64748b' },
        ] as { label:string; value?:string|number; icon:React.ElementType; color:string; to?:string; pulse?:boolean }[]).map(s => {
          const inner = (
            <div key={s.label} className="relative rounded-xl p-4 overflow-hidden transition-all group cursor-pointer"
              style={{
                background: `linear-gradient(145deg, ${s.color}0f 0%, #0d0a14 100%)`,
                border: `1px solid ${s.color}22`,
              }}>
              {/* Pulse ring for active calls */}
              {s.pulse && (
                <div className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', boxShadow: `inset 0 0 0 1px ${s.color}55` }} />
              )}
              {/* Big background icon */}
              <div className="absolute right-2 bottom-1 opacity-[0.06] pointer-events-none"
                style={{ transform: 'scale(2.4)', transformOrigin: 'right bottom' }}>
                <s.icon className="w-8 h-8" style={{ color: s.color }} />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg" style={{ background: `${s.color}1a`, border: `1px solid ${s.color}28` }}>
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  {s.to && <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />}
                </div>
                <div className="text-[28px] font-black leading-none mb-1" style={{ color: 'white' }}>
                  {loading ? <SkeletonBox h="h-7" w="w-10" /> : (s.value ?? '—')}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${s.color}99` }}>
                  {s.label}
                </div>
              </div>
            </div>
          );
          return s.to
            ? <Link key={s.label} to={s.to}>{inner}</Link>
            : <div key={s.label}>{inner}</div>;
        })}
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN GRID
      ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* ── Active Dispatch (8 cols) */}
        <div className="xl:col-span-8 glass rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(168,85,247,0.10)', background: 'rgba(168,85,247,0.04)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.22)' }}>
                <Radio className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">Active Dispatch</h2>
                <p className="text-[11px] text-slate-600 mt-0.5">Live calls requiring response</p>
              </div>
              {calls.length > 0 && (
                <span className="chip chip-purple text-[10px] animate-pulse">{calls.length} live</span>
              )}
            </div>
            <Link to="/in-city-requests"
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-purple-400 transition-colors uppercase tracking-wider">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Body */}
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.10)' }}>
                  <Zap className="w-7 h-7 text-slate-700" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-500">All clear — no active calls</p>
                  <p className="text-xs text-slate-700 mt-0.5">New calls will appear here in real time</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map(c => {
                  const clr = P_CLR[c.priority] ?? '#a855f7';
                  const bg  = P_BG[c.priority]  ?? 'rgba(168,85,247,0.06)';
                  return (
                    <div key={c.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:brightness-110"
                      style={{ background: bg, borderColor: `${clr}25` }}>

                      {/* Priority badge */}
                      <div className="flex flex-col items-center flex-shrink-0 w-14">
                        <div className="text-[9px] font-black uppercase tracking-wider leading-none mb-1" style={{ color: clr }}>
                          {P_LBL[c.priority] ?? 'P?'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-600">{c.call_number}</div>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-8 flex-shrink-0 rounded-full" style={{ background: `${clr}30` }} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{c.type}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
                          <span className="text-[11px] text-slate-500 truncate">{c.location}</span>
                        </div>
                      </div>

                      {/* Status + time */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`chip text-[9px] ${c.status === 'active' ? 'chip-green' : c.status === 'pending' ? 'chip-yellow' : 'chip-gray'}`}>
                          {c.status}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono hidden sm:block">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-4">

          {/* Officer Card */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(168,85,247,0.08)', background: 'rgba(168,85,247,0.02)' }}>
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-black text-white">Your Record</span>
            </div>
            <div className="px-5 py-3">
              {[
                { label: 'Call Sign', value: user.callsign || '—', mono: true,  color: '#c084fc' },
                { label: 'Rank',      value: user.rank },
                { label: 'Division',  value: user.department },
                { label: 'Role',      value: isComm ? 'Commissioner' : (user.role?.replace(/_/g, ' ')), cap: true, color: isComm ? '#fcd34d' : undefined },
                { label: 'Status',    value: statusLabel, color: statusColor },
              ].map((row, i, arr) => (
                <div key={row.label}
                  className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.cap ? 'capitalize' : ''} ${row.mono ? 'font-mono' : ''}`}
                    style={{ color: row.color ?? '#cbd5e1' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access */}
          <div className="glass rounded-2xl p-5">
            <div className="section-label mb-4">Quick Access</div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_LINKS.map(q => (
                <Link key={q.to} to={q.to}
                  className="group flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:scale-[1.06] active:scale-95"
                  style={{ background: `${q.color}0d`, border: `1px solid ${q.color}15` }}>
                  <div className="p-2 rounded-lg transition-all group-hover:scale-110 group-hover:brightness-125"
                    style={{ background: `${q.color}1a`, border: `1px solid ${q.color}25` }}>
                    <q.icon className="w-3.5 h-3.5" style={{ color: q.color }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight"
                    style={{ color: `${q.color}99` }}>{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          LEADERSHIP ACTIONS  (admin only)
      ════════════════════════════════════════════════════════ */}
      {isSuperv && (
        <div>
          <div className="section-label mb-3">Leadership Actions</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { to: '/leadership-applications', icon: ClipboardList, label: 'Applications',   desc: 'Review pending officer applications',   color: '#22c55e', badge: stats?.pending_calls },
              { to: '/command-centre',          icon: AlertOctagon,  label: 'Command Centre', desc: 'Live ops, BOLOs & announcements',       color: '#ef4444', badge: stats?.active_calls },
              { to: '/promotions',              icon: TrendingUp,    label: 'Promotions',     desc: 'Manage rank changes & promotions',      color: '#f59e0b' },
            ].map(s => (
              <Link key={s.to} to={s.to}
                className="group glass rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-[1.01] hover:brightness-110"
                style={{ borderColor: `${s.color}20` }}>
                <div className="relative flex-shrink-0">
                  <div className="p-3 rounded-xl" style={{ background: `${s.color}12`, border: `1px solid ${s.color}22` }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  {(s.badge ?? 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                      style={{ background: s.color }}>
                      {s.badge}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{s.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{s.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          RECENT ACTIVITY
      ════════════════════════════════════════════════════════ */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid rgba(168,85,247,0.08)', background: 'rgba(168,85,247,0.02)' }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.18)' }}>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-black text-white">Recent Activity</h2>
            <span className="chip chip-purple text-[10px] ml-auto">{Math.min(stats.recent_activity.length, 8)} entries</span>
          </div>
          <div>
            {stats.recent_activity.slice(0, 8).map((a, i, arr) => (
              <div key={a.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.01] transition-colors"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(168,85,247,0.05)' : 'none' }}>
                {/* Timeline dot */}
                <div className="relative flex-shrink-0 flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.5)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{a.details ?? a.action}</p>
                  {a.officer_name && (
                    <p className="text-[11px] text-slate-600 mt-0.5">by {a.officer_name}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-700 font-mono flex-shrink-0 ml-2">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacing */}
      <div className="h-2" />
    </div>
  );
}
