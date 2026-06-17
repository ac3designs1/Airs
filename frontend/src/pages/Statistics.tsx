import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Clock, Award, Shield, FileText, Star, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, parseISO } from 'date-fns';

interface PersonalStats {
  total_shifts: number; total_hours: number; month_hours: number;
  incidents: number; warrants_issued: number; arrests: number;
  reports: number; certifications: number; active_strikes: number;
  recent_shifts: { day: string; mins: number }[];
  promotions: { from_rank: string; to_rank: string; effective_date: string; reason?: string }[];
}

export default function Statistics() {
  const { auth } = useAuth();
  const user = auth.user!;
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/personal')
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build 7-day chart data
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const found = stats?.recent_shifts.find(s => s.day === d);
    return { label: format(subDays(new Date(), 6 - i), 'EEE'), mins: found?.mins ?? 0, date: d };
  });
  const maxMins = Math.max(...chartDays.map(d => d.mins), 60);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.20)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <BarChart2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Statistics</h1>
            <p className="text-slate-500 text-sm">Personal performance — {user.first_name} {user.last_name} · {user.callsign}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-10 text-center text-slate-600">Loading stats…</div>
      ) : !stats ? (
        <div className="glass rounded-2xl p-10 text-center text-slate-600">Could not load statistics.</div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Hours', value: `${stats.total_hours}h`, sub: `${stats.month_hours}h this month`, icon: Clock, color: 'text-sky-400', bg: 'rgba(14,165,233,0.10)' },
              { label: 'Incidents Filed', value: stats.incidents, sub: 'cases as primary officer', icon: FileText, color: 'text-purple-400', bg: 'rgba(168,85,247,0.10)' },
              { label: 'Arrests', value: stats.arrests, sub: 'arrest reports authored', icon: Shield, color: 'text-red-400', bg: 'rgba(239,68,68,0.10)' },
              { label: 'Warrants Issued', value: stats.warrants_issued, sub: 'warrants signed', icon: AlertTriangle, color: 'text-orange-400', bg: 'rgba(249,115,22,0.10)' },
              { label: 'Reports', value: stats.reports, sub: 'written reports', icon: TrendingUp, color: 'text-green-400', bg: 'rgba(34,197,94,0.10)' },
              { label: 'Certifications', value: stats.certifications, sub: 'approved certs', icon: Award, color: 'text-yellow-400', bg: 'rgba(234,179,8,0.10)' },
              { label: 'Total Shifts', value: stats.total_shifts, sub: 'recorded shifts', icon: Clock, color: 'text-indigo-400', bg: 'rgba(99,102,241,0.10)' },
              { label: 'Active Strikes', value: stats.active_strikes, sub: stats.active_strikes > 0 ? 'action required' : 'clean record', icon: Star, color: stats.active_strikes > 0 ? 'text-red-400' : 'text-green-400', bg: stats.active_strikes > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: s.bg }}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-600 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Shift hours chart — last 7 days */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4">Shift Hours — Last 7 Days</h2>
            {chartDays.every(d => d.mins === 0) ? (
              <p className="text-slate-600 text-sm text-center py-6">No completed shifts in the last 7 days.</p>
            ) : (
              <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
                {chartDays.map(d => {
                  const pct = maxMins > 0 ? (d.mins / maxMins) * 100 : 0;
                  const hrs = Math.round(d.mins / 60 * 10) / 10;
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
                      {hrs > 0 && <span className="text-[10px] text-slate-500">{hrs}h</span>}
                      <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(pct, d.mins > 0 ? 6 : 2)}%`, background: d.mins > 0 ? 'linear-gradient(to top,#7c3aed,#a855f7)' : 'rgba(55,65,81,0.3)', minHeight: d.mins > 0 ? 6 : 2 }} />
                      <span className="text-[10px] text-slate-600">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Promotion history */}
          {stats.promotions.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h2 className="font-semibold text-white text-sm mb-4">Promotion History</h2>
              <div className="space-y-2.5">
                {stats.promotions.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.10)' }}>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{p.from_rank} → {p.to_rank}</div>
                      {p.reason && <div className="text-xs text-slate-500 mt-0.5">{p.reason}</div>}
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0">{p.effective_date ? format(parseISO(p.effective_date), 'dd MMM yyyy') : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.total_shifts === 0 && (
            <div className="glass rounded-2xl p-6 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-600 text-sm">No shifts recorded yet. Clock in via <strong>My Shifts</strong> to start building your stats.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
