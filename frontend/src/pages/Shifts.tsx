import { useEffect, useState } from 'react';
import { Clock, Play, Square, BarChart2, Calendar, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDuration, intervalToDuration, parseISO } from 'date-fns';

interface Shift {
  id: string; officer_id: string; officer_name: string; callsign?: string;
  department?: string; start_time: string; end_time?: string;
  duration_mins?: number; status: 'active' | 'completed'; notes?: string;
}
interface Stats { total_shifts: number; total_mins: number; active_shifts: number; week_mins: number; }

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

function fmtMins(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60), min = m % 60;
  return h ? `${h}h ${min}m` : `${min}m`;
}

export default function Shifts() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [active, setActive] = useState<Shift | null>(null);
  const [stats, setStats] = useState<Stats>({ total_shifts: 0, total_mins: 0, active_shifts: 0, week_mins: 0 });
  const [loading, setLoading] = useState(true);
  const [endNotes, setEndNotes] = useState('');
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const [tab, setTab] = useState<'mine' | 'all'>('mine');

  const load = () => {
    Promise.all([
      api.get('/shifts'),
      api.get('/shifts/active'),
      api.get('/shifts/stats'),
    ]).then(([s, a, st]) => {
      setShifts(s.data);
      setActive(a.data);
      setStats(st.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!active) { setElapsed(''); return; }
    const tick = () => {
      const dur = intervalToDuration({ start: parseISO(active.start_time), end: new Date() });
      setElapsed(formatDuration(dur, { format: ['hours', 'minutes', 'seconds'] }) || '< 1s');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  const startShift = async () => {
    setStarting(true);
    try { await api.post('/shifts/start'); load(); }
    catch (e: unknown) { alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error'); }
    finally { setStarting(false); }
  };

  const endShift = async () => {
    setEnding(true);
    try { await api.post('/shifts/end', { notes: endNotes }); setEndNotes(''); load(); }
    catch { /* ignore */ } finally { setEnding(false); }
  };

  const display = tab === 'mine' ? shifts.filter(s => s.officer_id === auth.user?.id) : shifts;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-6 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(14,165,233,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
              <Clock className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Duty Shifts</h1>
              <p className="text-slate-500 text-sm">{auth.user?.first_name} {auth.user?.last_name}
                {auth.user?.callsign && <span className="text-sky-400 font-mono ml-2">{auth.user.callsign}</span>}
              </p>
            </div>
          </div>
          {!active ? (
            <button onClick={startShift} disabled={starting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Play className="w-4 h-4" />
              {starting ? 'Starting…' : 'Start Shift'}
            </button>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.8)' }} />
              <span className="text-green-400 text-sm font-mono font-semibold">{elapsed}</span>
              <button onClick={endShift} disabled={ending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 text-xs font-bold transition-colors hover:bg-red-500/15"
                style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                <Square className="w-3 h-3" />
                {ending ? 'Ending…' : 'End Shift'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This Week', value: fmtMins(stats.week_mins), icon: Calendar, color: '#0ea5e9' },
          { label: 'Total Hours', value: fmtMins(stats.total_mins), icon: Clock, color: '#a78bfa' },
          { label: 'Total Shifts', value: stats.total_shifts.toString(), icon: CheckCircle, color: '#22c55e' },
          { label: isLeader ? 'Active Officers' : 'Status', value: isLeader ? stats.active_shifts.toString() : (active ? 'On Duty' : 'Off Duty'), icon: BarChart2, color: active ? '#22c55e' : '#475569' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Active shift card */}
      {active && (
        <div className="glass rounded-xl p-5" style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.04)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-green-400">Active Shift</span>
              </div>
              <p className="text-white font-semibold">Started {format(parseISO(active.start_time), 'h:mm a · dd MMM yyyy')}</p>
              <p className="text-slate-500 text-sm mt-1">Elapsed: <span className="text-green-400 font-mono">{elapsed}</span></p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-600 mb-1.5">End-of-shift notes (optional)</label>
                <input value={endNotes} onChange={e => setEndNotes(e.target.value)}
                  placeholder="Any notes for this shift…"
                  className="nx-input text-sm" style={{ minWidth: 220 }} />
              </div>
              <button onClick={endShift} disabled={ending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <Square className="w-4 h-4" />
                End Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
          <h2 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-sky-400" /> Shift History</h2>
          {isLeader && (
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.08)' }}>
              {(['mine', 'all'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t === 'mine' ? 'My Shifts' : 'All Officers'}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading…</div>
        ) : display.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 mx-auto mb-2 text-slate-700" />
            <p className="text-slate-600 text-sm">No shifts logged yet. Click <strong className="text-slate-400">Start Shift</strong> to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(14,165,233,0.06)' }}>
                  {(isLeader ? ['Officer', 'Callsign', 'Dept', 'Start', 'End', 'Duration', 'Status', 'Notes'] : ['Date', 'Start', 'End', 'Duration', 'Status', 'Notes']).map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(14,165,233,0.04)' }} className="hover:bg-sky-500/[0.02] transition-colors">
                    {isLeader && <td className="px-4 py-3 text-sm text-white font-medium">{s.officer_name}</td>}
                    {isLeader && <td className="px-4 py-3 text-sm text-sky-400 font-mono">{s.callsign || '—'}</td>}
                    {isLeader && <td className="px-4 py-3 text-xs text-slate-400">{s.department || '—'}</td>}
                    {!isLeader && <td className="px-4 py-3 text-xs text-slate-500">{format(parseISO(s.start_time), 'dd MMM yyyy')}</td>}
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{format(parseISO(s.start_time), 'HH:mm')}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{s.end_time ? format(parseISO(s.end_time), 'HH:mm') : '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-300">{s.duration_mins ? fmtMins(s.duration_mins) : (s.status === 'active' ? <span className="text-green-400">Active</span> : '—')}</td>
                    <td className="px-4 py-3">
                      <span className={`chip text-[10px] ${s.status === 'active' ? 'chip-green' : 'chip-gray'}`}>
                        {s.status === 'active' ? 'On Duty' : 'Ended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
