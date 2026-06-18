import { useEffect, useState } from 'react';
import { Award, CheckCircle, Clock, X, Lock, FileText, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface CertApp {
  id: string; cert_name: string; cert_category: string;
  officer_name?: string; officer_callsign?: string;
  why_interested: string; skills: string; goals: string;
  status: 'pending' | 'approved' | 'denied';
  review_notes?: string; reviewed_at?: string; created_at: string;
}

const CERTS = [
  { name: 'Field Training Officer (FTO)',        category: 'Training',      requirements: ['Senior Constable rank or above', 'Minimum 3 months service', 'No active strikes'] },
  { name: 'Critical Incident Response (CIRT)',   category: 'Tactical',      requirements: ['FTO Certified', 'Minimum 6 months service', 'Supervisor recommendation'] },
  { name: 'K9 Handler',                          category: 'Specialist',    requirements: ['Minimum 6 months service', 'No active strikes', 'K9 course completion'] },
  { name: 'Firearms Instructor',                 category: 'Training',      requirements: ['FTO Certified', 'Minimum 1 year service', 'Marksmanship qualification'] },
  { name: 'Traffic Investigator',                category: 'Specialist',    requirements: ['Minimum 4 months service', 'Traffic enforcement training'] },
  { name: 'Detective',                           category: 'Investigative', requirements: ['Minimum 9 months service', 'Supervisor recommendation', 'Detective exam pass'] },
  { name: 'SOG Operator',                        category: 'Tactical',      requirements: ['CIRT Certified', 'Minimum 12 months service', 'Commander approval'] },
  { name: 'Highway Patrol',                      category: 'Specialist',    requirements: ['Minimum 3 months service', 'Advanced driver training'] },
];

const CAT_COLORS: Record<string, string> = {
  Training:      'chip-blue',
  Tactical:      'chip-red',
  Specialist:    'chip-purple',
  Investigative: 'chip-indigo',
};
const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

const BLANK_EOI = { why_interested: '', skills: '', goals: '' };

export default function Certifications() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [apps, setApps] = useState<CertApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [view, setView] = useState<'mine' | 'all'>('mine');
  const [applyingCert, setApplyingCert] = useState<string | null>(null);
  const [eoi, setEoi] = useState({ ...BLANK_EOI });
  const [submitting, setSubmitting] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CertApp | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/certifications'); setApps(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getMyStatus = (certName: string) => {
    const mine = apps.filter(a => a.cert_name === certName);
    if (!mine.length) return 'not_applied';
    if (mine.some(a => a.status === 'approved')) return 'approved';
    if (mine.some(a => a.status === 'pending')) return 'pending';
    return 'denied';
  };

  const submitEOI = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const cert = CERTS.find(c => c.name === applyingCert);
      await api.post('/certifications', {
        cert_name: applyingCert, cert_category: cert?.category, ...eoi,
      });
      await load();
      setApplyingCert(null); setEoi({ ...BLANK_EOI });
    } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, status: 'approved' | 'denied') => {
    await api.put(`/certifications/${id}`, { status, review_notes: reviewNotes });
    await load();
    setReviewTarget(null); setReviewNotes('');
  };

  const cats = [...new Set(CERTS.map(c => c.category))];
  const displayedApps = apps.filter(a => view === 'mine' ? a.officer_name === `${auth.user?.first_name} ${auth.user?.last_name}` : true);
  const pendingCount = apps.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(234,179,8,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(234,179,8,0.20)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)' }}>
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Certifications</h1>
              <p className="text-slate-500 text-sm">
                {apps.filter(a => a.status === 'approved' && a.officer_name === `${auth.user?.first_name} ${auth.user?.last_name}`).length} certified
                {pendingCount > 0 && isLeader && ` · ${pendingCount} pending review`}
              </p>
            </div>
          </div>
          {isLeader && (
            <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.08)' }}>
              {(['mine', 'all'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  {v === 'mine' ? 'My Applications' : `All Applications${pendingCount ? ` (${pendingCount})` : ''}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!catFilter ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'chip-gray'}`}>All</button>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${catFilter === c ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'chip-gray'}`}>{c}</button>
        ))}
      </div>

      {/* Leadership: all applications view */}
      {isLeader && view === 'all' ? (
        <div className="space-y-3">
          {loading ? <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
          : displayedApps.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-slate-600 text-sm">No applications yet.</div>
          ) : displayedApps.map(app => (
            <div key={app.id} className="glass rounded-xl p-4 hover:border-amber-500/20 transition-all">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`chip text-xs ${CAT_COLORS[app.cert_category] ?? 'chip-gray'}`}>{app.cert_category}</span>
                    <span className={`chip text-xs ${app.status === 'approved' ? 'chip-green' : app.status === 'denied' ? 'chip-red' : 'chip-yellow'}`}>{app.status}</span>
                  </div>
                  <div className="font-semibold text-white">{app.cert_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {app.officer_callsign ? `${app.officer_callsign} — ` : ''}{app.officer_name} · {format(parseISO(app.created_at), 'dd MMM yyyy')}
                  </div>
                </div>
                {app.status === 'pending' && (
                  <button onClick={() => { setReviewTarget(app); setReviewNotes(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold chip-yellow">
                    Review <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {app.status !== 'pending' && (
                  <span className="text-xs text-slate-600">{app.reviewed_at ? `Reviewed ${format(parseISO(app.reviewed_at), 'dd MMM')}` : ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Certification catalogue */
        <div className="grid sm:grid-cols-2 gap-4">
          {CERTS.filter(c => !catFilter || c.category === catFilter).map(cert => {
            const myStatus = getMyStatus(cert.name);
            return (
              <div key={cert.name} className="glass rounded-xl p-5 transition-all hover:border-amber-500/15"
                style={{ borderColor: myStatus === 'approved' ? 'rgba(34,197,94,0.20)' : myStatus === 'pending' ? 'rgba(234,179,8,0.20)' : undefined }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`chip text-[10px] ${CAT_COLORS[cert.category] ?? 'chip-gray'}`}>{cert.category}</span>
                      {myStatus === 'approved' && <span className="chip chip-green text-[10px] flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Certified</span>}
                      {myStatus === 'pending' && <span className="chip chip-yellow text-[10px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Pending</span>}
                      {myStatus === 'denied' && <span className="chip chip-red text-[10px]">Denied</span>}
                    </div>
                    <h3 className="font-semibold text-white text-sm">{cert.name}</h3>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  {cert.requirements.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-1 h-1 rounded-full bg-slate-700 flex-shrink-0" />{r}
                    </div>
                  ))}
                </div>
                {myStatus === 'not_applied' && (
                  <button onClick={() => { setApplyingCert(cert.name); setEoi({ ...BLANK_EOI }); }}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
                    Apply for Certification
                  </button>
                )}
                {myStatus === 'denied' && (
                  <button onClick={() => { setApplyingCert(cert.name); setEoi({ ...BLANK_EOI }); }}
                    className="w-full py-2 rounded-xl text-sm font-medium text-slate-300 border border-slate-700/50 hover:border-amber-500/30 transition-all">
                    Re-apply
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* EOI Modal */}
      {applyingCert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(234,179,8,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(234,179,8,0.12)', background: 'rgba(234,179,8,0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">Certification EOI</div>
                  <div className="text-xs text-amber-400/70 mt-0.5">{applyingCert}</div>
                </div>
              </div>
              <button onClick={() => setApplyingCert(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitEOI} className="p-6 space-y-5 overflow-y-auto">
              {[
                { k: 'why_interested', l: 'Why are you interested in gaining this certification?', p: 'Explain your motivation and why this cert matters to you…' },
                { k: 'skills',        l: 'What skills can you bring to this certification?',        p: 'Describe relevant experience, training, or qualities…' },
                { k: 'goals',         l: 'What do you think you can achieve with this certification?', p: 'How will you use this cert to benefit the department…' },
              ].map(q => (
                <div key={q.k}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{q.l} <span className="text-rose-400">*</span></label>
                  <textarea required rows={3} value={(eoi as Record<string, string>)[q.k]}
                    onChange={e => setEoi(p => ({ ...p, [q.k]: e.target.value }))}
                    placeholder={q.p} className="nx-input w-full resize-none text-sm" />
                </div>
              ))}
              <div className="flex gap-3">
                <button type="button" onClick={() => setApplyingCert(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
                  <Award className="w-4 h-4" />{submitting ? 'Submitting…' : 'Submit EOI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(234,179,8,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(234,179,8,0.12)', background: 'rgba(234,179,8,0.05)' }}>
              <div>
                <div className="text-base font-bold text-white">Review Application</div>
                <div className="text-xs text-amber-400/70 mt-0.5">{reviewTarget.officer_callsign ? `${reviewTarget.officer_callsign} — ` : ''}{reviewTarget.officer_name} · {reviewTarget.cert_name}</div>
              </div>
              <button onClick={() => setReviewTarget(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {[
                { l: 'Why Interested', v: reviewTarget.why_interested },
                { l: 'Skills', v: reviewTarget.skills },
                { l: 'Goals', v: reviewTarget.goals },
              ].map(q => (
                <div key={q.l} className="rounded-xl p-3.5" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(6,182,212,0.06)' }}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">{q.l}</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{q.v || '—'}</p>
                </div>
              ))}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Review Notes (optional)</label>
                <textarea rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Feedback for the officer…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setReviewTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button onClick={() => updateStatus(reviewTarget.id, 'denied')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm chip-red">Deny</button>
                <button onClick={() => updateStatus(reviewTarget.id, 'approved')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)' }}>Approve</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
