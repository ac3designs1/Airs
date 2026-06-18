import { useEffect, useState } from 'react';
import { Award, CheckCircle, Clock, X, Lock, FileText, ChevronRight, ShieldAlert } from 'lucide-react';
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

// Rank order — lowest to highest
const RANK_ORDER = [
  'Recruit', 'Probationary Constable', 'Constable', 'First Constable',
  'Senior Constable', 'Leading Senior Constable', 'Sergeant', 'Senior Sergeant',
  'Inspector', 'Superintendent', 'Commander', 'Assistant Commissioner',
  'Deputy Commissioner', 'Commissioner',
];

function rankGte(userRank: string, minRank: string): boolean {
  const u = RANK_ORDER.indexOf(userRank);
  const m = RANK_ORDER.indexOf(minRank);
  if (u === -1 || m === -1) return false;
  return u >= m;
}

interface Cert {
  name: string;
  category: string;
  desc: string;
  minRank: string;
  divReq?: string;   // required department
  disabled?: boolean;
}

// ── Certification list (following department guide) ────────────────
const CERTS: Cert[] = [
  // Constable+
  { name: 'Field Training Officer (FTO)',  category: 'Training',      desc: 'Training new officers in the field.',                                         minRank: 'Constable' },
  { name: 'Dog Squad',                     category: 'Specialist',    desc: 'K9 Unit operations and handler certification.',                               minRank: 'Constable' },
  { name: 'Advanced Negotiator',           category: 'Specialist',    desc: 'Advanced negotiation and crisis intervention certification.',                 minRank: 'Constable' },
  { name: 'Melbourne Parks & Wildlife',    category: 'Specialist',    desc: 'Parks and wildlife operations certification.',                                minRank: 'Constable' },
  { name: 'Port OPS',                      category: 'Tactical',      desc: 'Port Tactical Division operations certification.',                            minRank: 'Constable' },
  { name: 'Airwing Certification',         category: 'Specialist',    desc: 'Aviation operations and support certification.',                              minRank: 'Constable', divReq: 'Airwing' },
  { name: 'Marine Certification',          category: 'Specialist',    desc: 'Marine patrol and water operations certification.',                           minRank: 'Constable', divReq: 'Marine' },
  { name: 'Sheriff\'s Office',             category: 'Specialist',    desc: 'Court security and civil enforcement certification.',                         minRank: 'Constable', divReq: 'Sheriff' },
  { name: 'Legal Services',               category: 'Investigative', desc: 'Legal support and advisory services certification.',                          minRank: 'Constable', divReq: 'Legal' },
  { name: 'Operations Response Unit',      category: 'Tactical',      desc: 'Highway Tactical Operations certification.',                                  minRank: 'Constable', divReq: 'ORU' },
  { name: 'Armed Crime Unit',              category: 'Investigative', desc: 'Armed Crime Unit (ACU) certification.',                                       minRank: 'Constable', divReq: 'Crime Command' },
  { name: 'Organised Crime Unit',          category: 'Investigative', desc: 'Organised Crime Unit (OCU) certification.',                                   minRank: 'Constable', divReq: 'Crime Command' },
  // First Constable+
  { name: 'Motorcycle Certification',      category: 'Highway',       desc: 'Motorcycle operation and patrol certification.',                              minRank: 'First Constable', divReq: 'Highway' },
  { name: 'Interceptor Patrol Group',      category: 'Highway',       desc: 'High-speed pursuit and interception certification.',                          minRank: 'First Constable', divReq: 'Highway' },
  { name: 'RBT Supervisor',                category: 'Highway',       desc: 'Random Breath Testing supervisor certification.',                              minRank: 'First Constable', divReq: 'Highway' },
  { name: 'Mobile Speed Camera',           category: 'Highway',       desc: 'Mobile speed camera deployment and operation certification.',                 minRank: 'First Constable', divReq: 'Highway' },
  { name: 'HWP Trainer',                   category: 'Highway',       desc: 'Highway Patrol Trainer certification.',                                       minRank: 'First Constable', divReq: 'Highway', disabled: true },
  { name: 'OPS 32',                        category: 'Tactical',      desc: 'Specialized Airwing Operations certification.',                               minRank: 'First Constable', divReq: 'SOG' },
  { name: 'Armoured Response Certification', category: 'Tactical',   desc: 'Specialized armoured vehicle operations and tactical response certification.', minRank: 'First Constable', divReq: 'CIRT' },
  { name: 'CIRT FTO',                      category: 'Tactical',      desc: 'CIRT Field Training Officer certification for training new CIRT members.',    minRank: 'First Constable', divReq: 'CIRT' },
  // Senior Constable+
  { name: 'Advanced Weapons Certification', category: 'Tactical',     desc: 'Advanced weapons handling and tactical operations certification.',            minRank: 'Senior Constable', divReq: 'CIRT' },
];

