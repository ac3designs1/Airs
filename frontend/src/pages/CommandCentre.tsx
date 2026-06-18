import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon, AlertTriangle, Siren, CheckCircle,
  ChevronRight, Shield, Activity, Users, Radio, RefreshCw
} from 'lucide-react';
import api from '../api/client';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  total_officers: number; on_duty: number; active_warrants: number;
  active_bolos: number; active_calls: number; total_incidents: number;
  recent_activity: ActivityEntry[];
}
interface ActivityEntry { id: string; action: string; officer_name: string; details: string; created_at: string; }
interface Call { id: string; call_number: string; type: string; location: string; priority: number; status: string; created_at: string; }
interface Warrant { id: string; citizen_name?: string; type: string; charges: string; issued_date: string; }

const PRIORITY_CFG: Record<number, { label: string; cls: string }> = {
  1: { label: 'P1 CRITICAL', cls: 'text-red-400 bg-red-500/15 border-red-500/40 p1-pulse' },
  2: { label: 'P2 HIGH',     cls: 'text-orange-400 bg-orange-500/15 border-orange-500/40' },
  3: { label: 'P3 MEDIUM',   cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/40' },
  4: { label: 'P4 LOW',      cls: 'text-slate-400 bg-slate-500/10 border-slate-500/25' },
};

export default function CommandCentre() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [calls, setCalls]     = useState<Call[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    try {
      const [sRes, cRes, wRes] = await Promise.all([
        api.get('/dispatch/stats'),
        api.get('/dispatch?status=active&limit=10'),
        api.get('/warrants?status=active'),
      ]);
      setStats(sRes.data);
      setCalls(cRes.data);
      setWarrants(wRes.data.slice(0, 6));
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const chargesDisplay = (raw: string) => {
    try { return (JSON.parse(raw) as string[]).join(', '); } catch { return raw; }
  };

  const alerts = [
    stats && stats.active_calls > 0 && { level: 'critical', msg: `${stats.active_calls} active dispatch call${stats.active_calls > 1 ? 's' : ''} in progress`, to: '/in-city-requests' },
    stats && stats.active_warrants > 0 && { level: 'warn', msg: `${stats.active_warrants} active warrant${stats.active_warrants > 1 ? 's' : ''} outstanding`, to: '/warrants' },
    stats && stats.active_bolos > 0 && { level: 'warn', msg: `${stats.active_bolos} active BOLO${stats.active_bolos > 1 ? 's' : ''} issued`, to: '/bolos' },
    stats && stats.on_duty === 0 && { level: 'info', msg: 'No officers currently on duty', to: '/roster' },
  ].filter(Boolean) as { level: string; msg: string; to: string }[];

  const kpis = [
    { label: 'Active Calls',    value: stats?.active_calls ?? '—',    icon: Siren,    color: '#ef4444', pulse: (stats?.active_calls ?? 0) > 0 },
    { label: 'Officers On Duty', value: stats?.on_duty ?? '—',         icon: Shield,   color: '#22c55e', pulse: false },
    { label: 'Active Warrants', value: stats?.active_warrants ?? '—', icon: AlertTriangle, color: '#f59e0b', pulse: false },
    { label: 'Active BOLOs',    value: stats?.active_bolos ?? '—',    icon: Users,    color: '#a78bfa', pulse: false },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.14),rgba(249,115,22,0.06),rgba(234,179,8,0.08))', border: '1px solid rgba(239,68,68,0.24)' }}>
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at right, rgba(239,68,68,0.5), transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl relative" style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <AlertOctagon className="w-6 h-6 text-red-400" />
              {(stats?.active_calls ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Command Centre</h1>
              <p className="text-slate-500 text-sm">Live situational awareness · auto-refreshes every 30s</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)' }}>
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-mono">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} to={a.to}
              className="flex items-center justify-between p-3.5 rounded-xl border transition-all hover:brightness-110"
              style={{
                background: a.level === 'critical' ? 'rgba(239,68,68,0.08)' : a.level === 'warn' ? 'rgba(249,115,22,0.08)' : 'rgba(6,182,212,0.06)',
                borderColor: a.level === 'critical' ? 'rgba(239,68,68,0.28)' : a.level === 'warn' ? 'rgba(249,115,22,0.28)' : 'rgba(6,182,212,0.20)',
                color: a.level === 'critical' ? '#fca5a5' : a.level === 'warn' ? '#fdba74' : '#7dd3fc',
              }}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{a.msg}</span>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-60" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3.5 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)' }}>
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-sm font-medium text-green-300">All systems normal — no active alerts</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="stat-card relative overflow-hidden">
            {k.pulse && <div className="absolute inset-0 rounded-2xl animate-ping opacity-[0.04]" style={{ background: k.color }} />}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">{k.label}</span>
              <div className="p-2 rounded-lg relative" style={{ background: `${k.color}18` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
                {k.pulse && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full animate-ping" style={{ background: k.color }} />}
              </div>
            </div>
            <div className="text-3xl font-bold text-white font-mono">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Active Calls */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
            <div className="flex items-center gap-2">
              <Siren className="w-4 h-4 text-red-400" />
              <h2 className="font-semibold text-white">Active Dispatch Calls</h2>
            </div>
            <Link to="/in-city-requests" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              All calls <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500/30" />
              <p className="text-slate-600 text-sm">No active calls</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {calls.map(c => {
                const cfg = PRIORITY_CFG[c.priority] ?? PRIORITY_CFG[4];
                return (
                  <div key={c.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 mt-0.5 ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm">{c.type}</span>
                        <span className="text-[10px] text-slate-600 font-mono">{c.call_number}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.location}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Warrants */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h2 className="font-semibold text-white">Outstanding Warrants</h2>
            </div>
            <Link to="/warrants" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              All warrants <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
            </div>
          ) : warrants.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500/30" />
              <p className="text-slate-600 text-sm">No active warrants</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {warrants.map(w => (
                <div key={w.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ background: 'rgba(249,115,22,0.12)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{w.citizen_name ?? 'Unknown Subject'}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{chargesDisplay(w.charges)}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{w.type} Warrant · {formatDistanceToNow(new Date(w.issued_date), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="font-semibold text-white">Recent System Activity</h2>
            <span className="text-[10px] text-slate-600 ml-auto">Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {stats.recent_activity.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" style={{ boxShadow: '0 0 6px rgba(6,182,212,0.6)' }} />
                  <p className="text-sm text-slate-300 truncate">{a.details ?? a.action}</p>
                  {a.officer_name && <span className="text-xs text-slate-600 flex-shrink-0">by {a.officer_name}</span>}
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0 ml-4 whitespace-nowrap">
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
