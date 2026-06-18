import { useEffect, useState } from 'react';
import { Search, Users, ChevronDown, Shield } from 'lucide-react';
import api from '../api/client';

const ROLE_DISPLAY: Record<string, string> = {
  commissioner:   'Commissioner',
  admin:          'Senior Leadership',
  administrator:  'Senior Leadership',
  leadership:     'Leadership',
  senior_command: 'Senior Command',
  supervisor:     'Supervisor',
};
const ROLE_CLS: Record<string, string> = {
  commissioner:   'chip-gold',
  admin:          'chip-red',
  administrator:  'chip-red',
  leadership:     'chip-orange',
  senior_command: 'chip-orange',
  supervisor:     'chip-yellow',
};
const DEPT_CLS: Record<string, string> = {
  Academy: 'chip-green',
  GD:      'chip-cyan',
  Highway: 'chip-gold',
  CIRT:    'chip-red',
  SOG:     'chip-purple',
};
const STATUS_CLS: Record<string, { label: string; cls: string; dot: string }> = {
  on_duty:  { label: 'On Duty',  cls: 'chip-green',  dot: '#22c55e' },
  off_duty: { label: 'Off Duty', cls: 'chip-gray',   dot: '#475569' },
  busy:     { label: 'Busy',     cls: 'chip-yellow', dot: '#eab308' },
  on_scene: { label: 'On Scene', cls: 'chip-blue',   dot: '#3b82f6' },
};

interface Officer {
  id: string; first_name: string; last_name: string;
  rank: string; department: string; status: string;
  callsign: string; role: string; created_at: string;
}

export default function Roster() {
  const [officers,   setOfficers]   = useState<Officer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    api.get('/roster')
      .then(r => { setOfficers(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = officers.filter(o => {
    const q = search.toLowerCase();
    return (!q || `${o.first_name} ${o.last_name} ${o.callsign ?? ''} ${o.rank}`.toLowerCase().includes(q))
      && (!deptFilter || o.department === deptFilter);
  });

  const depts  = [...new Set(officers.map(o => o.department))].sort();
  const onDuty = officers.filter(o => o.status === 'on_duty').length;
  const busy   = officers.filter(o => o.status === 'busy').length;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Page header */}
      <div className="page-header scan-line">
        <div className="flex items-center gap-4">
          <div className="ph-icon">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Officer Roster</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {filtered.length} officer{filtered.length !== 1 ? 's' : ''} · {officers.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <div className="dot-online" />
            <span className="text-slate-400 font-medium">{onDuty} on duty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="dot-busy" />
            <span className="text-slate-400 font-medium">{busy} busy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="dot-offline" />
            <span className="text-slate-400 font-medium">{officers.length - onDuty - busy} off duty</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, callsign, rank…" className="nx-input pl-9" />
        </div>
        <div className="relative">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="nx-input appearance-none pr-9" style={{ colorScheme: 'dark', minWidth: 170 }}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
        </div>
      </div>

      {/* Roster table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Active Personnel</span>
          </div>
          {deptFilter && (
            <button onClick={() => setDeptFilter('')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              Clear filter ×
            </button>
          )}
        </div>

        {loading ? (
          <div className="nx-empty">
            <div className="nx-spinner" />
            <p className="text-slate-600 text-sm">Loading roster…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-icon">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No officers found</p>
            {search && <p className="text-slate-600 text-xs">Try a different search term</p>}
          </div>
        ) : (
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Callsign</th>
                  <th>Officer</th>
                  <th>Rank</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const sc  = STATUS_CLS[o.status] ?? { label: o.status, cls: 'chip-gray', dot: '#475569' };
                  const dc  = DEPT_CLS[o.department] ?? 'chip-gray';
                  const showRole = ['commissioner','admin','administrator','leadership','senior_command','supervisor'].includes(o.role);
                  return (
                    <tr key={o.id}>
                      <td>
                        {o.callsign
                          ? <span className="font-mono font-bold text-sm text-cyan-400">{o.callsign}</span>
                          : <span className="text-slate-600 italic text-xs">No callsign</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                            style={{ background: o.role === 'commissioner' ? 'linear-gradient(135deg,#b45309,#f59e0b)' : 'linear-gradient(135deg,#0891b2,#1d4ed8)' }}>
                            {o.first_name[0]}{o.last_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm leading-tight">
                              {o.first_name} {o.last_name}
                            </div>
                            {showRole && (
                              <span className={`chip text-[9px] mt-0.5 ${ROLE_CLS[o.role] ?? 'chip-gray'}`}>
                                {ROLE_DISPLAY[o.role] ?? o.role.replace('_',' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-slate-300 text-sm">{o.rank}</span>
                      </td>
                      <td>
                        <span className={`chip text-[11px] ${dc}`}>{o.department}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: sc.dot, boxShadow: o.status === 'on_duty' ? `0 0 5px ${sc.dot}` : 'none' }} />
                          <span className="text-sm font-medium" style={{ color: sc.dot }}>{sc.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