// ── Division EOIs ─────────────────────────────────────────────────
interface DivEOI { name: string; category: string; requirements: string[]; }
const DIVISION_EOIS: DivEOI[] = [
  { name: 'CIRT',           category: 'Tactical',  requirements: ['FTO Certified', 'Minimum 6 months service', 'Supervisor recommendation', 'No active strikes'] },
  { name: 'Highway Patrol', category: 'Highway',   requirements: ['Minimum 3 months service', 'Advanced driver training', 'Clean service record'] },
];

const CAT_COLORS: Record<string, string> = {
  Training:      'chip-blue',
  Tactical:      'chip-red',
  Specialist:    'chip-purple',
  Investigative: 'chip-indigo',
  Highway:       'chip-gold',
};
const LEADERSHIP = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const BLANK_EOI = { why_interested: '', skills: '', goals: '' };
const BLANK_DIV = { div_bring: '', div_time: '', div_goals: '' };

export default function Certifications() {
  const { auth } = useAuth();
  const user = auth.user!;
  const isLeader = LEADERSHIP.includes(user.role);
  const [apps, setApps]       = useState<CertApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [view, setView]       = useState<'mine' | 'all'>('mine');
  const [applyingCert, setApplyingCert] = useState<Cert | null>(null);
  const [applyingDiv,  setApplyingDiv]  = useState<DivEOI | null>(null);
  const [eoi, setEoi]         = useState({ ...BLANK_EOI });
  const [divEoi, setDivEoi]   = useState({ ...BLANK_DIV });
  const [submitting, setSubmitting] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CertApp | null>(null);
  const [reviewNotes, setReviewNotes]   = useState('');

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
    if (mine.some(a => a.status === 'pending'))  return 'pending';
    return 'denied';
  };
  const getDivStatus = (divName: string) => getMyStatus(`Division Transfer — ${divName}`);

  const submitEOI = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/certifications', { cert_name: applyingCert?.name, cert_category: applyingCert?.category, ...eoi });
      await load(); setApplyingCert(null); setEoi({ ...BLANK_EOI });
    } finally { setSubmitting(false); }
  };

  const submitDivEOI = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/certifications', {
        cert_name: `Division Transfer — ${applyingDiv?.name}`,
        cert_category: applyingDiv?.category ?? 'Division',
        why_interested: divEoi.div_bring, skills: divEoi.div_time, goals: divEoi.div_goals,
      });
      await load(); setApplyingDiv(null); setDivEoi({ ...BLANK_DIV });
    } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, status: 'approved' | 'denied') => {
    await api.put(`/certifications/${id}`, { status, review_notes: reviewNotes });
    await load(); setReviewTarget(null); setReviewNotes('');
  };

  const myName      = `${user.first_name} ${user.last_name}`;
  const pendingCount = apps.filter(a => a.status === 'pending').length;
  const displayedApps = apps.filter(a => view === 'mine' ? a.officer_name === myName : true);
  const cats = [...new Set(CERTS.map(c => c.category))];

  // Cert status for a given cert including rank/div checks
  type CertState = 'approved' | 'pending' | 'denied' | 'rank_locked' | 'div_locked' | 'disabled' | 'not_applied';
  const getCertState = (cert: Cert): CertState => {
    if (cert.disabled) return 'disabled';
    if (!rankGte(user.rank, cert.minRank)) return 'rank_locked';
    if (cert.divReq && user.department !== cert.divReq) return 'div_locked';
    return getMyStatus(cert.name) as CertState;
  };

  const filteredCerts = CERTS.filter(c => !catFilter || c.category === catFilter);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="glass rounded-xl p-5 flex items-center justify-between flex-wrap gap-3"
        style={{ borderColor: 'rgba(234,179,8,0.20)', background: 'linear-gradient(135deg,rgba(234,179,8,0.07),rgba(249,115,22,0.03))' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.22)' }}>
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Certifications &amp; Division EOIs</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {apps.filter(a => a.status === 'approved' && a.officer_name === myName).length} certified
              {pendingCount > 0 && isLeader && ` · ${pendingCount} pending review`}
              <span className="ml-3 text-slate-600">Rank: <span className="text-slate-400 font-semibold">{user.rank}</span></span>
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
        <div className="space-y-7">

          {/* ── Certifications ─────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Certifications</span>
              <span className="text-xs text-slate-600">Rank-gated skill qualifications</span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredCerts.map(cert => {
                const state = getCertState(cert);
                const locked  = state === 'rank_locked' || state === 'div_locked' || state === 'disabled';
                return (
                  <div key={cert.name}
                    className={`glass rounded-xl p-4 transition-all ${locked ? 'opacity-55' : 'hover:border-amber-500/15'}`}
                    style={{
                      borderColor: state === 'approved' ? 'rgba(34,197,94,0.22)' : state === 'pending' ? 'rgba(234,179,8,0.22)' : undefined,
                    }}>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className={`chip text-[10px] ${CAT_COLORS[cert.category] ?? 'chip-gray'}`}>{cert.category}</span>
                      <span className="chip chip-gray text-[10px]">{cert.minRank}+</span>
                      {cert.divReq && <span className="chip chip-cyan text-[10px]">{cert.divReq}</span>}
                      {state === 'approved' && <span className="chip chip-green text-[10px] flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Certified</span>}
                      {state === 'pending'  && <span className="chip chip-yellow text-[10px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Pending</span>}
                      {state === 'denied'   && <span className="chip chip-red text-[10px]">Denied</span>}
                    </div>

                    <h3 className="font-bold text-white text-sm mb-1">{cert.name}</h3>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{cert.desc}</p>

                    {/* Action */}
                    {state === 'disabled' && (
                      <div className="w-full py-2 rounded-lg text-xs font-semibold text-slate-600 text-center"
                        style={{ background: 'rgba(71,85,105,0.10)', border: '1px solid rgba(71,85,105,0.15)' }}>
                        Applications Disabled
                      </div>
                    )}
                    {state === 'rank_locked' && (
                      <div className="w-full py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
                        <ShieldAlert className="w-3.5 h-3.5" /> Rank Requirement Not Met
                      </div>
                    )}
                    {state === 'div_locked' && (
                      <div className="w-full py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.15)', color: '#67e8f9' }}>
                        <Lock className="w-3.5 h-3.5" /> {cert.divReq} Division Required
                      </div>
                    )}
                    {state === 'not_applied' && (
                      <button onClick={() => { setApplyingCert(cert); setEoi({ ...BLANK_EOI }); }}
                        className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
                        Apply Now
                      </button>
                    )}
                    {state === 'denied' && (
                      <button onClick={() => { setApplyingCert(cert); setEoi({ ...BLANK_EOI }); }}
                        className="w-full py-2 rounded-lg text-sm font-medium text-slate-400 border border-slate-700/50 hover:border-amber-500/30 transition-all">
                        Re-apply
                      </button>
                    )}
                    {state === 'approved' && (
                      <div className="w-full py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', color: '#4ade80' }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Applied ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Division EOIs ───────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
                <ChevronRight className="w-3 h-3 text-cyan-400" />
              </div>
              <span className="text-sm font-bold text-white">Division EOIs</span>
              <span className="text-xs text-slate-600">Expression of Interest to transfer divisions</span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {DIVISION_EOIS.map(div => {
                const myStatus = getDivStatus(div.name);
                return (
                  <div key={div.name} className="glass rounded-xl p-4 transition-all hover:border-cyan-500/15"
                    style={{ borderColor: myStatus === 'approved' ? 'rgba(34,197,94,0.22)' : myStatus === 'pending' ? 'rgba(6,182,212,0.22)' : undefined }}>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className={`chip text-[10px] ${CAT_COLORS[div.category] ?? 'chip-cyan'}`}>{div.category}</span>
                      <span className="chip chip-cyan text-[10px]">Division EOI</span>
                      {myStatus === 'approved' && <span className="chip chip-green text-[10px] flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Accepted</span>}
                      {myStatus === 'pending'  && <span className="chip chip-yellow text-[10px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Pending</span>}
                      {myStatus === 'denied'   && <span className="chip chip-red text-[10px]">Unsuccessful</span>}
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">{div.name}</h3>
                    <div className="space-y-1 mb-3">
                      {div.requirements.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-1 h-1 rounded-full bg-slate-700 flex-shrink-0" />{r}
                        </div>
                      ))}
                    </div>
                    {myStatus === 'not_applied' && (
                      <button onClick={() => { setApplyingDiv(div); setDivEoi({ ...BLANK_DIV }); }}
                        className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg,#0891b2,#0284c7)' }}>
                        Submit Division EOI
                      </button>
                    )}
                    {myStatus === 'denied' && (
                      <button onClick={() => { setApplyingDiv(div); setDivEoi({ ...BLANK_DIV }); }}
                        className="w-full py-2 rounded-lg text-sm font-medium text-slate-400 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
                        Re-apply
                      </button>
                    )}
                  </div>
                );
              })}

              {/* SOG — invite only */}
              <div className="glass rounded-xl p-4 opacity-50">
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className="chip chip-red text-[10px]">Tactical</span>
                  <span className="chip chip-gray text-[10px]">Invite Only</span>
                </div>
                <h3 className="font-bold text-slate-400 text-sm mb-1">SOG</h3>
                <div className="space-y-1 mb-3">
                  {['CIRT experience required', 'Minimum 12 months service', 'Selected by Commander invitation only'].map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <div className="w-1 h-1 rounded-full bg-slate-800 flex-shrink-0" />{r}
                    </div>
                  ))}
                </div>
                <div className="w-full py-2 rounded-lg text-xs font-semibold text-slate-600 text-center flex items-center justify-center gap-2"
                  style={{ background: 'rgba(71,85,105,0.08)', border: '1px solid rgba(71,85,105,0.15)' }}>
                  <Lock className="w-3.5 h-3.5" /> Invite Only
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Division EOI Modal */}
      {applyingDiv && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: '#0d1526', border: '1px solid rgba(6,182,212,0.22)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(6,182,212,0.10)', background: 'rgba(6,182,212,0.04)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.22)' }}>
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">Division EOI</div>
                  <div className="text-xs text-cyan-400/70 mt-0.5">{applyingDiv.name} Division Transfer</div>
                </div>
              </div>
              <button onClick={() => setApplyingDiv(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitDivEOI} className="p-6 space-y-5 overflow-y-auto">
              {[
                { k: 'div_bring', l: 'What can you bring to this division?',              p: 'Your skills, experience, and qualities…' },
                { k: 'div_time',  l: 'How long have you been in your current division?',   p: 'e.g. 3 months in GD…' },
                { k: 'div_goals', l: 'What are your long-term goals in this division?',    p: 'How you\'ll contribute long-term…' },
              ].map(q => (
                <div key={q.k}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{q.l} <span className="text-rose-400">*</span></label>
                  <textarea required rows={3} value={(divEoi as Record<string,string>)[q.k]}
                    onChange={e => setDivEoi(p => ({ ...p, [q.k]: e.target.value }))}
                    placeholder={q.p} className="nx-input w-full resize-none text-sm" />
                </div>
              ))}
              <div className="flex gap-3">
                <button type="button" onClick={() => setApplyingDiv(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#0284c7)' }}>
                  <FileText className="w-4 h-4" />{submitting ? 'Submitting…' : 'Submit EOI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cert EOI Modal */}
      {applyingCert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: '#0d1526', border: '1px solid rgba(234,179,8,0.22)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(234,179,8,0.10)', background: 'rgba(234,179,8,0.04)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.22)' }}>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">Certification EOI</div>
                  <div className="text-xs text-amber-400/70 mt-0.5">{applyingCert.name}</div>
                </div>
              </div>
              <button onClick={() => setApplyingCert(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitEOI} className="p-6 space-y-5 overflow-y-auto">
              {[
                { k: 'why_interested', l: 'Why are you interested in this certification?',       p: 'Your motivation and why this cert matters to you…' },
                { k: 'skills',         l: 'What skills can you bring to this certification?',     p: 'Relevant experience, training, or qualities…' },
                { k: 'goals',          l: 'What do you think you can achieve with this cert?',   p: 'How you\'ll use this cert to benefit the department…' },
              ].map(q => (
                <div key={q.k}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{q.l} <span className="text-rose-400">*</span></label>
                  <textarea required rows={3} value={(eoi as Record<string,string>)[q.k]}
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
            style={{ background: '#0d1526', border: '1px solid rgba(234,179,8,0.22)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(234,179,8,0.10)', background: 'rgba(234,179,8,0.04)' }}>
              <div>
                <div className="text-base font-bold text-white">Review Application</div>
                <div className="text-xs text-amber-400/70 mt-0.5">{reviewTarget.officer_callsign ? `${reviewTarget.officer_callsign} — ` : ''}{reviewTarget.officer_name} · {reviewTarget.cert_name}</div>
              </div>
              <button onClick={() => setReviewTarget(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {[
                { l: 'Why Interested / What They Bring', v: reviewTarget.why_interested },
                { l: 'Skills / Time in Division',        v: reviewTarget.skills },
                { l: 'Goals',                            v: reviewTarget.goals },
              ].map(q => (
                <div key={q.l} className="rounded-xl p-3.5" style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.08)' }}>
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
