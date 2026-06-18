import { useEffect, useState } from 'react';
import {
  Users, Search, Plus, X, ChevronRight, AlertTriangle,
  Car, FileText, Shield, Edit2, Save, Phone, MapPin,
  Calendar, User, AlertCircle
} from 'lucide-react';
import api from '../api/client';
import { format, parseISO } from 'date-fns';

interface Citizen {
  id: string; first_name: string; last_name: string; dob?: string;
  gender?: string; ethnicity?: string; height?: string; weight?: string;
  eye_color?: string; hair_color?: string; address?: string; phone?: string;
  occupation?: string; license_status: string; license_class?: string;
  notes?: string; flags?: string; created_at: string;
  // joined from detail endpoint
  vehicles?: Vehicle[]; warrants?: Warrant[]; arrests?: Arrest[]; bolos?: Bolo[];
}
interface Vehicle { id: string; plate: string; make?: string; model?: string; year?: string; color?: string; stolen: number; impounded: number; }
interface Warrant { id: string; type: string; charges: string; status: string; issued_date: string; }
interface Arrest { id: string; case_number: string; charges: string; created_at: string; }
interface Bolo { id: string; subject: string; description: string; armed: number; dangerous: number; }

const LIC_CFG: Record<string, { cls: string; label: string }> = {
  valid:     { cls: 'chip-green',  label: 'Valid' },
  suspended: { cls: 'chip-yellow', label: 'Suspended' },
  revoked:   { cls: 'chip-red',    label: 'Revoked' },
  unlicensed:{ cls: 'chip-red',    label: 'Unlicensed' },
  expired:   { cls: 'chip-gray',   label: 'Expired' },
};

const blank = {
  first_name: '', last_name: '', dob: '', gender: '', ethnicity: '',
  height: '', weight: '', eye_color: '', hair_color: '',
  address: '', phone: '', occupation: '', license_status: 'valid', license_class: 'B', notes: '',
};

