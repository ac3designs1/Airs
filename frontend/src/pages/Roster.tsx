import { useEffect, useState } from 'react';
import { Search, Users, ChevronDown } from 'lucide-react';
import api from '../api/client';

const ROLE_DISPLAY: Record<string, string> = {
  admin: 'Senior Leadership',
  administrator: 'Senior Leadership',
  leadership: 'Leadership',
  senior_command: 'Senior Command',
  supervisor: 'Supervisor',
};

interface Officer {
  id: string;
  first_name: string;
  last_name: string;
  rank: string;
  department: string;
  status: string;
  callsign: string;
  role: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  on_duty:  { label: 'On Duty',  cls: 'chip-green' },
  off_duty: { label: 'Off Duty', cls: 'chip-gray' },
  busy:     { label: 'Busy',     cls: 'chip-yellow' },
  on_scene: { label: 'On Scene', cls: 'chip-blue' },
};

const deptColors: Record<string, string> = {
  Academy: 'chip-green',
  GD:      'chip-blue',
  Highway: 'chip-gold',
  CIRT:    'chip-red',
  SOG:     'chip-yellow',
};

export default function Roster() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    api.get('/roster').then(r => { setOfficers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = officers.filter(o => {
    const q = search.toLowerCase();
    return (!q || `${o.first_name} ${o.last_name} ${o.callsign ?? ''} ${o.rank}`.toLowerCase().includes(q))
      && (!deptFilter || o.department === deptFilter);
  });

  const depts = [...new Set(officers.map(o => o.department))];

  const onDuty = officers.filter(o => o.status === 'on_duty').length;
  const busy   = officers.filter(o => o.status === 'busy').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-6 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.04),rgba(14,165,233,0.06))', border: '1px solid rgba(14,165,233,0.18)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
              <Users className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Officer Roster</h1>
              <p className="text-slate-500 text-sm mt-0.5">{filtered.length} officer{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
              <span className="text-slate-400">{onDuty} on duty</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-slate-400">{busy} busy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input type="text" placeholder="Search by name, callsign, rank…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="nx-input pl-9" />
        </div>
        <div className="relative">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="nx-input appearance-none pr-8" style={{ colorScheme: 'dark', minWidth: 160 }}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="nx-table">
          <thead>
            <tr>
              {['Callsign', 'Officer', 'Rank', 'Department', 'Status'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-600">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading roster…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-600">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                No officers found
              </td></tr>
            ) : filtered.map((o, i) => {
              const sc = statusConfig[o.status] ?? { label: o.status, cls: 'chip-gray' };
              const dc = deptColors[o.department] ?? 'chip-gray';
              return (
                <tr key={o.id} className={i % 2 ? 'bg-sky-500/[0.015]' : ''}>
                  <td>
                    <span className="font-mono font-semibold text-sky-400 text-sm">
                      {o.callsign || <span className="text-slate-600 italic text-xs">No callsign</span>}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                        {o.first_name[0]}{o.last_name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{o.first_name} {o.last_name}</div>
                        {['admin','administrator','leadership','senior_command'].includes(o.role) && (
                          <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">{ROLE_DISPLAY[o.role] ?? o.role.replace('_',' ')}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-300 text-sm">{o.rank}</td>
                  <td><span className={`chip text-[11px] ${dc}`}>{o.department}</span></td>
                  <td><span className={`chip text-[11px] capitalize ${sc.cls}`}>{sc.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
