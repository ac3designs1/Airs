import { useEffect, useState } from 'react';
import { Database, Users, FileText, AlertTriangle, Clock, Activity, Shield, Car, Award, Sword, AlertCircle, TrendingUp, Bell } from 'lucide-react';
import api from '../api/client';
import { format, parseISO } from 'date-fns';

interface AdminStats {
  counts: Record<string, number>;
  recent_activity: { id: string; action: string; callsign?: string; officer_name?: string; details: string; created_at: string }[];
}

const TABLE_DEFS = [
  { key: 'officers',            label: 'Officers',              icon: Users,        color: 'text-purple-400',    bg: 'rgba(168,85,247,0.10)' },
  { key: 'citizens',            label: 'Citizens',              icon: Users,        color: 'text-emerald-400',bg: 'rgba(16,185,129,0.10)' },
  { key: 'vehicles',            label: 'Vehicles',              icon: Car,          color: 'text-green-400',  bg: 'rgba(34,197,94,0.10)' },
  { key: 'warrants_active',     label: 'Active Warrants',       icon: AlertTriangle,color: 'text-red-400',    bg: 'rgba(239,68,68,0.10)' },
  { key: 'bolos_active',        label: 'Active BOLOs',          icon: AlertCircle,  color: 'text-orange-400', bg: 'rgba(249,115,22,0.10)' },
  { key: 'incidents_open',      label: 'Open Incidents',        icon: FileText,     color: 'text-purple-400', bg: 'rgba(168,85,247,0.10)' },
  { key: 'dispatch_active',     label: 'Active Calls',          icon: Activity,     color: 'text-indigo-400', bg: 'rgba(99,102,241,0.10)' },
  { key: 'arrest_reports',      label: 'Arrest Reports',        icon: Shield,       color: 'text-rose-400',   bg: 'rgba(244,63,94,0.10)' },
  { key: 'reports',             label: 'Reports',               icon: TrendingUp,   color: 'text-purple-400',   bg: 'rgba(168,85,247,0.10)' },
  { key: 'shifts_total',        label: 'Total Shifts',          icon: Clock,        color: 'text-purple-300',    bg: 'rgba(125,211,252,0.10)' },
  { key: 'leave_pending',       label: 'Pending Leave',         icon: Bell,         color: 'text-yellow-400', bg: 'rgba(234,179,8,0.10)' },
  { key: 'cert_pending',        label: 'Cert. Pending',         icon: Award,        color: 'text-amber-400',  bg: 'rgba(245,158,11,0.10)' },
  { key: 'strikes_active',      label: 'Active Strikes',        icon: AlertTriangle,color: 'text-red-400',    bg: 'rgba(239,68,68,0.10)' },
  { key: 'promotions_total',    label: 'Promotions',            icon: TrendingUp,   color: 'text-green-400',  bg: 'rgba(34,197,94,0.10)' },
  { key: 'weapons_total',       label: 'Weapons',               icon: Sword,        color: 'text-slate-400',  bg: 'rgba(100,116,139,0.10)' },
  { key: 'fpos_active',         label: 'Active FPOs',           icon: Shield,       color: 'text-blue-400',   bg: 'rgba(59,130,246,0.10)' },
  { key: 'terminations_pending',label: 'Pending Terminations',  icon: AlertTriangle,color: 'text-red-400',    bg: 'rgba(239,68,68,0.10)' },
  { key: 'transfers_pending',   label: 'Pending Transfers',     icon: Users,        color: 'text-indigo-400', bg: 'rgba(99,102,241,0.10)' },
  { key: 'announcements',       label: 'Announcements',         icon: Bell,         color: 'text-amber-400',  bg: 'rgba(245,158,11,0.10)' },
  { key: 'applications_pending',label: 'Applications (Pending)',icon: Users,        color: 'text-purple-400',    bg: 'rgba(168,85,247,0.10)' },
];

export default function DatabaseStats() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = () => {
    setLoading(true);
    api.get('/stats/admin').then(r => { setData(r.data); setLastRefresh(new Date()); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(168,85,247,0.06))', border: '1px solid rgba(16,185,129,0.18)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Database Statistics</h1>
              <p className="text-slate-500 text-sm">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-400 text-sm font-semibold border border-emerald-500/25 hover:bg-emerald-500/10 transition-colors">
            <Activity className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* System health tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'DB Engine', value: 'SQLite', sub: 'WAL mode enabled', icon: Database, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.10)' },
          { label: 'Status',    value: 'Online', sub: 'All systems operational', icon: Activity, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.10)' },
          { label: 'Version',   value: 'v3.0.0', sub: 'NextAirs', icon: Shield, color: 'text-purple-400', bg: 'rgba(168,85,247,0.10)' },
          { label: 'Tables',    value: '22', sub: 'database tables', icon: Database, color: 'text-purple-400', bg: 'rgba(168,85,247,0.10)' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className="p-2 rounded-lg w-fit mb-2" style={{ background: s.bg }}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-slate-700">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Record counts */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold text-white text-sm mb-4">Record Counts — All Tables</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
            {TABLE_DEFS.map(t => (
              <div key={t.key} className="rounded-xl p-3.5" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                <div className="p-1.5 rounded-lg w-fit mb-2" style={{ background: t.bg }}>
                  <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                </div>
                <div className="text-xl font-black text-white">{data?.counts[t.key] ?? 0}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{t.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold text-white text-sm mb-4">Recent Activity Log</h2>
        {!data?.recent_activity?.length ? (
          <p className="text-slate-600 text-sm">No recent activity.</p>
        ) : (
          <div className="space-y-1.5">
            {data.recent_activity.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-slate-300 truncate">{a.details ?? a.action}</span>
                    {a.officer_name && <span className="text-xs text-slate-600 ml-2">· {a.callsign ? `${a.callsign} — ` : ''}{a.officer_name}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-slate-700 flex-shrink-0 ml-4 font-mono">
                  {a.created_at ? format(parseISO(a.created_at), 'HH:mm:ss') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
