import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Clock, Users, Siren, CheckCircle, ChevronRight, Shield, Activity } from 'lucide-react';
import api from '../api/client';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  total_officers: number; on_duty: number; active_warrants: number;
  active_bolos: number; active_calls: number; total_incidents: number;
  pending_calls: number; recent_activity: Activity[];
}
interface Activity { id: string; action: string; officer_name: string; details: string; created_at: string; }
interface Call { id: string; call_number: string; type: string; location: string; priority: number; status: string; created_at: string; }
interface Warrant { id: string; citizen_name: string; type: string; charges: string; issued_date: string; }

const priorityLabel: Record<number, string> = { 1: 'P1 CRITICAL', 2: 'P2 HIGH', 3: 'P3 MEDIUM' };
const priorityColor: Record<number, string> = {
  1: 'text-red-400 bg-red-500/15 border-red-500/40',
  2: 'text-orange-400 bg-orange-500/15 border-orange-500/40',
  3: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/40',
};

export default function CommandCentre() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const chargesDisplay = (raw: string) => { try { return (JSON.parse(raw) as string[]).join(', '); } catch { return raw; } };

  const alerts = [
    stats && stats.active_calls > 0 && { level: 'critical', msg: `${stats.active_calls} active dispatch call${stats.active_calls > 1 ? 's' : ''} in progress`, to: '/in-city-requests' },
    stats && stats.active_warrants > 0 && { level: 'warn', msg: `${stats.active_warrants} active warrant${stats.active_warrants > 1 ? 's' : ''} outstanding`, to: '/warrants' },
    stats && stats.active_bolos > 0 && { level: 'warn', msg: `${stats.active_bolos} active BOLO${stats.active_bolos > 1 ? 's' : ''} issued`, to: '/warrants' },
    stats && stats.on_duty === 0 && { level: 'info', msg: 'No officers currently on duty', to: '/roster' },
  ].filter(Boolean) as { level: string; msg: string; to: string }[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-red-500/20 p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(to right,rgba(239,68,68,0.1),rgba(249,115,22,0.05),rgba(234,179,8,0.1))' }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(239,68,68,0.1)' }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-500/20 rounded-xl border border-red-400/30">
              <AlertOctagon className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Command Centre</h1>
              <p className="text-gray-400 text-sm mt-0.5">Live situational awareness — refreshes every 30s</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} to={a.to} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:brightness-110 ${
              a.level === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
              a.level === 'warn' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' :
              'bg-blue-500/10 border-blue-500/30 text-blue-300'}`}>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{a.msg}</span>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </Link>
          ))}
          {alerts.length === 0 && (
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300">
              <CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">All systems normal — no active alerts</span>
            </div>
          )}
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Calls', value: stats?.active_calls ?? '—', icon: Siren, color: 'text-red-400 bg-red-500/10', pulse: (stats?.active_calls ?? 0) > 0 },
          { label: 'On Duty', value: stats?.on_duty ?? '—', icon: Shield, color: 'text-green-400 bg-green-500/10', pulse: false },
          { label: 'Active Warrants', value: stats?.active_warrants ?? '—', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10', pulse: false },
          { label: 'Active BOLOs', value: stats?.active_bolos ?? '—', icon: Users, color: 'text-yellow-400 bg-yellow-500/10', pulse: false },
        ].map(s => (
          <div key={s.label} className="bg-gray-900/30 backdrop-blur-xl rounded-xl border border-gray-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{s.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl relative ${s.color}`}>
                <s.icon className="w-6 h-6" />
                {s.pulse && <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-ping" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Active Calls */}
        <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/10 rounded-lg"><Siren className="w-5 h-5 text-red-400" /></div>
              <h2 className="font-semibold text-white">Active Dispatch Calls</h2>
            </div>
            <Link to="/in-city-requests" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              All calls <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500/50" /><p>No active calls</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map(c => (
                <div key={c.id} className="flex items-start space-x-3 p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/50 transition-all"
                  style={{ background: 'rgba(17,24,39,0.4)' }}>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border flex-shrink-0 mt-0.5 ${priorityColor[c.priority] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                    {priorityLabel[c.priority] ?? 'P?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{c.type}</span>
                      <span className="text-xs text-gray-500 font-mono">{c.call_number}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.location}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Warrants */}
        <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-400" /></div>
              <h2 className="font-semibold text-white">Outstanding Warrants</h2>
            </div>
            <Link to="/warrants" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              All warrants <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : warrants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500/50" /><p>No active warrants</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warrants.map(w => (
                <div key={w.id} className="flex items-start space-x-3 p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/50 transition-all"
                  style={{ background: 'rgba(17,24,39,0.4)' }}>
                  <div className="p-1.5 bg-orange-500/10 rounded-lg flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">{w.citizen_name ?? 'Unknown'}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{chargesDisplay(w.charges)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{w.type} Warrant · {formatDistanceToNow(new Date(w.issued_date), { addSuffix: true })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="w-5 h-5 text-blue-400" /></div>
            <h2 className="font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="space-y-2">
            {stats.recent_activity.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-800/30 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                  <div>
                    <span className="text-sm text-gray-300">{a.details ?? a.action}</span>
                    {a.officer_name && <span className="text-xs text-gray-500 ml-2">by {a.officer_name}</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0 ml-4">
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
