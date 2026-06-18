import { useEffect, useState } from 'react';
import { BarChart2, Users, Clock, TrendingUp, Activity, Shield } from 'lucide-react';
import api from '../api/client';
import { format, parseISO } from 'date-fns';

interface DeptStat { department: string; total: number; on_duty: number; }
interface RankStat  { rank: string; total: number; }
interface Promotion { officer_name: string; from_rank: string; to_rank: string; effective_date: string; department: string; }
interface DeptStats { by_department: DeptStat[]; by_rank: RankStat[]; recent_promotions: Promotion[]; }

const DEPT_COLORS: Record<string, string> = {
  Academy: '#10b981', GD: '#3b82f6', Highway: '#f59e0b', CIRT: '#ef4444', SOG: '#a855f7', 'Commissioner Office': '#fcd34d',
};

export default function DutyAnalytics() {
  const [data,    setData]    = useState<DeptStats | null>(null);
  const [officers,setOfficers]= useState<{ status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats/department'),
      api.get('/roster'),
    ]).then(([s, r]) => {
      setData(s.data);
      setOfficers(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const onDuty = officers.filter(o => o.status !== 'off_duty').length;
  const total  = officers.length;
  const maxDept = Math.max(...(data?.by_department.map(d => d.total) ?? [1]), 1);
  const maxRank = Math.max(...(data?.by_rank.map(r => r.total) ?? [1]), 1);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.20)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <BarChart2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Duty Analytics</h1>
            <p className="text-slate-500 text-sm">Live department-wide overview</p>
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Officers', value: total,   icon: Users,     color: 'text-purple-400',    bg: 'rgba(168,85,247,0.10)' },
          { label: 'On Duty Now',    value: onDuty,  icon: Activity,  color: 'text-green-400',  bg: 'rgba(34,197,94,0.10)' },
          { label: 'Off Duty',       value: total - onDuty, icon: Clock, color: 'text-slate-400', bg: 'rgba(71,85,105,0.10)' },
          { label: 'Departments',    value: data?.by_department.filter(d => d.total > 0).length ?? 0, icon: Shield, color: 'text-purple-400', bg: 'rgba(168,85,247,0.10)' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className="p-2 rounded-lg w-fit mb-2" style={{ background: s.bg }}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading analytics…</div> : (
        <div className="grid xl:grid-cols-2 gap-5">
          {/* Officers by department */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Officers by Division
            </h2>
            {(data?.by_department ?? []).length === 0 ? (
              <p className="text-slate-600 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {(data?.by_department ?? []).map(d => {
                  const pct = maxDept > 0 ? Math.round(d.total / maxDept * 100) : 0;
                  const color = DEPT_COLORS[d.department] ?? '#64748b';
                  return (
                    <div key={d.department}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-sm font-semibold text-white">{d.department}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-400">{d.on_duty} on duty</span>
                          <span className="text-slate-500">{d.total} total</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(168,85,247,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Officers by rank */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Officers by Rank
            </h2>
            {(data?.by_rank ?? []).length === 0 ? (
              <p className="text-slate-600 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {(data?.by_rank ?? []).map(r => {
                  const pct = maxRank > 0 ? Math.round(r.total / maxRank * 100) : 0;
                  return (
                    <div key={r.rank} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-slate-400 truncate flex-shrink-0">{r.rank}</div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(168,85,247,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 w-6 text-right flex-shrink-0">{r.total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duty status breakdown */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" /> Duty Status Breakdown
            </h2>
            {(data?.by_department ?? []).length === 0 ? (
              <p className="text-slate-600 text-sm">No officers registered.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'On Duty',  value: onDuty, color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
                  { label: 'Off Duty', value: total - onDuty, color: '#475569', bg: 'rgba(71,85,105,0.10)' },
                  { label: 'Total',    value: total, color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent promotions */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Recent Promotions
            </h2>
            {(data?.recent_promotions ?? []).length === 0 ? (
              <p className="text-slate-600 text-sm">No promotions on record yet.</p>
            ) : (
              <div className="space-y-2.5">
                {(data?.recent_promotions ?? []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2" style={{ borderBottom: i < (data?.recent_promotions.length ?? 0) - 1 ? '1px solid rgba(168,85,247,0.06)' : 'none' }}>
                    <div>
                      <div className="text-sm font-semibold text-white">{p.officer_name}</div>
                      <div className="text-xs text-slate-500">
                        {p.from_rank} → <span className="text-green-400 font-semibold">{p.to_rank}</span>
                        {p.department && <span className="ml-1">· {p.department}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {p.effective_date ? format(parseISO(p.effective_date), 'dd MMM yy') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