export default function Citizens() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Citizen | null>(null);
  const [detail,   setDetail]   = useState<Citizen | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ ...blank });
  const [saving,   setSaving]   = useState(false);

  const search_ = async (q: string) => {
    if (!q.trim()) { setCitizens([]); return; }
    setLoading(true);
    try { const r = await api.get(`/citizens?q=${encodeURIComponent(q)}&limit=30`); setCitizens(r.data.citizens); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => search_(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const openDetail = async (c: Citizen) => {
    setSelected(c); setDetail(null); setEditing(false); setLoadingDetail(true);
    try { const r = await api.get(`/citizens/${c.id}`); setDetail(r.data); }
    finally { setLoadingDetail(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing && detail) {
        const r = await api.put(`/citizens/${detail.id}`, form);
        setDetail(r.data); setSelected(r.data); setEditing(false);
        setCitizens(prev => prev.map(c => c.id === r.data.id ? r.data : c));
      } else {
        const r = await api.post('/citizens', form);
        setShowForm(false); setForm({ ...blank });
        openDetail(r.data);
        setCitizens(prev => [r.data, ...prev]);
      }
    } finally { setSaving(false); }
  };

  const flags = (raw?: string): string[] => { try { return JSON.parse(raw ?? '[]'); } catch { return []; } };
  const charges = (raw: string): string => { try { return (JSON.parse(raw) as string[]).join(', '); } catch { return raw; } };

  const FormPanel = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" style={{ background: '#0d0a14', border: '1px solid rgba(168,85,247,0.18)' }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(168,85,247,0.10)', background: 'rgba(168,85,247,0.05)' }}>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={save} className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: 'first_name', l: 'First Name', req: true }, { k: 'last_name', l: 'Last Name', req: true },
              { k: 'dob', l: 'Date of Birth', type: 'date' }, { k: 'gender', l: 'Gender' },
              { k: 'ethnicity', l: 'Ethnicity' }, { k: 'occupation', l: 'Occupation' },
              { k: 'height', l: 'Height', p: 'e.g. 180cm' }, { k: 'weight', l: 'Weight', p: 'e.g. 80kg' },
              { k: 'eye_color', l: 'Eye Colour' }, { k: 'hair_color', l: 'Hair Colour' },
              { k: 'phone', l: 'Phone' }, { k: 'address', l: 'Address' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">{f.l}{f.req && <span className="text-rose-400 ml-0.5">*</span>}</label>
                <input required={f.req} type={f.type ?? 'text'}
                  value={(form as Record<string, string>)[f.k]}
                  onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  placeholder={f.p ?? ''} className="nx-input w-full" style={f.type === 'date' ? { colorScheme: 'dark' } : {}} />
              </div>
            ))}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Licence Status</label>
              <select value={form.license_status} onChange={e => setForm(p => ({ ...p, license_status: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                {['valid', 'suspended', 'revoked', 'expired', 'unlicensed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Licence Class</label>
              <select value={form.license_class} onChange={e => setForm(p => ({ ...p, license_class: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                {['A', 'B', 'C', 'R', 'RE', 'LR', 'MR', 'HR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="nx-input w-full resize-none text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Citizens Records</h1>
            <p className="text-slate-500 text-sm mt-0.5">AIRS civilian database — search by name</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ ...blank }); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 4px 14px rgba(168,85,247,0.20)' }}>
          <Plus className="w-4 h-4" /> New Record
        </button>
      </div>

      <div className="flex gap-5 min-h-[560px]">
        {/* Search panel */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name…" className="nx-input pl-10 w-full" autoFocus />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[540px]">
            {!search && !loading && citizens.length === 0 && (
              <div className="glass rounded-xl p-6 text-center">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                <p className="text-slate-600 text-sm">Type a name to search the civilian database</p>
              </div>
            )}
            {loading && <div className="glass rounded-xl p-4 text-center text-slate-600 text-sm">Searching…</div>}
            {!loading && search && citizens.length === 0 && (
              <div className="glass rounded-xl p-5 text-center">
                <p className="text-slate-600 text-sm">No records found for <span className="text-slate-400">"{search}"</span></p>
                <button onClick={() => { setShowForm(true); setForm({ ...blank }); }} className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline">Create new record?</button>
              </div>
            )}
            {citizens.map(c => {
              const lic = LIC_CFG[c.license_status] ?? LIC_CFG.valid;
              const sel = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => openDetail(c)}
                  className="w-full text-left rounded-xl p-4 transition-all"
                  style={{ background: sel ? 'rgba(168,85,247,0.08)' : 'rgba(15,23,42,0.6)', border: `1px solid ${sel ? 'rgba(168,85,247,0.30)' : 'rgba(168,85,247,0.06)'}` }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{c.first_name} {c.last_name}</span>
                    <span className={`chip text-[10px] flex-shrink-0 ${lic.cls}`}>{lic.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {c.dob && <span>{format(parseISO(c.dob), 'dd/MM/yyyy')}</span>}
                    {c.gender && <span> · {c.gender}</span>}
                    {c.occupation && <span> · {c.occupation}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-15" />
                <p className="text-sm">Search and select a civilian to view their record</p>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center text-slate-600 text-sm">Loading record…</div>
          ) : detail ? (
            <div className="glass rounded-2xl overflow-hidden flex flex-col max-h-[620px]">
              {/* Person header */}
              <div className="p-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                      {detail.first_name[0]}{detail.last_name[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{detail.first_name} {detail.last_name}</h2>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className={`chip text-xs ${LIC_CFG[detail.license_status]?.cls ?? 'chip-gray'}`}>
                          Licence {LIC_CFG[detail.license_status]?.label ?? detail.license_status}
                          {detail.license_class && ` (Class ${detail.license_class})`}
                        </span>
                        {flags(detail.flags).map(f => (
                          <span key={f} className="chip chip-red text-[10px]">{f}</span>
                        ))}
                        {(detail.bolos?.length ?? 0) > 0 && (
                          <span className="chip chip-red text-[10px] flex items-center gap-1"><AlertCircle className="w-3 h-3" />ACTIVE BOLO</span>
                        )}
                        {(detail.warrants?.filter(w => w.status === 'active').length ?? 0) > 0 && (
                          <span className="chip chip-red text-[10px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />ACTIVE WARRANT</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setEditing(true); setForm({ first_name: detail.first_name, last_name: detail.last_name, dob: detail.dob ?? '', gender: detail.gender ?? '', ethnicity: detail.ethnicity ?? '', height: detail.height ?? '', weight: detail.weight ?? '', eye_color: detail.eye_color ?? '', hair_color: detail.hair_color ?? '', address: detail.address ?? '', phone: detail.phone ?? '', occupation: detail.occupation ?? '', license_status: detail.license_status, license_class: detail.license_class ?? 'B', notes: detail.notes ?? '' }); setShowForm(true); }}
                    className="p-2 rounded-xl text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors flex-shrink-0">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Personal info grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Calendar, l: 'Date of Birth', v: detail.dob ? format(parseISO(detail.dob), 'dd MMM yyyy') : '—' },
                    { icon: User, l: 'Gender', v: detail.gender || '—' },
                    { icon: User, l: 'Ethnicity', v: detail.ethnicity || '—' },
                    { icon: User, l: 'Height / Weight', v: [detail.height, detail.weight].filter(Boolean).join(' / ') || '—' },
                    { icon: User, l: 'Eyes / Hair', v: [detail.eye_color, detail.hair_color].filter(Boolean).join(' / ') || '—' },
                    { icon: User, l: 'Occupation', v: detail.occupation || '—' },
                    { icon: Phone, l: 'Phone', v: detail.phone || '—' },
                    { icon: MapPin, l: 'Address', v: detail.address || '—' },
                  ].map(r => (
                    <div key={r.l} className="rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                      <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1 flex items-center gap-1">
                        <r.icon className="w-3 h-3" />{r.l}
                      </div>
                      <div className="text-sm text-slate-300 truncate">{r.v}</div>
                    </div>
                  ))}
                </div>

                {detail.notes && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">Officer Notes</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{detail.notes}</p>
                  </div>
                )}

                {/* Vehicles */}
                {(detail.vehicles?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />Registered Vehicles ({detail.vehicles!.length})</div>
                    <div className="space-y-1.5">
                      {detail.vehicles!.map(v => (
                        <div key={v.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                          <span className="font-mono text-purple-400 text-sm font-bold">{v.plate}</span>
                          <span className="text-sm text-slate-300">{[v.year, v.color, v.make, v.model].filter(Boolean).join(' ')}</span>
                          {v.stolen ? <span className="chip chip-red text-[10px] ml-auto">STOLEN</span> : null}
                          {v.impounded ? <span className="chip chip-yellow text-[10px] ml-auto">IMPOUNDED</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warrants */}
                {(detail.warrants?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-400" />Warrants ({detail.warrants!.length})</div>
                    <div className="space-y-1.5">
                      {detail.warrants!.map(w => (
                        <div key={w.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: w.status === 'active' ? 'rgba(239,68,68,0.06)' : 'rgba(15,23,42,0.6)', border: `1px solid ${w.status === 'active' ? 'rgba(239,68,68,0.20)' : 'rgba(168,85,247,0.06)'}` }}>
                          <span className={`chip text-[10px] flex-shrink-0 ${w.status === 'active' ? 'chip-red' : 'chip-gray'}`}>{w.type}</span>
                          <span className="text-sm text-slate-300 flex-1 truncate">{charges(w.charges)}</span>
                          <span className="text-xs text-slate-600">{format(parseISO(w.issued_date), 'dd/MM/yy')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Arrests */}
                {(detail.arrests?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Arrest History ({detail.arrests!.length})</div>
                    <div className="space-y-1.5">
                      {detail.arrests!.map(a => (
                        <div key={a.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                          <span className="font-mono text-slate-500 text-xs flex-shrink-0">{a.case_number}</span>
                          <span className="text-sm text-slate-300 flex-1 truncate">{charges(a.charges)}</span>
                          <span className="text-xs text-slate-600">{format(parseISO(a.created_at), 'dd/MM/yy')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active BOLOs */}
                {(detail.bolos?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-red-500 mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />Active BOLOs</div>
                    {detail.bolos!.map(b => (
                      <div key={b.id} className="rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                        <div className="flex items-center gap-2">
                          {b.armed ? <span className="chip chip-red text-[10px]">ARMED</span> : null}
                          {b.dangerous ? <span className="chip chip-red text-[10px]">DANGEROUS</span> : null}
                        </div>
                        <p className="text-sm text-slate-300 mt-1">{b.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!detail.vehicles?.length && !detail.warrants?.length && !detail.arrests?.length && !detail.bolos?.length && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Shield className="w-4 h-4" /> No vehicles, warrants or criminal history on record.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showForm && (
        <FormPanel
          title={editing ? `Edit — ${detail?.first_name} ${detail?.last_name}` : 'New Citizen Record'}
          onClose={() => { setShowForm(false); setEditing(false); }}
        />
      )}
    </div>
  );
}
