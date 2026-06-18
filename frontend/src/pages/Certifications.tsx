import { useEffect, useState } from 'react';
import {
  Award, CheckCircle, Clock, X, Lock, FileText,
  ChevronRight, ShieldAlert, ArrowRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

/* ─── Types ─────────────────────────────────────────────────── */
interface CertApp {
  id: string; cert_name: string; cert_category: string;
  officer_name?: string; officer_callsign?: string;
  why_interested: string; skills: string; goals: string;
  status: 'pending' | 'approved' | 'denied';
  review_notes?: string; reviewed_at?: string; created_at: string;
}
interface Cert  { name: string; category: string; desc: string; minRank: string; divReq?: string; disabled?: boolean; }
interface DivEOI { name: string; category: string; requirements: string[]; }
type CertState = 'approved' | 'pending' | 'denied' | 'rank_locked' | 'div_locked' | 'disabled' | 'not_applied';
type Tab = 'certs' | 'divisions' | 'all';

/* ─── Data ───────────────────────────────────────────────────── */
const RANK_ORDER = [
  'Recruit','Probationary Constable','Constable','First Constable',
  'Senior Constable','Leading Senior Constable','Sergeant','Senior Sergeant',
  'Inspector','Superintendent','Commander','Assistant Commissioner','Deputy Commissioner','Commissioner',
];
const rankGte = (u: string, m: string) => {
  const ui = RANK_ORDER.indexOf(u), mi = RANK_ORDER.indexOf(m);
  return ui !== -1 && mi !== -1 && ui >= mi;
};

const CERTS: Cert[] = [
  // Constable+
  { name:'Field Training Officer (FTO)', category:'Training',      desc:'Train new officers in the field.',                              minRank:'Constable' },
  { name:'Dog Squad',                    category:'Specialist',    desc:'K9 unit operations and handler certification.',                minRank:'Constable' },
  { name:'Advanced Negotiator',          category:'Specialist',    desc:'Advanced negotiation and crisis intervention.',               minRank:'Constable' },
  { name:'Melbourne Parks & Wildlife',   category:'Specialist',    desc:'Parks and wildlife operations.',                              minRank:'Constable' },
  { name:'Port OPS',                     category:'Tactical',      desc:'Port Tactical Division operations.',                          minRank:'Constable' },
  { name:'Airwing Certification',        category:'Specialist',    desc:'Aviation operations and support.',                            minRank:'Constable', divReq:'Airwing' },
  { name:'Marine Certification',         category:'Specialist',    desc:'Marine patrol and water operations.',                         minRank:'Constable', divReq:'Marine' },
  { name:"Sheriff's Office",             category:'Specialist',    desc:'Court security and civil enforcement.',                       minRank:'Constable', divReq:'Sheriff' },
  { name:'Legal Services',              category:'Investigative', desc:'Legal support and advisory services.',                        minRank:'Constable', divReq:'Legal' },
  { name:'Operations Response Unit',     category:'Tactical',      desc:'Highway Tactical Operations.',                                minRank:'Constable', divReq:'ORU' },
  { name:'Armed Crime Unit',             category:'Investigative', desc:'Armed Crime Unit (ACU) operations.',                          minRank:'Constable', divReq:'Crime Command' },
  { name:'Organised Crime Unit',         category:'Investigative', desc:'Organised Crime Unit (OCU) operations.',                      minRank:'Constable', divReq:'Crime Command' },
  // First Constable+
  { name:'Motorcycle Certification',     category:'Highway',       desc:'Motorcycle operation and patrol.',                            minRank:'First Constable', divReq:'Highway' },
  { name:'Interceptor Patrol Group',     category:'Highway',       desc:'High-speed pursuit and interception.',                        minRank:'First Constable', divReq:'Highway' },
  { name:'RBT Supervisor',               category:'Highway',       desc:'Random Breath Testing supervisor.',                           minRank:'First Constable', divReq:'Highway' },
  { name:'Mobile Speed Camera',          category:'Highway',       desc:'Speed camera deployment and operation.',                      minRank:'First Constable', divReq:'Highway' },
  { name:'HWP Trainer',                  category:'Highway',       desc:'Highway Patrol Trainer certification.',                       minRank:'First Constable', divReq:'Highway', disabled:true },
  { name:'OPS 32',                       category:'Tactical',      desc:'Specialised Airwing Operations.',                             minRank:'First Constable', divReq:'SOG' },
  { name:'Armoured Response',            category:'Tactical',      desc:'Armoured vehicle and tactical response operations.',          minRank:'First Constable', divReq:'CIRT' },
  { name:'CIRT FTO',                     category:'Tactical',      desc:'Train new CIRT members as a Field Training Officer.',         minRank:'First Constable', divReq:'CIRT' },
  // Senior Constable+
  { name:'Advanced Weapons Certification', category:'Tactical',   desc:'Advanced weapons handling and tactical operations.',          minRank:'Senior Constable', divReq:'CIRT' },
];

const TIERS = [
  { label:'Constable+',        min:'Constable',        certs:CERTS.filter(c=>c.minRank==='Constable') },
  { label:'First Constable+',  min:'First Constable',  certs:CERTS.filter(c=>c.minRank==='First Constable') },
  { label:'Senior Constable+', min:'Senior Constable', certs:CERTS.filter(c=>c.minRank==='Senior Constable') },
];

const DIVISION_EOIS: DivEOI[] = [
  { name:'CIRT',          category:'Tactical', requirements:['FTO Certified','Minimum 6 months service','Supervisor recommendation','No active strikes'] },
  { name:'Highway Patrol',category:'Highway',  requirements:['Minimum 3 months service','Advanced driver training','Clean service record'] },
];

const CAT_CLS: Record<string,string> = {
  Training:'chip-blue', Tactical:'chip-red', Specialist:'chip-purple',
  Investigative:'chip-indigo', Highway:'chip-gold',
};

const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];

