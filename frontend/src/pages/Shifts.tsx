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

const LEADERSHIP = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

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
      <div className="page-header page-header-green scan-line">
        <div className="flex items-center gap-4">
          <div className="ph-icon ph-icon-green">
            <Clock className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Duty Shifts</h1>
            <p className="text-slate-500 text-sm mt-0.5">{auth.user?.first_name} {auth.user?.last_name}
              {auth.user?.callsign && <span className="text-cyan-400 font-mono font-bold ml-2">{auth.user.callsign}</span>}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'This Week',      value: fmtMins(stats.week_mins),    icon: Calendar,    color: '#06b6d4' },
          { label: 'Total Hours',    value: fmtMins(stats.total_mins),   icon: Clock,       color: '#a78bfa' },
          { label: 'Total Shifts',   value: stats.total_shifts.toString(), icon: CheckCircle, color: '#22c55e' },
          { label: isLeader ? 'Active Officers' : 'Current Status', value: isLeader ? stats.active_shifts.toString() : (active ? 'On Duty' : 'Off Duty'), icon: BarChart2, color: active ? '#22c55e' : '#475569' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ background:`${s.color}0d`, border:`1px solid ${s.color}22` }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color:`${s.color}80` }}>{s.label}</span>
              <div className="p-1.5 rounded-lg" style={{ background:`${s.color}18` }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">{s.value}</div>
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
        <div className="card-header">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Shift History</span>
          </div>
          {isLeader && (
            <div className="nx-tabs">
              {(['mine', 'all'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`nx-tab ${tab === t ? 'active' : ''}`}>
                  {t === 'mine' ? 'My Shifts' : 'All Officers'}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading ? (
          <div className="nx-empty"><div className="nx-spinner" /><p className="text-slate-600 text-sm">Loading shifts…</p></div>
        ) : display.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-icon"><Clock className="w-6 h-6 text-slate-600" /></div>
            <p className="text-slate-500 text-sm font-medium">No shifts logged yet</p>
            <p className="text-slate-600 text-xs">Click <strong className="text-slate-400">Start Shift</strong> to begin tracking</p>
          </div>
        ) : (
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead><tr>
                {(isLeader ? ['Officer','Callsign','Dept','Start','End','Duration','Status','Notes'] : ['Date','Start','End','Duration','Status','Notes']).map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {display.map(s => (
                  <tr key={s.id}>
                    {isLeader && <td className="font-semibold text-white">{s.officer_name}</td>}
                    {isLeader && <td className="font-mono text-cyan-400 text-sm">{s.callsign || '—'}</td>}
                    {isLeader && <td className="text-slate-400 text-xs">{s.department || '—'}</td>}
                    {!isLeader && <td className="text-slate-500 text-xs">{format(parseISO(s.start_time), 'dd MMM yyyy')}</td>}
                    <td className="font-mono text-slate-300">{format(parseISO(s.start_time), 'HH:mm')}</td>
                    <td className="font-mono text-slate-300">{s.end_time ? format(parseISO(s.end_time), 'HH:mm') : '—'}</td>
                    <td className="font-mono font-semibold text-slate-200">{s.duration_mins ? fmtMins(s.duration_mins) : (s.status === 'active' ? <span className="text-green-400 font-bold">Active</span> : '—')}</td>
                    <td><span className={`chip text-[10px] ${s.status === 'active' ? 'chip-green' : 'chip-gray'}`}>{s.status === 'active' ? 'On Duty' : 'Ended'}</span></td>
                    <td className="text-xs text-slate-500 max-w-[160px] truncate">{s.notes || '—'}</td>
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
