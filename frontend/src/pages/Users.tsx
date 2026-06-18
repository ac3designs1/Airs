import { useEffect, useState } from 'react';
import { Users as UsersIcon, Search, Edit2, Trash2, X, Save, ChevronDown } from 'lucide-react';
import api from '../api/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Officer {
  id: string; callsign: string; username: string;
  first_name: string; last_name: string;
  rank: string; department: string; role: string; status: string;
}

// 'commissioner' intentionally excluded — it cannot be set via the dropdown UI
const ROLES = ['recruit', 'officer', 'supervisor', 'leadership', 'senior_command', 'administrator', 'admin'] as const;
const DEPARTMENTS = ['Academy', 'GD', 'Highway', 'CIRT', 'SOG'];

const ROLE_CLS: Record<string, string> = {
  commissioner:   'text-yellow-300 bg-yellow-400/10 border-yellow-400/40',
  admin:          'text-red-400 bg-red-500/10 border-red-500/30',
  administrator:  'text-red-400 bg-red-500/10 border-red-500/30',
  senior_command: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  leadership:     'text-amber-400 bg-amber-500/10 border-amber-500/30',
  supervisor:     'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  officer:        'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  recruit:        'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const EDITABLE_ROLES = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

export default function Users() {
  const { auth } = useAuth();
  const canManage = EDITABLE_ROLES.includes(auth.user?.role ?? '');
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState<Officer | null>(null);
  const [editForm, setEditForm] = useState({ rank: '', department: '', role: '', callsign: '' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.get('/roster').then(r => { setOfficers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (!canManage) return <Navigate to="/dashboard" replace />;

  const filtered = officers.filter(o => {
    const q = search.toLowerCase();
    return !q || `${o.first_name} ${o.last_name} ${o.username} ${o.callsign ?? ''}`.toLowerCase().includes(q);
  });

  function openEdit(o: Officer) {
    setEditing(o);
    setEditForm({ rank: o.rank, department: o.department, role: o.role, callsign: o.callsign ?? '' });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/roster/${editing.id}`, {
        first_name: editing.first_name, last_name: editing.last_name,
        rank: editForm.rank, department: editForm.department,
        role: editForm.role, callsign: editForm.callsign || null,
      });
      setOfficers(prev => prev.map(o => o.id === editing.id ? { ...o, ...editForm } : o));
      setEditing(null);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function deleteOfficer(id: string) {
    if (!confirm('Remove this officer?')) return;
    try {
      await api.delete(`/roster/${id}`);
      setOfficers(prev => prev.filter(o => o.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5"
        style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.10),rgba(99,102,241,0.05))', border: '1px solid rgba(6,182,212,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <UsersIcon className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">User Management</h1>
            <p className="text-slate-500 text-sm">{filtered.length} registered officers · assign roles &amp; departments</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input type="text" placeholder="Search by name, username, callsign…" value={search}
          onChange={e => setSearch(e.target.value)} className="nx-input pl-10" />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="nx-table-wrap">
        <table className="nx-table">
          <thead>
            <tr>
              {['Officer', 'Username', 'Callsign', 'Department', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-600">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-600 text-sm">No officers found</td></tr>
            ) : filtered.map((o, i) => (
              <tr key={o.id} className={i % 2 ? 'bg-sky-500/[0.015]' : ''}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                      {o.first_name[0]}{o.last_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{o.first_name} {o.last_name}</div>
                      <div className="text-[10px] text-slate-500">{o.rank}</div>
                    </div>
                  </div>
                </td>
                <td className="font-mono text-slate-400 text-sm">{o.username}</td>
                <td className="font-mono text-sky-400 text-xs">{o.callsign || '—'}</td>
                <td>
                  <span className="chip chip-blue text-[11px]">{o.department}</span>
                </td>
                <td>
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold border capitalize ${ROLE_CLS[o.role] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                    {o.role}
                  </span>
                </td>
                <td>
                  <span className={`chip text-[11px] capitalize ${o.status === 'on_duty' ? 'chip-green' : 'chip-gray'}`}>
                    {o.status?.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(o)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {o.id !== auth.user?.id && (
                      <button onClick={() => deleteOfficer(o.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0a1020', border: '1px solid rgba(6,182,212,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
              <div>
                <h2 className="font-bold text-white">Edit Officer</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editing.first_name} {editing.last_name}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Callsign */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Callsign</label>
                <input value={editForm.callsign} onChange={e => setEditForm(f => ({ ...f, callsign: e.target.value }))}
                  placeholder="e.g. GD-102" className="nx-input" />
              </div>
              {/* Role */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role</label>
                {editing.role === 'commissioner' ? (
                  <div className="nx-input flex items-center gap-2 opacity-60 cursor-not-allowed">
                    <span className="text-yellow-300 font-bold">Commissioner</span>
                    <span className="text-[10px] text-slate-600">— cannot be changed here</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                      className="nx-input appearance-none pr-8" style={{ colorScheme: 'dark' }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                  </div>
                )}
                {editForm.role === 'recruit' && (
                  <p className="text-[10px] text-purple-400 mt-1.5">This officer will appear in the Recruit Tracker.</p>
                )}
              </div>
              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Department</label>
                <div className="relative">
                  <select value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                    className="nx-input appearance-none pr-8" style={{ colorScheme: 'dark' }}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                </div>
              </div>
              {/* Rank */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rank</label>
                <input value={editForm.rank} onChange={e => setEditForm(f => ({ ...f, rank: e.target.value }))}
                  placeholder="e.g. Constable" className="nx-input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(null)} className="btn-ghost flex-1 py-2.5">Cancel</button>
                <button onClick={saveEdit} disabled={saving}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
