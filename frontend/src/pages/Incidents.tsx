import { useEffect, useState } from 'react';
import { FileText, Plus, Search, X, ChevronRight, Save, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Incident {
  id: string; case_number: string; title: string; description?: string;
  location?: string; type?: string; status: string;
  primary_officer?: string; officer_name?: string; officer_callsign?: string;
  involved_citizens?: string; involved_vehicles?: string; charges?: string;
  narrative?: string; created_at: string; updated_at: string;
}

const STATUS_CFG = {
  open:       { cls: 'chip-green',  label: 'Open' },
  active:     { cls: 'chip-blue',   label: 'Active' },
  closed:     { cls: 'chip-gray',   label: 'Closed' },
  suspended:  { cls: 'chip-yellow', label: 'Suspended' },
};
const TYPE_COLORS: Record<string, string> = {
  'Traffic':  '#0ea5e9', 'Assault': '#ef4444', 'Robbery': '#f97316',
  'Drug': '#a855f7', 'Domestic': '#ec4899', 'Other': '#64748b',
};
const TYPES = ['Traffic', 'Assault', 'Robbery', 'Drug', 'Domestic', 'Firearms', 'Theft', 'Fraud', 'Missing Person', 'Other'];

const blank = {
  title: '', description: '', location: '', type: 'Other',
  narrative: '', charges: '',
};

export default function Incidents() {
  const { auth } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [statusF,  setStatusF]    = useState('');
  const [selected, setSelected]   = useState<Incident | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editing,  setEditing]    = useState(false);
  const [form,     setForm]       = useState({ ...blank });
  const [saving,   setSaving]     = useState(false);
  const [page,     setPage]       = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '30' });
      if (search) params.set('q', search);
      if (statusF) params.set('status', statusF);
      const r = await api.get(`/incidents?${params}`);
      setIncidents(r.data.incidents);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [search, statusF]);

  const openCreate = () => { setEditing(false); setForm({ ...blank }); setShowForm(true); };
  const openEdit   = (i: Incident) => {
    setEditing(true);
    setForm({ title: i.title, description: i.description ?? '', location: i.location ?? '', type: i.type ?? 'Other', narrative: i.narrative ?? '', charges: parseArr(i.charges).join(', ') });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const chargesArr = form.charges.split(',').map(s => s.trim()).filter(Boolean);
      if (editing && selected) {
        const r = await api.put(`/incidents/${selected.id}`, { ...form, charges: chargesArr, status: selected.status });
        setIncidents(prev => prev.map(i => i.id === r.data.id ? r.data : i));
        setSelected(r.data);
      } else {
        const r = await api.post('/incidents', { ...form, charges: chargesArr });
        setIncidents(prev => [r.data, ...prev]);
        setSelected(r.data);
      }
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    const current = incidents.find(i => i.id === id);
    if (!current) return;
    const r = await api.put(`/incidents/${id}`, { ...current, charges: parseArr(current.charges), status });
    setIncidents(prev => prev.map(i => i.id === id ? r.data : i));
    if (selected?.id === id) setSelected(r.data);
  };

  const parseArr = (raw?: string): string[] => { try { return JSON.parse(raw ?? '[]'); } catch { return []; } };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.20)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Incident Reports</h1>
              <p className="text-slate-500 text-sm">{incidents.length} case{incidents.length !== 1 ? 's' : ''} loaded</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <Plus className="w-4 h-4" /> New Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[{ v: '', l: 'All' }, { v: 'open', l: 'Open' }, { v: 'active', l: 'Active' }, { v: 'closed', l: 'Closed' }, { v: 'suspended', l: 'Suspended' }].map(f => (
          <button key={f.v} onClick={() => setStatusF(f.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${statusF === f.v ? 'chip-blue' : 'chip-gray hover:text-slate-300'}`}>{f.l}</button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search case, title, location…" className="nx-input pl-9 text-sm py-2" style={{ minWidth: 220 }} />
        </div>
      </div>

      <div className="flex gap-4" style={{ minHeight: 520 }}>
        {/* List */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-2 overflow-y-auto max-h-[580px]">
          {loading ? <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
          : incidents.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-600 text-sm">No incidents found.</p>
            </div>
          ) : incidents.map(i => {
            const sc = STATUS_CFG[i.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.open;
            const tc = TYPE_COLORS[i.type ?? 'Other'] ?? '#64748b';
            const sel = selected?.id === i.id;
            return (
              <button key={i.id} onClick={() => setSelected(i)}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{ background: sel ? 'rgba(168,85,247,0.08)' : 'rgba(15,23,42,0.6)', border: `1px solid ${sel ? 'rgba(168,85,247,0.28)' : 'rgba(14,165,233,0.06)'}` }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500">{i.case_number}</span>
                  <span className={`chip text-[10px] ${sc.cls}`}>{sc.label}</span>
                </div>
                <div className="font-semibold text-white text-sm leading-tight mb-1">{i.title}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  {i.type && <span className="font-medium" style={{ color: tc }}>{i.type}</span>}
                  {i.location && <><span>·</span><span>{i.location}</span></>}
                </div>
                <div className="text-[10px] text-slate-700 mt-1">{format(parseISO(i.created_at), 'dd MMM yyyy, HH:mm')}</div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-15" />
                <p className="text-sm">Select an incident to view details</p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden flex flex-col max-h-[580px]">
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500">{selected.case_number}</span>
                      <span className={`chip text-[10px] ${STATUS_CFG[selected.status as keyof typeof STATUS_CFG]?.cls ?? 'chip-gray'}`}>{selected.status}</span>
                      {selected.type && <span className="chip chip-blue text-[10px]">{selected.type}</span>}
                    </div>
                    <h2 className="text-base font-bold text-white">{selected.title}</h2>
                    {selected.location && <p className="text-xs text-slate-500 mt-0.5">📍 {selected.location}</p>}
                    {selected.officer_name && <p className="text-xs text-slate-600 mt-0.5">Officer: <span className="text-slate-400">{selected.officer_name}{selected.officer_callsign ? ` (${selected.officer_callsign})` : ''}</span></p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(selected)} className="px-3 py-1.5 rounded-lg text-xs font-bold chip-blue">Edit</button>
                    {selected.status !== 'closed' && (
                      <button onClick={() => updateStatus(selected.id, 'closed')} className="px-3 py-1.5 rounded-lg text-xs font-bold chip-gray">Close</button>
                    )}
                    {selected.status === 'closed' && (
                      <button onClick={() => updateStatus(selected.id, 'open')} className="px-3 py-1.5 rounded-lg text-xs font-bold chip-green">Reopen</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selected.description && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-1.5">Description</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
                  </div>
                )}
                {selected.narrative && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-1.5">Officer Narrative</div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.narrative}</p>
                  </div>
                )}
                {parseArr(selected.charges).length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-1.5">Charges</div>
                    <div className="flex flex-wrap gap-1.5">
                      {parseArr(selected.charges).map(c => <span key={c} className="chip chip-red text-xs">{c}</span>)}
                    </div>
                  </div>
                )}
                <div className="text-xs text-slate-700 pt-2">
                  Created {format(parseISO(selected.created_at), 'dd MMM yyyy HH:mm')} · Updated {format(parseISO(selected.updated_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(168,85,247,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(168,85,247,0.12)', background: 'rgba(168,85,247,0.05)' }}>
              <h2 className="text-base font-bold text-white">{editing ? 'Edit Incident' : 'New Incident Report'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Title <span className="text-rose-400">*</span></label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Armed Robbery — High Street" className="nx-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Incident Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Location</label>
                  <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Address or area" className="nx-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief incident summary…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Charges (comma separated)</label>
                <input value={form.charges} onChange={e => setForm(p => ({ ...p, charges: e.target.value }))} placeholder="e.g. Assault, Resisting Arrest, Drug Possession" className="nx-input w-full" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Officer Narrative</label>
                <textarea rows={4} value={form.narrative} onChange={e => setForm(p => ({ ...p, narrative: e.target.value }))} placeholder="Detailed account of what occurred — include sequence of events, actions taken, outcomes…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
                  <Save className="w-4 h-4" />{saving ? 'Saving…' : editing ? 'Save Changes' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
