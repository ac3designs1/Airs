import { useEffect, useState } from 'react';
import { AlertCircle, Plus, Search, X, Car } from 'lucide-react';
import api from '../api/client';
import { format, parseISO } from 'date-fns';

interface Bolo {
  id: string; type: string; subject: string; description: string;
  plate?: string; vehicle_description?: string; citizen_name?: string;
  armed: number; dangerous: number; status: string;
  officer_name?: string; officer_callsign?: string; created_at: string; expires_at?: string;
}

const BOLO_TYPES = ['Person', 'Vehicle', 'Person & Vehicle'];

export default function BOLOs() {
  const [bolos,   setBolos]   = useState<Bolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('active');
  const [search,  setSearch]  = useState('');
  const [showForm,setShowForm]= useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    type: 'Person', subject: '', description: '',
    plate: '', vehicle_description: '', armed: false, dangerous: false, expires_at: '',
  });

  const load = () => {
    setLoading(true);
    api.get(`/bolos?status=${status}`).then(r => { setBolos(r.data.bolos); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [status]);

  const cancel = async (id: string) => {
    await api.put(`/bolos/${id}/cancel`, {});
    load();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/bolos', { ...form, armed: form.armed ? 1 : 0, dangerous: form.dangerous ? 1 : 0, expires_at: form.expires_at || null });
      setShowForm(false);
      setForm({ type: 'Person', subject: '', description: '', plate: '', vehicle_description: '', armed: false, dangerous: false, expires_at: '' });
      if (status === 'active') load();
    } finally { setSaving(false); }
  };

  const filtered = bolos.filter(b => {
    const q = search.toLowerCase();
    return !q || b.subject.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || (b.plate ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(239,68,68,0.06))', border: '1px solid rgba(249,115,22,0.20)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BOLOs</h1>
              <p className="text-slate-500 text-sm">Be On the Lookout — {filtered.length} {status}</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#ea580c,#dc2626)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <Plus className="w-4 h-4" /> Issue BOLO
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.08)' }}>
          {['active', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${status === s ? 'bg-orange-500/20 text-orange-300' : 'text-slate-500 hover:text-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject, description, plate…" className="nx-input pl-9 text-sm w-full" />
        </div>
      </div>

      {/* BOLO cards */}
      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No {status} BOLOs</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(b => (
            <div key={b.id} className="glass rounded-xl p-5 border transition-all hover:border-orange-500/20"
              style={{ borderColor: b.armed || b.dangerous ? 'rgba(239,68,68,0.25)' : 'rgba(14,165,233,0.06)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`chip text-xs ${b.type === 'Vehicle' ? 'chip-blue' : b.type === 'Person & Vehicle' ? 'chip-yellow' : 'chip-orange'}`}>{b.type}</span>
                    {b.armed ? <span className="chip chip-red text-xs">ARMED</span> : null}
                    {b.dangerous ? <span className="chip chip-red text-xs">DANGEROUS</span> : null}
                    {b.status === 'cancelled' && <span className="chip chip-gray text-xs">CANCELLED</span>}
                  </div>
                  <h3 className="font-bold text-white text-sm">{b.subject}</h3>
                  {b.citizen_name && b.citizen_name !== b.subject && (
                    <p className="text-xs text-slate-500 mt-0.5">Linked: {b.citizen_name}</p>
                  )}
                </div>
                {b.status === 'active' && (
                  <button onClick={() => cancel(b.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-3">{b.description}</p>

              {(b.plate || b.vehicle_description) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                  {b.plate && <span className="font-mono text-emerald-400 font-bold">{b.plate}</span>}
                  {b.vehicle_description && <span>{b.vehicle_description}</span>}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>By: {b.officer_callsign ? `${b.officer_callsign} — ` : ''}{b.officer_name ?? 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  {b.expires_at && <span className="text-amber-600">Expires: {format(parseISO(b.expires_at), 'dd/MM/yy')}</span>}
                  <span>{format(parseISO(b.created_at), 'dd MMM HH:mm')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue BOLO modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(249,115,22,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(249,115,22,0.12)', background: 'rgba(249,115,22,0.05)' }}>
              <h2 className="text-base font-bold text-white">Issue BOLO</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Type</label>
                <div className="flex gap-2">
                  {BOLO_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.type === t ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : 'text-slate-500 border-slate-700/50 hover:text-slate-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Subject <span className="text-rose-400">*</span></label>
                <input required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. John Doe / Unknown male" className="nx-input w-full" />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Description <span className="text-rose-400">*</span></label>
                <textarea required rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Physical description, last known location, actions, reason for BOLO…"
                  className="nx-input w-full resize-none text-sm" />
              </div>

              {(form.type === 'Vehicle' || form.type === 'Person & Vehicle') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Plate</label>
                    <input value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                      placeholder="ABC123" className="nx-input w-full font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Vehicle Description</label>
                    <input value={form.vehicle_description} onChange={e => setForm(p => ({ ...p, vehicle_description: e.target.value }))}
                      placeholder="e.g. Blue sedan" className="nx-input w-full" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Expiry Date (optional)</label>
                <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  className="nx-input w-full" style={{ colorScheme: 'dark' }} />
              </div>

              <div className="flex gap-4">
                {[{ k: 'armed', l: 'Subject is Armed' }, { k: 'dangerous', l: 'Considered Dangerous' }].map(f => (
                  <label key={f.k} className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <div onClick={() => setForm(p => ({ ...p, [f.k]: !(p as Record<string, unknown>)[f.k] }))}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${(form as Record<string, unknown>)[f.k] ? 'bg-red-500 border-red-500' : 'border-slate-600'}`}>
                      {(form as Record<string, unknown>)[f.k] && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <span className="text-sm text-slate-300">{f.l}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#ea580c,#dc2626)' }}>
                  <AlertCircle className="w-4 h-4" />{saving ? 'Issuing…' : 'Issue BOLO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
