import { useEffect, useState } from 'react';
import { FileText, Plus, Search, X, Save, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Report {
  id: string; report_number: string; title: string; type: string;
  officer_name?: string; officer_callsign?: string; content?: string;
  status: string; created_at: string; updated_at: string;
}

const LEADERSHIP = ['commissioner', 'commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const TYPES = ['General', 'Incident', 'Arrest', 'Use of Force', 'Traffic', 'Property', 'Pursuit', 'Welfare Check', 'Other'];

const STATUS_CFG = {
  submitted:  { cls: 'chip-blue',   label: 'Submitted' },
  approved:   { cls: 'chip-green',  label: 'Approved' },
  rejected:   { cls: 'chip-red',    label: 'Rejected' },
  draft:      { cls: 'chip-gray',   label: 'Draft' },
};

export default function Reports() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [reports,  setReports]  = useState<Report[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [typeF,    setTypeF]    = useState('');
  const [statusF,  setStatusF]  = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [form, setForm] = useState({ title: '', type: 'General', content: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('q', search);
      if (typeF) p.set('type', typeF);
      if (statusF) p.set('status', statusF);
      const r = await api.get(`/reports?${p}`);
      setReports(r.data.reports);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, typeF, statusF]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing && selected) {
        const r = await api.put(`/reports/${selected.id}`, form);
        setReports(prev => prev.map(x => x.id === r.data.id ? r.data : x));
        setSelected(r.data); setEditing(false);
      } else {
        const r = await api.post('/reports', form);
        setReports(prev => [r.data, ...prev]);
        setSelected(r.data);
      }
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    const r = await api.put(`/reports/${id}`, { status });
    setReports(prev => prev.map(x => x.id === id ? r.data : x));
    if (selected?.id === id) setSelected(r.data);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(6,182,212,0.06))', border: '1px solid rgba(6,182,212,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Reports</h1>
              <p className="text-slate-500 text-sm">{reports.length} report{reports.length !== 1 ? 's' : ''} {isLeader ? '(all officers)' : '(yours)'}</p>
            </div>
          </div>
          <button onClick={() => { setEditing(false); setForm({ title: '', type: 'General', content: '' }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#0e7490,#0284c7)', border: '1px solid rgba(6,182,212,0.3)' }}>
            <Plus className="w-4 h-4" /> New Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={typeF} onChange={e => setTypeF(e.target.value)} className="nx-input text-sm py-1.5 px-3" style={{ colorScheme: 'dark', maxWidth: 160 }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="nx-input text-sm py-1.5 px-3" style={{ colorScheme: 'dark', maxWidth: 140 }}>
          <option value="">All Status</option>
          {Object.keys(STATUS_CFG).map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" className="nx-input pl-9 text-sm" style={{ minWidth: 200 }} />
        </div>
      </div>

      <div className="flex gap-4 min-h-[480px]">
        {/* List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto max-h-[540px] space-y-2">
          {loading ? <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
          : reports.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-600 text-sm">No reports found.</p>
            </div>
          ) : reports.map(r => {
            const sc = STATUS_CFG[r.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.submitted;
            const sel = selected?.id === r.id;
            return (
              <button key={r.id} onClick={() => setSelected(r)}
                className="w-full text-left rounded-xl p-3.5 transition-all"
                style={{ background: sel ? 'rgba(6,182,212,0.08)' : 'rgba(15,23,42,0.6)', border: `1px solid ${sel ? 'rgba(6,182,212,0.28)' : 'rgba(6,182,212,0.06)'}` }}>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono text-[10px] text-slate-600">{r.report_number}</span>
                  <span className={`chip text-[10px] ${sc.cls}`}>{sc.label}</span>
                </div>
                <div className="font-semibold text-white text-sm leading-tight mb-1">{r.title}</div>
                <div className="text-[10px] text-slate-600">{r.type} · {r.officer_callsign ?? r.officer_name} · {format(parseISO(r.created_at), 'dd MMM yyyy')}</div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-15" />
                <p className="text-sm">Select a report to view</p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden flex flex-col max-h-[540px]">
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500">{selected.report_number}</span>
                      <span className={`chip text-[10px] ${STATUS_CFG[selected.status as keyof typeof STATUS_CFG]?.cls ?? 'chip-gray'}`}>{selected.status}</span>
                      <span className="chip chip-blue text-[10px]">{selected.type}</span>
                    </div>
                    <h2 className="text-base font-bold text-white">{selected.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      By {selected.officer_callsign ? `${selected.officer_callsign} — ` : ''}{selected.officer_name} · {format(parseISO(selected.created_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditing(true); setForm({ title: selected.title, type: selected.type, content: selected.content ?? '' }); setShowForm(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold chip-blue">Edit</button>
                    {isLeader && selected.status === 'submitted' && (
                      <>
                        <button onClick={() => updateStatus(selected.id, 'approved')} className="px-3 py-1.5 rounded-lg text-xs font-bold chip-green">Approve</button>
                        <button onClick={() => updateStatus(selected.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-bold chip-red">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {selected.content
                  ? <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
                  : <p className="text-slate-600 text-sm italic">No content.</p>}
                <div className="text-xs text-slate-700 mt-4">
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
          <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: '#0d1526', border: '1px solid rgba(6,182,212,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(6,182,212,0.10)', background: 'rgba(6,182,212,0.05)' }}>
              <h2 className="text-base font-bold text-white">{editing ? 'Edit Report' : 'New Report'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Title <span className="text-rose-400">*</span></label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="nx-input w-full" placeholder="e.g. Traffic Incident — High Street" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Report Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Report Content</label>
                <textarea rows={8} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write your full report here — include date/time, location, all persons involved, sequence of events, actions taken, and outcome…"
                  className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#0e7490,#0284c7)' }}>
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
