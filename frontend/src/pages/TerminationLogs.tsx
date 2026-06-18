import { useEffect, useState } from 'react';
import { Trash2, Search } from 'lucide-react';
import api from '../api/client';
import { format, parseISO } from 'date-fns';

interface Termination {
  id: string; officer_name?: string; officer_callsign?: string;
  department?: string; rank?: string; reason: string;
  requested_by_name?: string; reviewed_by_name?: string;
  status: string; review_notes?: string; created_at: string;
}

export default function TerminationLogs() {
  const [terms,   setTerms]   = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    api.get('/terminations').then(r => { setTerms(r.data.terminations); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = terms.filter(t => {
    const q = search.toLowerCase();
    return !q || (t.officer_name ?? '').toLowerCase().includes(q) || (t.department ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(100,116,139,0.12),rgba(168,85,247,0.06))', border: '1px solid rgba(100,116,139,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)' }}>
            <Trash2 className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Termination Logs</h1>
            <p className="text-slate-500 text-sm">Complete history of all termination requests</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search officer, department…" className="nx-input pl-9 w-full" />
      </div>

      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600 text-sm">No termination records found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`chip text-xs ${t.status === 'approved' ? 'chip-red' : t.status === 'denied' ? 'chip-green' : 'chip-yellow'}`}>{t.status}</span>
                    <span className="text-xs text-slate-600">{format(parseISO(t.created_at), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="font-bold text-white">{t.officer_name ?? '—'}</div>
                  <div className="text-xs text-slate-500">
                    {t.officer_callsign && <span className="font-mono text-purple-400 mr-2">{t.officer_callsign}</span>}
                    {t.rank} · {t.department}
                  </div>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{t.reason}</p>
                  {t.review_notes && <p className="text-xs text-slate-600 mt-1.5">Review: {t.review_notes}</p>}
                </div>
                <div className="text-right text-xs text-slate-600 flex-shrink-0">
                  <div>By: {t.requested_by_name}</div>
                  {t.reviewed_by_name && <div>Reviewed: {t.reviewed_by_name}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
