import { useEffect, useState } from 'react';
import { Sword, Plus, Search, X, Shield } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Weapon {
  id: string; serial: string; weapon_type: string; model?: string;
  assigned_to_id?: string; assigned_to_name?: string; assigned_callsign?: string;
  status: 'available' | 'assigned' | 'lost' | 'decommissioned';
  issued_date?: string; notes?: string; created_at: string;
}
interface Officer { id: string; first_name: string; last_name: string; callsign?: string; }

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const TYPES = ['Pistol', 'Rifle', 'Shotgun', 'Taser', 'Sniper Rifle', 'SMG', 'Less-Lethal'];
const STATUS_CFG = {
  available:     { cls: 'chip-yellow', label: 'Available' },
  assigned:      { cls: 'chip-green',  label: 'Assigned' },
  lost:          { cls: 'chip-red',    label: 'Lost/Missing' },
  decommissioned:{ cls: 'chip-gray',   label: 'Decommissioned' },
};

export default function WeaponsInventory() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [assignModal, setAssignModal] = useState<Weapon | null>(null);
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [form, setForm] = useState({ serial: '', weapon_type: 'Pistol', model: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([api.get('/weapons'), ...(isLeader ? [api.get('/roster')] : [])]).then(([w, r]) => {
      setWeapons(w.data); if (r) setOfficers(r.data); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const addWeapon = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/weapons', form); setShowForm(false); setForm({ serial: '', weapon_type: 'Pistol', model: '', notes: '' }); load(); }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error'); }
    finally { setSaving(false); }
  };

  const assign = async () => {
    if (!assignModal) return; setSaving(true);
    try {
      await api.put(`/weapons/${assignModal.id}`, { officer_id: assignOfficerId || null, status: assignOfficerId ? 'assigned' : 'available' });
      setAssignModal(null); load();
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/weapons/${id}`, { status }); load();
  };

  const filtered = weapons.filter(w => {
    const q = search.toLowerCase();
    return (!q || w.serial.toLowerCase().includes(q) || (w.assigned_to_name ?? '').toLowerCase().includes(q) || (w.model ?? '').toLowerCase().includes(q))
      && (!typeFilter || w.weapon_type === typeFilter)
      && (!statusFilter || w.status === statusFilter);
  });

  const types = [...new Set(weapons.map(w => w.weapon_type))];
  const counts = { total: weapons.length, assigned: weapons.filter(w => w.status === 'assigned').length, available: weapons.filter(w => w.status === 'available').length };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Sword className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Weapons Inventory</h1>
              <p className="text-slate-500 text-sm">{counts.total} weapons · {counts.assigned} assigned · {counts.available} available</p>
            </div>
          </div>
          {isLeader && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Plus className="w-4 h-4" /> Add Weapon
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total', value: counts.total, color: '#e2e8f0' }, { label: 'Assigned', value: counts.assigned, color: '#4ade80' }, { label: 'Available', value: counts.available, color: '#fbbf24' }].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search serial, officer, model…" className="nx-input pl-9 text-sm w-full" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="nx-input text-sm" style={{ colorScheme: 'dark' }}>
          <option value="">All Types</option>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="nx-input text-sm" style={{ colorScheme: 'dark' }}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="lost">Lost/Missing</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
      </div>

      {/* Add weapon modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(239,68,68,0.10)', background: 'rgba(239,68,68,0.05)' }}>
              <h2 className="text-base font-bold text-white">Add Weapon to Inventory</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={addWeapon} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Serial Number <span className="text-rose-400">*</span></label>
                <input required value={form.serial} onChange={e => setForm(p => ({ ...p, serial: e.target.value }))} placeholder="e.g. WPN-006" className="nx-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Type <span className="text-rose-400">*</span></label>
                  <select value={form.weapon_type} onChange={e => setForm(p => ({ ...p, weapon_type: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Make / Model</label>
                  <input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="e.g. Glock 17" className="nx-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Condition, storage location, etc." className="nx-input w-full" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  {saving ? 'Adding…' : 'Add Weapon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(14,165,233,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.10)' }}>
              <h2 className="text-base font-bold text-white">Assign Weapon</h2>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">Serial <span className="text-sky-400 font-mono">{assignModal.serial}</span> · {assignModal.weapon_type} {assignModal.model}</p>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Assign To Officer</label>
                <select value={assignOfficerId} onChange={e => setAssignOfficerId(e.target.value)} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="">Unassign (return to armory)</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAssignModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm">Cancel</button>
                <button onClick={assign} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
                  {saving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-600">Loading…</div>
        : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-10 h-10 mx-auto mb-2 text-slate-700" />
            <p className="text-slate-600 text-sm">No weapons found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                  {['Serial', 'Type', 'Model', 'Assigned To', 'Callsign', 'Issued', 'Status', ...(isLeader ? ['Actions'] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => {
                  const sc = STATUS_CFG[w.status] ?? STATUS_CFG.available;
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(14,165,233,0.04)' }} className="hover:bg-sky-500/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-sky-400">{w.serial}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{w.weapon_type}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{w.model || '—'}</td>
                      <td className="px-4 py-3 text-sm text-white">{w.assigned_to_name || <span className="text-slate-600">Unassigned</span>}</td>
                      <td className="px-4 py-3 text-xs font-mono text-sky-400">{w.assigned_callsign || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{w.issued_date ? format(parseISO(w.issued_date), 'dd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3"><span className={`chip text-[10px] ${sc.cls}`}>{sc.label}</span></td>
                      {isLeader && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => { setAssignModal(w); setAssignOfficerId(w.assigned_to_id ?? ''); }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold chip-blue">Assign</button>
                            {w.status !== 'decommissioned' && (
                              <button onClick={() => updateStatus(w.id, 'decommissioned')}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold chip-gray">Decom.</button>
                            )}
                          </div>
                        </td>
                      )}
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
