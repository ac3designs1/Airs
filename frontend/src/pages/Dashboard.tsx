import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, Shield, Clock, TrendingUp,
  FileText, Activity, Star, ArrowRightLeft, Radio,
  MapPin, Zap, AlertOctagon, Siren, ClipboardList,
  ChevronRight, BarChart2
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

const P_BG: Record<number,string>  = { 1:'rgba(239,68,68,0.14)',    2:'rgba(245,158,11,0.14)',   3:'rgba(6,182,212,0.12)'  };
const P_CLR: Record<number,string> = { 1:'#f87171',                 2:'#fcd34d',                 3:'#22d3ee'               };
const P_LBL: Record<number,string> = { 1:'P1 — EMERGENCY',         2:'P2 — URGENT',             3:'P3 — ROUTINE'          };

const QUICK_LINKS = [
  { to:'/roster',           icon:Users,          label:'Roster',      color:'#06b6d4' },
  { to:'/warrants',         icon:AlertTriangle,  label:'Warrants',    color:'#ef4444' },
  { to:'/in-city-requests', icon:Radio,          label:'Dispatch',    color:'#a78bfa' },
  { to:'/certifications',   icon:Star,           label:'Certs',       color:'#f59e0b' },
  { to:'/shifts',           icon:Clock,          label:'Shifts',      color:'#22c55e' },
  { to:'/leave-requests',   icon:ArrowRightLeft, label:'Leave',       color:'#818cf8' },
  { to:'/reports',          icon:FileText,       label:'Reports',     color:'#64748b' },
  { to:'/statistics',       icon:BarChart2,      label:'Stats',       color:'#06b6d4' },
] as const;