/* ─── Shared modal shell ─────────────────────────────────────── */
function Modal({ onClose, accent='rgba(6,182,212,0.22)', children }: {
  onClose:()=>void; accent?:string; children:React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="modal-card w-full sm:max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        style={{ background:'#0d1526', border:`1px solid ${accent}` }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, sub, accent='rgba(6,182,212,0.10)', onClose, icon }:{
  title:string; sub?:string; accent?:string; onClose:()=>void; icon?:React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
      style={{ borderBottom:'1px solid rgba(6,182,212,0.08)', background:accent }}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-base font-black text-white">{title}</div>
          {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────── */
export default function Certifications() {
  const { auth } = useAuth();
  const user     = auth.user!;
  const isLeader = LEADERSHIP.includes(user.role);

  const [apps,         setApps]         = useState<CertApp[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<Tab>('certs');
  const [catFilter,    setCatFilter]    = useState('');
  const [applyingCert, setApplyingCert] = useState<Cert|null>(null);
  const [applyingDiv,  setApplyingDiv]  = useState<DivEOI|null>(null);
  const [eoi,          setEoi]          = useState({ why_interested:'', skills:'', goals:'' });
  const [divEoi,       setDivEoi]       = useState({ div_bring:'', div_time:'', div_goals:'' });
  const [submitting,   setSubmitting]   = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CertApp|null>(null);
  const [reviewNotes,  setReviewNotes]  = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/certifications'); setApps(r.data); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const myName = `${user.first_name} ${user.last_name}`;

  const getStatus = (certName:string):CertState => {
    const mine = apps.filter(a=>a.cert_name===certName);
    if(!mine.length) return 'not_applied';
    if(mine.some(a=>a.status==='approved')) return 'approved';
    if(mine.some(a=>a.status==='pending'))  return 'pending';
    return 'denied';
  };

  const getCertState = (cert:Cert):CertState => {
    if(cert.disabled) return 'disabled';
    if(!rankGte(user.rank,cert.minRank)) return 'rank_locked';
    if(cert.divReq && user.department!==cert.divReq) return 'div_locked';
    return getStatus(cert.name);
  };

  const submitEOI = async(e:React.FormEvent)=>{
    e.preventDefault(); setSubmitting(true);
    try{
      await api.post('/certifications',{cert_name:applyingCert?.name,cert_category:applyingCert?.category,...eoi});
      await load(); setApplyingCert(null); setEoi({why_interested:'',skills:'',goals:''});
    }finally{setSubmitting(false);}
  };

  const submitDivEOI = async(e:React.FormEvent)=>{
    e.preventDefault(); setSubmitting(true);
    try{
      await api.post('/certifications',{
        cert_name:`Division Transfer — ${applyingDiv?.name}`,
        cert_category:applyingDiv?.category??'Division',
        why_interested:divEoi.div_bring, skills:divEoi.div_time, goals:divEoi.div_goals,
      });
      await load(); setApplyingDiv(null); setDivEoi({div_bring:'',div_time:'',div_goals:''});
    }finally{setSubmitting(false);}
  };

  const updateStatus = async(id:string,status:'approved'|'denied')=>{
    await api.put(`/certifications/${id}`,{status,review_notes:reviewNotes});
    await load(); setReviewTarget(null); setReviewNotes('');
  };

  const myCertCount  = apps.filter(a=>a.status==='approved'&&a.officer_name===myName).length;
  const pendingCount = apps.filter(a=>a.status==='pending').length;
  const allApps      = apps.filter(a=>tab==='all'?(isLeader):a.officer_name===myName);
  const cats         = [...new Set(CERTS.map(c=>c.category))];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header page-header-gold scan-line">
        <div className="flex items-center gap-4">
          <div className="ph-icon ph-icon-gold"><Award className="w-6 h-6 text-amber-400" /></div>
          <div>
            <h1 className="text-xl font-black text-white">Certifications</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-slate-400 font-semibold">{myCertCount}</span> certified
              <span className="mx-2 text-slate-700">·</span>
              Rank: <span className="text-slate-300 font-semibold">{user.rank}</span>
              {pendingCount > 0 && isLeader && (
                <span className="ml-2 chip chip-yellow text-[10px]">{pendingCount} pending review</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="nx-tabs">
          <button className={`nx-tab ${tab==='certs'?'active':''}`} onClick={()=>setTab('certs')}>
            Certifications
          </button>
          <button className={`nx-tab ${tab==='divisions'?'active':''}`} onClick={()=>setTab('divisions')}>
            Division EOIs
          </button>
          {isLeader && (
            <button className={`nx-tab ${tab==='all'?'active':''}`} onClick={()=>setTab('all')}>
              All Applications{pendingCount>0?` (${pendingCount})`:''}
            </button>
          )}
        </div>

        {/* Category filter — only on certs tab */}
        {tab==='certs' && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={()=>setCatFilter('')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${!catFilter?'border-amber-500/40 bg-amber-500/12 text-amber-300':'chip-gray'}`}>
              All
            </button>
            {cats.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c===catFilter?'':c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${catFilter===c?'border-amber-500/40 bg-amber-500/12 text-amber-300':'chip-gray'}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── All Applications (leadership) ────────────────────── */}
      {tab==='all' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="card-header">
            <span className="text-sm font-bold text-white">All Applications</span>
            <span className="chip chip-yellow text-[10px]">{pendingCount} pending</span>
          </div>
          {loading ? (
            <div className="nx-empty"><div className="nx-spinner"/><p className="text-slate-600 text-sm">Loading…</p></div>
          ) : allApps.length===0 ? (
            <div className="nx-empty">
              <div className="nx-empty-icon"><FileText className="w-6 h-6 text-slate-600"/></div>
              <p className="text-slate-500 text-sm font-medium">No applications yet</p>
            </div>
          ) : (
            <div>
              {allApps.map((app,i,arr)=>(
                <div key={app.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-white/[0.01] transition-colors"
                  style={{borderBottom:i<arr.length-1?'1px solid rgba(6,182,212,0.06)':'none'}}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`chip text-[10px] flex-shrink-0 ${CAT_CLS[app.cert_category]??'chip-gray'}`}>{app.cert_category}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{app.cert_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {app.officer_callsign?`${app.officer_callsign} · `:''}
                        {app.officer_name} · {format(parseISO(app.created_at),'dd MMM yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`chip text-[10px] ${app.status==='approved'?'chip-green':app.status==='denied'?'chip-red':'chip-yellow'}`}>
                      {app.status}
                    </span>
                    {app.status==='pending'&&(
                      <button onClick={()=>{setReviewTarget(app);setReviewNotes('');}}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold chip-yellow">
                        Review <ChevronRight className="w-3 h-3"/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Certifications tab ───────────────────────────────── */}
      {tab==='certs' && (
        <div className="space-y-6">
          {TIERS.map(tier=>{
            const visible = tier.certs.filter(c=>!catFilter||c.category===catFilter);
            if(!visible.length) return null;
            const tierUnlocked = rankGte(user.rank,tier.min);
            return (
              <div key={tier.label}>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`chip text-[10px] font-black ${tierUnlocked?'chip-cyan':'chip-gray'}`}>
                    {tier.label}
                  </div>
                  {!tierUnlocked&&(
                    <span className="text-[11px] text-slate-600 flex items-center gap-1">
                      <Lock className="w-3 h-3"/> Requires {tier.min} rank
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visible.map(cert=>{
                    const state = getCertState(cert);
                    const locked = ['rank_locked','div_locked','disabled'].includes(state);
                    return (
                      <div key={cert.name}
                        className={`rounded-xl p-4 transition-all border ${locked?'opacity-50':'hover:border-amber-500/25'}`}
                        style={{
                          background: state==='approved'?'rgba(34,197,94,0.05)': state==='pending'?'rgba(234,179,8,0.05)':'#111c31',
                          borderColor: state==='approved'?'rgba(34,197,94,0.22)': state==='pending'?'rgba(234,179,8,0.22)':'rgba(6,182,212,0.12)',
                        }}>

                        {/* Tags row */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                          <span className={`chip text-[9px] ${CAT_CLS[cert.category]??'chip-gray'}`}>{cert.category}</span>
                          {cert.divReq&&<span className="chip chip-cyan text-[9px]">{cert.divReq}</span>}
                          {state==='approved'&&<span className="chip chip-green text-[9px] flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5"/>Certified</span>}
                          {state==='pending' &&<span className="chip chip-yellow text-[9px] flex items-center gap-1"><Clock className="w-2.5 h-2.5"/>Pending</span>}
                          {state==='denied'  &&<span className="chip chip-red text-[9px]">Denied</span>}
                        </div>

                        <p className="font-black text-white text-sm mb-1 leading-tight">{cert.name}</p>
                        <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">{cert.desc}</p>

                        {/* Action */}
                        {state==='disabled'&&(
                          <div className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 text-center"
                            style={{background:'rgba(71,85,105,0.10)',border:'1px solid rgba(71,85,105,0.15)'}}>
                            Applications Disabled
                          </div>
                        )}
                        {state==='rank_locked'&&(
                          <div className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-center flex items-center justify-center gap-1.5"
                            style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.14)',color:'#f87171'}}>
                            <ShieldAlert className="w-3.5 h-3.5"/>Rank Requirement Not Met
                          </div>
                        )}
                        {state==='div_locked'&&(
                          <div className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-center flex items-center justify-center gap-1.5"
                            style={{background:'rgba(6,182,212,0.06)',border:'1px solid rgba(6,182,212,0.14)',color:'#67e8f9'}}>
                            <Lock className="w-3.5 h-3.5"/>{cert.divReq} Division Required
                          </div>
                        )}
                        {state==='not_applied'&&(
                          <button onClick={()=>{setApplyingCert(cert);setEoi({why_interested:'',skills:'',goals:''}); }}
                            className="w-full py-1.5 rounded-lg text-sm font-bold text-white transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                            style={{background:'linear-gradient(135deg,#b45309,#d97706)'}}>
                            Apply Now <ArrowRight className="w-3.5 h-3.5"/>
                          </button>
                        )}
                        {state==='denied'&&(
                          <button onClick={()=>{setApplyingCert(cert);setEoi({why_interested:'',skills:'',goals:''}); }}
                            className="w-full py-1.5 rounded-lg text-sm font-medium text-slate-400 border border-slate-700/50 hover:border-amber-500/30 transition-all">
                            Re-apply
                          </button>
                        )}
                        {state==='approved'&&(
                          <div className="w-full py-1.5 rounded-lg text-[11px] font-bold text-center flex items-center justify-center gap-1.5"
                            style={{background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.18)',color:'#4ade80'}}>
                            <CheckCircle className="w-3.5 h-3.5"/>Certified
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Division EOIs tab ────────────────────────────────── */}
      {tab==='divisions' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Submit an Expression of Interest to transfer to a specialist division. Leadership will review your application.</p>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {DIVISION_EOIS.map(div=>{
              const status = getStatus(`Division Transfer — ${div.name}`);
              return (
                <div key={div.name}
                  className="rounded-xl p-4 border transition-all hover:border-cyan-500/25"
                  style={{
                    background: status==='approved'?'rgba(34,197,94,0.05)':status==='pending'?'rgba(6,182,212,0.05)':'#111c31',
                    borderColor: status==='approved'?'rgba(34,197,94,0.22)':status==='pending'?'rgba(6,182,212,0.22)':'rgba(6,182,212,0.12)',
                  }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className={`chip text-[9px] ${CAT_CLS[div.category]??'chip-cyan'}`}>{div.category}</span>
                    <span className="chip chip-cyan text-[9px]">EOI</span>
                    {status==='approved'&&<span className="chip chip-green text-[9px] flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5"/>Accepted</span>}
                    {status==='pending' &&<span className="chip chip-yellow text-[9px] flex items-center gap-1"><Clock className="w-2.5 h-2.5"/>Pending</span>}
                    {status==='denied'  &&<span className="chip chip-red text-[9px]">Unsuccessful</span>}
                  </div>
                  <p className="font-black text-white text-sm mb-1">{div.name}</p>
                  <div className="space-y-1 mb-3">
                    {div.requirements.map((r,i)=>(
                      <div key={i} className="flex items-center gap-2 text-[12px] text-slate-500">
                        <div className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0"/>
                        {r}
                      </div>
                    ))}
                  </div>
                  {status==='not_applied'&&(
                    <button onClick={()=>{setApplyingDiv(div);setDivEoi({div_bring:'',div_time:'',div_goals:''}); }}
                      className="w-full py-1.5 rounded-lg text-sm font-bold text-white transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                      style={{background:'linear-gradient(135deg,#0891b2,#0284c7)'}}>
                      Submit EOI <ArrowRight className="w-3.5 h-3.5"/>
                    </button>
                  )}
                  {status==='denied'&&(
                    <button onClick={()=>{setApplyingDiv(div);setDivEoi({div_bring:'',div_time:'',div_goals:''}); }}
                      className="w-full py-1.5 rounded-lg text-sm font-medium text-slate-400 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
                      Re-apply
                    </button>
                  )}
                </div>
              );
            })}

            {/* SOG — invite only */}
            <div className="rounded-xl p-4 border opacity-40" style={{background:'#111c31',borderColor:'rgba(6,182,212,0.08)'}}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="chip chip-red text-[9px]">Tactical</span>
                <span className="chip chip-gray text-[9px]">Invite Only</span>
              </div>
              <p className="font-black text-slate-400 text-sm mb-1">SOG</p>
              <div className="space-y-1 mb-3">
                {['CIRT experience required','12+ months service','Commander invitation only'].map((r,i)=>(
                  <div key={i} className="flex items-center gap-2 text-[12px] text-slate-600">
                    <div className="w-1 h-1 rounded-full bg-slate-700 flex-shrink-0"/>{r}
                  </div>
                ))}
              </div>
              <div className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 text-center flex items-center justify-center gap-1.5"
                style={{background:'rgba(71,85,105,0.08)',border:'1px solid rgba(71,85,105,0.12)'}}>
                <Lock className="w-3 h-3"/> Invite Only
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cert EOI Modal ───────────────────────────────────── */}
      {applyingCert&&(
        <Modal onClose={()=>setApplyingCert(null)} accent="rgba(234,179,8,0.22)">
          <ModalHeader title="Certification EOI" sub={applyingCert.name} accent="rgba(234,179,8,0.05)"
            onClose={()=>setApplyingCert(null)}
            icon={<div className="p-2 rounded-xl" style={{background:'rgba(234,179,8,0.12)',border:'1px solid rgba(234,179,8,0.22)'}}><Award className="w-4 h-4 text-amber-400"/></div>}
          />
          <form onSubmit={submitEOI} className="p-5 space-y-4 overflow-y-auto">
            {[
              {k:'why_interested',l:'Why are you interested in this certification?',        p:'Your motivation and why this cert matters to you…'},
              {k:'skills',        l:'What skills can you bring to this certification?',      p:'Relevant experience, training, or qualities…'},
              {k:'goals',         l:'What do you think you can achieve with this cert?',    p:'How you\'ll use this cert to benefit the department…'},
            ].map(q=>(
              <div key={q.k}>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{q.l} <span className="text-rose-400">*</span></label>
                <textarea required rows={3} value={(eoi as Record<string,string>)[q.k]}
                  onChange={e=>setEoi(p=>({...p,[q.k]:e.target.value}))}
                  placeholder={q.p} className="nx-input w-full resize-none text-sm"/>
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={()=>setApplyingCert(null)} className="btn-ghost flex-1">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting?'Submitting…':'Submit EOI'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Division EOI Modal ───────────────────────────────── */}
      {applyingDiv&&(
        <Modal onClose={()=>setApplyingDiv(null)} accent="rgba(6,182,212,0.22)">
          <ModalHeader title="Division EOI" sub={`${applyingDiv.name} Division Transfer`} accent="rgba(6,182,212,0.05)"
            onClose={()=>setApplyingDiv(null)}
            icon={<div className="p-2 rounded-xl" style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.22)'}}><FileText className="w-4 h-4 text-cyan-400"/></div>}
          />
          <form onSubmit={submitDivEOI} className="p-5 space-y-4 overflow-y-auto">
            {[
              {k:'div_bring',l:'What can you bring to this division?',              p:'Your skills, experience, and qualities…'},
              {k:'div_time', l:'How long have you been in your current division?',  p:'e.g. 3 months in GD…'},
              {k:'div_goals',l:'What are your long-term goals in this division?',   p:'How you\'ll contribute long-term…'},
            ].map(q=>(
              <div key={q.k}>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{q.l} <span className="text-rose-400">*</span></label>
                <textarea required rows={3} value={(divEoi as Record<string,string>)[q.k]}
                  onChange={e=>setDivEoi(p=>({...p,[q.k]:e.target.value}))}
                  placeholder={q.p} className="nx-input w-full resize-none text-sm"/>
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={()=>setApplyingDiv(null)} className="btn-ghost flex-1">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting?'Submitting…':'Submit EOI'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Review Modal ─────────────────────────────────────── */}
      {reviewTarget&&(
        <Modal onClose={()=>setReviewTarget(null)} accent="rgba(234,179,8,0.22)">
          <ModalHeader title="Review Application"
            sub={`${reviewTarget.officer_callsign?`${reviewTarget.officer_callsign} · `:''}${reviewTarget.officer_name}`}
            accent="rgba(234,179,8,0.05)" onClose={()=>setReviewTarget(null)}
          />
          <div className="p-5 overflow-y-auto space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">{reviewTarget.cert_name}</p>
            {[
              {l:'Why Interested / What They Bring', v:reviewTarget.why_interested},
              {l:'Skills / Time in Division',        v:reviewTarget.skills},
              {l:'Goals',                            v:reviewTarget.goals},
            ].map(q=>(
              <div key={q.l} className="rounded-xl p-3.5" style={{background:'rgba(6,182,212,0.03)',border:'1px solid rgba(6,182,212,0.08)'}}>
                <div className="text-[9px] uppercase tracking-wider text-slate-600 font-black mb-1">{q.l}</div>
                <p className="text-sm text-slate-300 leading-relaxed">{q.v||'—'}</p>
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Review Notes (optional)</label>
              <textarea rows={2} value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}
                placeholder="Feedback for the officer…" className="nx-input w-full resize-none text-sm"/>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={()=>setReviewTarget(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={()=>updateStatus(reviewTarget.id,'denied')} className="btn-danger flex-1">Deny</button>
              <button onClick={()=>updateStatus(reviewTarget.id,'approved')} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5"
                style={{background:'linear-gradient(135deg,#15803d,#16a34a)'}}>
                <CheckCircle className="w-4 h-4"/>Approve
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
