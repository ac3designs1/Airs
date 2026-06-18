import { useEffect, useState } from 'react';
import { AlertTriangle, Search, Plus, X, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { format, parseISO } from 'date-fns';

interface Warrant {
  id: string; type: string; charges: string; description?: string;
  status: string; issued_date: string; citizen_name?: string;
  citizen_id?: string; officer_name?: string; bail_amount?: number; expiry_date?: string;
}
interface Citizen { id: string; first_name: string; last_name: string; dob?: string; }

const CHARGE_PRESETS = [
  'Assault', 'Aggravated Assault', 'Armed Robbery', 'Robbery', 'Grand Theft Auto',
  'Evading Police', 'Drug Possession', 'Drug Trafficking', 'Weapons Offence',
  'Murder', 'Manslaughter', 'Unlawful Entry', 'Fraud', 'Resisting Arrest',
];

export default function Warrants() {
  const [warrants,     setWarrants]     = useState<Warrant[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showForm,     setShowForm]     = useState(false);

  // Citizen search inside form
  const [citizenQ,     setCitizenQ]     = useState('');
  const [citizenRes,   setCitizenRes]   = useState<Citizen[]>([]);
  const [selectedCit,  setSelectedCit]  = useState<Citizen | null>(null);
  const [form, setForm] = useState({ type: 'Arrest', charges: [] as string[], customCharge: '', description: '', bail_amount: '', expiry_date: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/warrants?status=${statusFilter}`).then(r => { setWarrants(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);

  // Citizen search debounce
  useEffect(() => {
    if (!citizenQ.trim()) { setCitizenRes([]); return; }
    const t = setTimeout(async () => {
      try { const r = await api.get(`/citizens?q=${encodeURIComponent(citizenQ)}&limit=8`); setCitizenRes(r.data.citizens); }
      catch { setCitizenRes([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [citizenQ]);

  const toggleCharge = (c: string) =>
    setForm(p => ({ ...p, charges: p.charges.includes(c) ? p.charges.filter(x => x !== c) : [...p.charges, c] }));

  const addCustom = () => {
    const t = form.customCharge.trim();
    if (!t || form.charges.includes(t)) return;
    setForm(p => ({ ...p, charges: [...p.charges, t], customCharge: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCit) { alert('Select a citizen'); return; }
    if (!form.charges.length) { alert('Add at least one charge'); return; }
    setSaving(true);
    try {
      await api.post('/warrants', {
        citizen_id: selectedCit.id, type: form.type, charges: form.charges,
        description: form.description, bail_amount: form.bail_amount ? Number(form.bail_amount) : null,
        expiry_date: form.expiry_date || null,
      });
      setShowForm(false); resetForm(); load();
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setCitizenQ(''); setCitizenRes([]); setSelectedCit(null);
    setForm({ type: 'Arrest', charges: [], customCharge: '', description: '', bail_amount: '', expiry_date: '' });
  };

  const handleServe = async (id: string) => { await api.put(`/warrants/${id}`, { status: 'served' }); load(); };

  const chargesDisplay = (raw: string) => { try { return (JSON.parse(raw) as string[]).join(', '); } catch { return raw; } };

  const filtered = warrants.filter(w => {
    const q = search.toLowerCase();
    return !q || w.citizen_name?.toLowerCase().includes(q) || w.type.toLowerCase().includes(q) || w.charges.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Warrants</h1>
              <p className="text-slate-500 text-sm">{filtered.length} {statusFilter} warrant{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Plus className="w-4 h-4" /> Issue Warrant
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.08)' }}>
          {['active', 'served', 'cancelled', 'expired'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-red-500/20 text-red-300' : 'text-slate-500 hover:text-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject, charge type…" className="nx-input pl-9 text-sm w-full" />
        </div>
      </div>

      {/* Issue warrant modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col" style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.05)' }}>
              <h2 className="text-base font-bold text-white">Issue Warrant</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-5 overflow-y-auto">
              {/* Citizen search */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Subject (Citizen) <span className="text-rose-400">*</span></label>
                {selectedCit ? (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    <div>
                      <div className="font-semibold text-white">{selectedCit.first_name} {selectedCit.last_name}</div>
                      {selectedCit.dob && <div className="text-xs text-slate-500">DOB: {format(parseISO(selectedCit.dob), 'dd/MM/yyyy')}</div>}
                    </div>
                    <button type="button" onClick={() => { setSelectedCit(null); setCitizenQ(''); }} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input value={citizenQ} onChange={e => setCitizenQ(e.target.value)} placeholder="Search citizen name…" className="nx-input pl-9 w-full" />
                    {citizenRes.length > 0 && (
                      <div className="absolute top-full mt-1 w-full rounded-xl overflow-hidden z-10 shadow-xl" style={{ background: '#0d1526', border: '1px solid rgba(6,182,212,0.18)' }}>
                        {citizenRes.map(c => (
                          <button key={c.id} type="button" onClick={() => { setSelectedCit(c); setCitizenQ(''); setCitizenRes([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-sky-500/10 transition-colors">
                            <div className="text-sm text-white font-medium">{c.first_name} {c.last_name}</div>
                            {c.dob && <div className="text-xs text-slate-500">DOB: {format(parseISO(c.dob), 'dd/MM/yyyy')}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                    {citizenQ && !citizenRes.length && <p className="text-xs text-slate-600 mt-1">No citizens found. <a href="/citizens" target="_blank" className="text-sky-400 underline">Create record first</a>.</p>}
                  </div>
                )}
              </div>

              {/* Warrant type */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Warrant Type</label>
                <div className="flex gap-2">
                  {['Arrest', 'Search', 'Bench'].map(t => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${form.type === t ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'text-slate-500 border-slate-700/50 hover:text-slate-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Charges */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Charges <span className="text-rose-400">*</span></label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CHARGE_PRESETS.map(c => (
                    <button key={c} type="button" onClick={() => toggleCharge(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${form.charges.includes(c) ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'text-slate-500 border-slate-700/40 hover:text-slate-300 hover:border-slate-600'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                {/* Custom charge */}
                <div className="flex gap-2">
                  <input value={form.customCharge} onChange={e => setForm(p => ({ ...p, customCharge: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    placeholder="Custom charge…" className="nx-input flex-1 text-sm" />
                  <button type="button" onClick={addCustom} className="px-3 py-2 rounded-xl text-xs font-bold chip-blue flex-shrink-0">Add</button>
                </div>
                {form.charges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.charges.map(c => (
                      <span key={c} className="chip chip-red text-xs flex items-center gap-1">
                        {c}
                        <button type="button" onClick={() => toggleCharge(c)} className="hover:text-white"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description + details */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Circumstances, evidence, reason for warrant…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Bail Amount ($)</label>
                  <input type="number" min="0" value={form.bail_amount} onChange={e => setForm(p => ({ ...p, bail_amount: e.target.value }))}
                    placeholder="e.g. 5000" className="nx-input w-full" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                    className="nx-input w-full" style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  <AlertTriangle className="w-4 h-4" />{saving ? 'Issuing…' : 'Issue Warrant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warrant list */}
      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No {statusFilter} warrants found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => (
            <div key={w.id} className="glass rounded-xl p-5 hover:border-red-500/20 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`chip text-xs ${w.type === 'Arrest' ? 'chip-red' : w.type === 'Search' ? 'chip-yellow' : 'chip-blue'}`}>{w.type} Warrant</span>
                    <span className={`chip text-xs ${w.status === 'active' ? 'chip-green' : w.status === 'served' ? 'chip-blue' : 'chip-gray'} capitalize`}>{w.status}</span>
                    {w.bail_amount != null && w.bail_amount > 0 && (
                      <span className="text-xs text-amber-400 font-mono">Bail: ${w.bail_amount.toLocaleString()}</span>
                    )}
                  </div>
                  <h3 className="text-white font-bold">{w.citizen_name ?? 'Unknown Subject'}</h3>
                  <p className="text-sm text-slate-400 mt-1">{chargesDisplay(w.charges)}</p>
                  {w.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{w.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                    <span>Issued: {format(parseISO(w.issued_date), 'dd MMM yyyy')}</span>
                    {w.expiry_date && <span>Expires: {format(parseISO(w.expiry_date), 'dd MMM yyyy')}</span>}
                    {w.officer_name && <span>By: {w.officer_name}</span>}
                  </div>
                </div>
                {w.status === 'active' && (
                  <button onClick={() => handleServe(w.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-colors"
                    style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Serve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