export default function Dashboard() {
  const { auth } = useAuth();
  const user     = auth.user!;
  const isAdmin  = ['commissioner','admin','administrator','leadership','senior_command'].includes(user.role);

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

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Welcome banner ────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1f3c 0%, #0d1526 60%, #111c31 100%)',
          border: '1px solid rgba(6,182,212,0.18)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        }}>
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

        <div className="relative p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white flex-shrink-0 relative"
                style={{
                  background: user.role === 'commissioner'
                    ? 'linear-gradient(135deg, #b45309, #f59e0b)'
                    : 'linear-gradient(135deg, #0891b2, #1d4ed8)',
                  boxShadow: user.role === 'commissioner'
                    ? '0 0 24px rgba(245,158,11,0.4)'
                    : '0 0 20px rgba(6,182,212,0.30)',
                }}>
                {user.first_name[0]}{user.last_name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-black text-white tracking-tight">
                    {inCityName || `${user.first_name} ${user.last_name}`}
                  </h1>
                  {user.role === 'commissioner' && (
                    <span className="chip chip-gold text-[10px]">⭐ Commissioner</span>
                  )}
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}30`, color: statusColor }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                    {statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-sm">
                  <span className="text-slate-300 font-semibold">{user.rank}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">{user.department}</span>
                  {user.callsign && <>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono font-bold text-[13px]" style={{ color: '#06b6d4' }}>{user.callsign}</span>
                  </>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <div className="text-right">
                <div className="text-sm font-bold text-white">
                  {new Date().toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">Melbourne · AEST</div>
              </div>
              {isAdmin && (
                <Link to="/command-centre"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.28)', color:'#f87171' }}>
                  <AlertOctagon className="w-4 h-4" />
                  Command Centre
                </Link>
              )}
            </div>
          </div>

          {/* Duty bar */}
          {stats && (
            <div className="flex items-center gap-3 mt-5 pt-4"
              style={{ borderTop: '1px solid rgba(6,182,212,0.08)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 w-24 flex-shrink-0">Duty Coverage</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width:`${dutyPct}%`, background:'linear-gradient(90deg,#06b6d4,#22c55e)' }} />
              </div>
              <span className="text-sm font-black font-mono w-10 text-right flex-shrink-0" style={{ color:'#06b6d4' }}>{dutyPct}%</span>
              <span className="text-xs text-slate-600 hidden sm:block">{stats.on_duty} of {stats.total_officers} on duty</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label:'Officers',   value:stats?.total_officers,  icon:Users,         color:'#06b6d4', to:'/roster' },
          { label:'On Duty',    value:stats ? `${stats.on_duty}/${stats.total_officers}` : undefined, icon:Activity, color:'#22c55e' },
          { label:'Live Calls', value:stats?.active_calls,    icon:Siren,         color:'#a78bfa', alert:(stats?.active_calls??0)>0 },
          { label:'Warrants',   value:stats?.active_warrants, icon:AlertTriangle, color:'#ef4444', to:'/warrants' },
          { label:'BOLOs',      value:stats?.active_bolos,    icon:Shield,        color:'#f59e0b' },
          { label:'Citizens',   value:stats?.total_citizens,  icon:FileText,      color:'#64748b', to:'/citizens' },
        ].map(s => {
          const card = (
            <div className="rounded-xl p-4 relative overflow-hidden transition-all hover:scale-[1.02] group"
              style={{
                background: `linear-gradient(135deg, ${s.color}12 0%, ${s.color}06 100%)`,
                border: `1px solid ${s.color}28`,
              }}>
              {s.alert && (
                <div className="absolute inset-0 rounded-xl pointer-events-none animate-pulse"
                  style={{ boxShadow:`inset 0 0 0 1px ${s.color}50` }} />
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background:`${s.color}20`, border:`1px solid ${s.color}30` }}>
                  <s.icon className="w-4 h-4" style={{ color:s.color }} />
                </div>
                {s.to && <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />}
              </div>
              <div className="text-2xl font-black mb-0.5" style={{ color:'white' }}>
                {loading ? <div className="skeleton h-7 w-10 inline-block" /> : (s.value ?? '—')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color:`${s.color}99` }}>{s.label}</div>
            </div>
          );
          return s.to
            ? <Link key={s.label} to={s.to}>{card}</Link>
            : <div key={s.label}>{card}</div>;
        })}
      </div>

      {/* ── Main content grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* Active Dispatch */}
        <div className="xl:col-span-8 glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom:'1px solid rgba(6,182,212,0.08)', background:'rgba(6,182,212,0.03)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.25)' }}>
                <Radio className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Active Dispatch</h2>
                <p className="text-[11px] text-slate-600 mt-0.5">Live calls requiring units</p>
              </div>
              {calls.length > 0 && (
                <span className="chip chip-purple text-[10px]">{calls.length} active</span>
              )}
            </div>
            <Link to="/in-city-requests"
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-cyan-400 transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 skeleton rounded-xl" />)}</div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.10)' }}>
                  <Zap className="w-6 h-6 text-slate-700" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-500">All clear — no active calls</p>
                  <p className="text-xs text-slate-700 mt-0.5">Live calls will appear here in real time</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map(c => (
                  <div key={c.id}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors"
                    style={{
                      background:`${P_BG[c.priority] ?? 'rgba(6,182,212,0.04)'}`,
                      border:`1px solid ${P_CLR[c.priority] ?? '#06b6d4'}28`,
                    }}>
                    <div className="flex-shrink-0 text-center">
                      <div className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color:P_CLR[c.priority] ?? '#06b6d4' }}>
                        {P_LBL[c.priority]?.split('—')[0].trim() ?? 'P?'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-600">{c.call_number}</div>
                    </div>
                    <div className="w-px h-8 flex-shrink-0" style={{ background:`${P_CLR[c.priority] ?? '#06b6d4'}30` }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{c.type}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 truncate">{c.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`chip text-[10px] ${c.status === 'active' ? 'chip-green' : c.status === 'pending' ? 'chip-yellow' : 'chip-gray'}`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono hidden sm:block">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix:true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="xl:col-span-4 flex flex-col gap-4">

          {/* Quick access */}
          <div className="glass rounded-2xl p-5">
            <div className="section-label mb-4">Quick Access</div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_LINKS.map(q => (
                <Link key={q.to} to={q.to}
                  className="group flex flex-col items-center gap-2 py-3 rounded-xl transition-all hover:scale-[1.05]"
                  style={{ background:`${q.color}0d`, border:`1px solid ${q.color}18` }}>
                  <div className="p-2 rounded-lg transition-all group-hover:scale-110"
                    style={{ background:`${q.color}18`, border:`1px solid ${q.color}28` }}>
                    <q.icon className="w-3.5 h-3.5" style={{ color:q.color }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight"
                    style={{ color:`${q.color}99` }}>{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Officer details */}
          <div className="glass rounded-2xl p-5 flex-1">
            <div className="section-label mb-4">Your Record</div>
            <div className="space-y-0">
              {[
                { label:'Call Sign', value:user.callsign||'—',                     mono:true,  color:'#06b6d4' },
                { label:'Rank',      value:user.rank },
                { label:'Division',  value:user.department },
                { label:'Role',      value:user.role==='commissioner'?'Commissioner':user.role?.replace(/_/g,' '), cap:true, color: user.role==='commissioner'?'#fcd34d':undefined },
                { label:'Status',    value:statusLabel,                              color:statusColor },
              ].map((row,i,arr) => (
                <div key={row.label}
                  className={`flex items-center justify-between py-2.5 ${i<arr.length-1?'border-b border-cyan-500/[0.06]':''}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.cap?'capitalize':''} ${row.mono?'font-mono':''}`}
                    style={{ color:row.color??'#cbd5e1' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent activity ───────────────────────────────── */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom:'1px solid rgba(6,182,212,0.08)', background:'rgba(6,182,212,0.02)' }}>
            <div className="p-2 rounded-lg" style={{ background:'rgba(6,182,212,0.10)', border:'1px solid rgba(6,182,212,0.18)' }}>
              <Activity className="w-4 h-4" style={{ color:'#06b6d4' }} />
            </div>
            <h2 className="text-sm font-bold text-white">Recent Activity</h2>
          </div>
          <div>
            {stats.recent_activity.slice(0,8).map((a,i,arr) => (
              <div key={a.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-cyan-500/[0.02] transition-colors"
                style={{ borderBottom:i<arr.length-1?'1px solid rgba(6,182,212,0.05)':'none' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:'#06b6d4' }} />
                  <span className="text-sm text-slate-400 truncate">{a.details??a.action}</span>
                  {a.officer_name && <span className="text-xs text-slate-600 hidden sm:block flex-shrink-0">— {a.officer_name}</span>}
                </div>
                <span className="text-[10px] text-slate-600 font-mono ml-4 flex-shrink-0">
                  {formatDistanceToNow(new Date(a.created_at),{addSuffix:true})}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leadership quick links ────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to:'/leadership-applications', icon:ClipboardList, label:'Applications',   desc:'Review pending officer applications',    color:'#22c55e' },
            { to:'/command-centre',          icon:AlertOctagon,  label:'Command Centre', desc:'Live ops, BOLO alerts & announcements',  color:'#ef4444' },
            { to:'/promotions',              icon:TrendingUp,    label:'Promotions',     desc:'Manage rank changes and promotions',     color:'#f59e0b' },
          ].map(s => (
            <Link key={s.to} to={s.to}
              className="glass rounded-2xl p-4 flex items-center gap-3 group transition-all hover:scale-[1.01]"
              style={{ borderColor:`${s.color}22` }}>
              <div className="p-3 rounded-xl flex-shrink-0"
                style={{ background:`${s.color}14`, border:`1px solid ${s.color}25` }}>
                <s.icon className="w-5 h-5" style={{ color:s.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{s.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
