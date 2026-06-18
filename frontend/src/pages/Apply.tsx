import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Shield, CheckCircle, AlertCircle, ChevronRight, Clock, Users, Star, Search, FileText, XCircle, Loader } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api').replace(/\/$/, '');
const BACKEND_URL = apiBaseUrl.replace(/\/api$/, '');
const api = axios.create({ baseURL: apiBaseUrl });

const TIMEZONES   = ['AEST (UTC+10)', 'AEDT (UTC+11)', 'ACST (UTC+9:30)', 'AWST (UTC+8)', 'NZT (UTC+12)', 'Other'];
const AVAILABILITY = ['1–5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', '20+ hrs/week'];

type Tab = 'apply' | 'track';
type Step = 1 | 2 | 3;

const STATUS_CONFIG: Record<string, { label: string; color: string; desc: string; step: number }> = {
  pending:   { label: 'Under Review',  color: '#f59e0b', desc: 'Your application has been received and is awaiting leadership review.',       step: 1 },
  interview: { label: 'Interview',     color: '#6366f1', desc: 'You have been shortlisted! Leadership will contact you on Discord shortly.',   step: 2 },
  approved:  { label: 'Approved',      color: '#22c55e', desc: 'Congratulations! Your account has been created. Sign in with Discord.',        step: 3 },
  denied:    { label: 'Unsuccessful',  color: '#ef4444', desc: 'Unfortunately your application was not successful at this time.',              step: -1 },
};

interface TrackedApp {
  id: string; full_name: string; discord_username?: string;
  discord_avatar?: string; status: string;
  created_at: string; reviewed_at?: string; review_notes?: string;
}

export default function Apply() {
  const [mounted, setMounted]   = useState(false);
  const [tab, setTab]           = useState<Tab>('apply');
  const [step, setStep]         = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [params] = useSearchParams();

  // Discord data from OAuth callback
  const discordId       = params.get('discord_id') || '';
  const discordUsername = params.get('discord_username') || '';
  const discordAvatar   = params.get('discord_avatar') || '';
  const discordAuthed   = !!discordId;

  const [form, setForm] = useState({
    full_name: '', discord: discordUsername, age: '', timezone: 'AEST (UTC+10)',
    experience: '', why_join: '', availability: '5–10 hrs/week',
  });

  // Track tab state
  const [trackId, setTrackId]   = useState(params.get('discord_id') ? '' : '');
  const [tracked, setTracked]   = useState<TrackedApp | null>(null);
  const [trackErr, setTrackErr] = useState('');
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (params.get('discord_error')) {
      setError('Discord authentication was cancelled or failed. Please try again.');
    }
    // Auto-fill discord if authed
    if (discordUsername) setForm(f => ({ ...f, discord: discordUsername }));
    // If came back from discord with id, auto-track
    if (discordId && params.get('track') === '1') {
      setTab('track');
      handleTrack(undefined, discordId);
    }
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleDiscordAuth = () => {
    window.location.href = `${BACKEND_URL}/api/auth/discord/apply`;
  };

  const handleTrack = async (e?: FormEvent, prefilledId?: string) => {
    e?.preventDefault();
    const searchId = prefilledId || trackId.trim();
    if (!searchId) return;
    setTracking(true); setTrackErr(''); setTracked(null);
    try {
      const isDiscordId = searchId.match(/^\d{17,20}$/);
      const res = await api.get('/applications/track', {
        params: isDiscordId ? { discord_id: searchId } : { id: searchId },
      });
      setTracked(res.data);
    } catch {
      setTrackErr('Application not found. Check your Application ID or Discord ID.');
    } finally { setTracking(false); }
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(s => (s + 1) as Step); return; }
    submit();
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/applications', {
        ...form,
        age: Number(form.age),
        discord_id: discordId || undefined,
        discord_username: discordUsername || undefined,
        discord_avatar: discordAvatar || undefined,
      });
      setSubmittedId(res.data.id);
      setSubmitted(true);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #04080f 0%, #060d1a 50%, #030812 100%)' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[700px] h-[700px] rounded-full -top-80 -left-80 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full -bottom-40 -right-40 opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(88,101,242,0.10) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Nav */}
        <div className="flex items-center justify-between px-8 h-16 border-b border-sky-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">NextAirs</div>
              <div className="text-[10px] font-mono text-sky-500">NEXT RP · MELBOURNE POLICE</div>
            </div>
          </div>
          <a href="/login" className="text-xs text-slate-500 hover:text-sky-400 transition-colors flex items-center gap-1">
            Officer login <ChevronRight className="w-3 h-3" />
          </a>
        </div>

        {/* Hero */}
        <div className="text-center pt-12 pb-8 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-4"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#38bdf8' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Applications Open
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            Join <span className="text-gradient">Melbourne Police</span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-base leading-relaxed">
            Australia's most immersive FiveM police roleplay. Apply below — leadership reviews every application personally.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-8">
            {[{ v: '24–72h', l: 'Review Time' }, { v: 'Discord', l: 'Required' }, { v: 'Academy', l: 'Start Rank' }].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-xl font-bold text-white">{s.v}</div>
                <div className="text-xs text-slate-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 px-4">
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
            {([['apply', 'Apply Now', FileText], ['track', 'Track Application', Search]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id as Tab)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={tab === id ? { background: 'linear-gradient(135deg,#0284c7,#6366f1)', boxShadow: '0 0 16px rgba(14,165,233,0.25)' } : {}}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center px-4 pb-16">
          <div className="w-full max-w-xl">

            {/* ── APPLY TAB ── */}
            {tab === 'apply' && (
              submitted ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.35)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Application Submitted!</h2>
                  <p className="text-slate-400 mb-6">
                    Thanks <span className="text-sky-400 font-semibold">{form.full_name}</span>. Leadership will review your application.
                  </p>

                  {/* Application ID */}
                  <div className="glass rounded-xl p-4 mb-6 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Your Application ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sky-400 font-mono text-sm flex-1 break-all">{submittedId}</code>
                      <button onClick={() => navigator.clipboard.writeText(submittedId)}
                        className="text-xs text-slate-500 hover:text-sky-400 transition-colors px-2 py-1 rounded border border-slate-700">
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Save this ID to track your application status.</p>
                  </div>

                  <div className="glass rounded-xl p-4 text-left space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>24–72 hour review time</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>You may be invited to an interview if shortlisted</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Star className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Approved applicants start at Academy · Recruit</span>
                    </div>
                  </div>

                  <button onClick={() => { setTab('track'); setTrackId(submittedId); setTimeout(() => handleTrack(undefined, submittedId), 100); }}
                    className="btn-primary px-6 py-2.5 inline-flex items-center gap-2 rounded-xl font-semibold text-sm">
                    <Search className="w-4 h-4" />
                    Track My Application
                  </button>
                </div>
              ) : (
                <>
                  {/* Discord auth gate */}
                  {!discordAuthed ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)', boxShadow: '0 0 30px rgba(88,101,242,0.4)' }}>
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Connect Your Discord</h2>
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        We use Discord to verify your identity and link your application to your account. Your Discord will be used to contact you about your application.
                      </p>
                      {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}
                      <button onClick={handleDiscordAuth}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)', boxShadow: '0 0 24px rgba(88,101,242,0.35)', border: '1px solid rgba(88,101,242,0.4)' }}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                        </svg>
                        Continue with Discord
                      </button>
                      <p className="text-xs text-slate-600 mt-4">We only request your username and avatar. No DMs or server access.</p>
                    </div>
                  ) : (
                    <>
                      {/* Discord linked banner */}
                      <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
                        style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)' }}>
                        {discordAvatar ? (
                          <img src={discordAvatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>
                            {discordUsername[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white">{discordUsername}</p>
                          <p className="text-xs text-indigo-400">Discord connected ✓</p>
                        </div>
                      </div>

                      {/* Step indicator */}
                      <div className="flex items-center justify-center gap-2 mb-6">
                        {[['Personal Info', 1], ['Experience', 2], ['Submit', 3]].map(([label, n], i) => (
                          <div key={n} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step > (n as number) ? 'bg-green-500 text-white' :
                                step === (n as number) ? 'text-white' : 'bg-slate-800 text-slate-500'
                              }`} style={step === n ? { background: 'linear-gradient(135deg,#0284c7,#6366f1)' } : {}}>
                                {step > (n as number) ? <CheckCircle className="w-4 h-4" /> : n}
                              </div>
                              <span className={`text-xs font-medium hidden sm:block ${step === n ? 'text-white' : 'text-slate-600'}`}>{label}</span>
                            </div>
                            {i < 2 && <div className={`w-8 h-px ${step > (n as number) ? 'bg-sky-500/50' : 'bg-slate-800'}`} />}
                          </div>
                        ))}
                      </div>

                      <div className="glass rounded-2xl p-8">
                        {error && (
                          <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                          </div>
                        )}
                        <form onSubmit={next} className="space-y-5">
                          {step === 1 && (
                            <>
                              <h2 className="text-base font-bold text-white mb-4">Personal Information</h2>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name <span className="text-rose-400">*</span></label>
                                <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                                  placeholder="James Smith" className="nx-input" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Age <span className="text-rose-400">*</span></label>
                                <input required type="number" min={16} max={99} value={form.age} onChange={e => set('age', e.target.value)}
                                  placeholder="18" className="nx-input" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Timezone <span className="text-rose-400">*</span></label>
                                <select required value={form.timezone} onChange={e => set('timezone', e.target.value)}
                                  className="nx-input" style={{ colorScheme: 'dark' }}>
                                  {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                                </select>
                              </div>
                            </>
                          )}

                          {step === 2 && (
                            <>
                              <h2 className="text-base font-bold text-white mb-4">Experience & Motivation</h2>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Previous FiveM Law Enforcement Experience</label>
                                <textarea rows={4} value={form.experience} onChange={e => set('experience', e.target.value)}
                                  placeholder="Describe any previous FiveM police experience, server names, ranks held, etc. Write 'None' if this is your first time."
                                  className="nx-input resize-none" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Why do you want to join? <span className="text-rose-400">*</span></label>
                                <textarea required rows={5} value={form.why_join} onChange={e => set('why_join', e.target.value)}
                                  placeholder="Tell us why you want to join, what you hope to contribute, and your goals. Minimum 3 sentences."
                                  className="nx-input resize-none" />
                              </div>
                            </>
                          )}

                          {step === 3 && (
                            <>
                              <h2 className="text-base font-bold text-white mb-4">Final Details</h2>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Weekly Availability</label>
                                <select value={form.availability} onChange={e => set('availability', e.target.value)}
                                  className="nx-input" style={{ colorScheme: 'dark' }}>
                                  {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                                </select>
                              </div>
                              {/* Summary */}
                              <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Review Your Application</p>
                                {[
                                  { l: 'Name', v: form.full_name },
                                  { l: 'Discord', v: discordUsername },
                                  { l: 'Age', v: form.age },
                                  { l: 'Timezone', v: form.timezone },
                                  { l: 'Availability', v: form.availability },
                                ].map(r => (
                                  <div key={r.l} className="flex justify-between">
                                    <span className="text-slate-500 text-xs">{r.l}</span>
                                    <span className="text-white text-xs font-medium">{r.v}</span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                By submitting you confirm all information is accurate. False applications will be permanently blacklisted.
                              </p>
                            </>
                          )}

                          <div className="flex gap-3 pt-2">
                            {step > 1 && (
                              <button type="button" onClick={() => setStep(s => (s - 1) as Step)} className="btn-ghost flex-1 py-3">Back</button>
                            )}
                            <button type="submit" disabled={loading}
                              className="flex-1 py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all"
                              style={{ background: loading ? '#1e293b' : 'linear-gradient(135deg,#0284c7,#6366f1)', border: '1px solid rgba(14,165,233,0.3)' }}>
                              {loading
                                ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                : step < 3 ? <>Next Step <ChevronRight className="w-4 h-4" /></>
                                : 'Submit Application'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  )}
                </>
              )
            )}

            {/* ── TRACK TAB ── */}
            {tab === 'track' && (
              <div className="space-y-5">
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-base font-bold text-white mb-1">Track Your Application</h2>
                  <p className="text-xs text-slate-500 mb-5">Enter your Application ID (from your confirmation) or your Discord ID.</p>
                  <form onSubmit={handleTrack} className="flex gap-3">
                    <input value={trackId} onChange={e => setTrackId(e.target.value)}
                      placeholder="Application ID or Discord ID…"
                      className="nx-input flex-1" />
                    <button type="submit" disabled={tracking}
                      className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center gap-2 transition-all"
                      style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)', border: '1px solid rgba(14,165,233,0.3)' }}>
                      {tracking ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  </form>
                  {trackErr && (
                    <div className="flex items-center gap-2 p-3 rounded-xl mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{trackErr}
                    </div>
                  )}
                </div>

                {tracked && (() => {
                  const cfg = STATUS_CONFIG[tracked.status] ?? STATUS_CONFIG.pending;
                  const stages = ['Submitted', 'Under Review', 'Interview', 'Decision'];
                  return (
                    <div className="glass rounded-2xl p-6 space-y-5">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        {tracked.discord_avatar ? (
                          <img src={tracked.discord_avatar} alt="" className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>
                            {tracked.full_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white">{tracked.full_name}</p>
                          {tracked.discord_username && <p className="text-xs text-indigo-400">@{tracked.discord_username}</p>}
                        </div>
                        <div className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                          {cfg.label}
                        </div>
                      </div>

                      {/* Status message */}
                      <div className="p-3 rounded-xl text-sm" style={{ background: `${cfg.color}0d`, border: `1px solid ${cfg.color}25` }}>
                        {tracked.status === 'denied'
                          ? <div className="flex items-center gap-2"><XCircle className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} /><span className="text-slate-300">{cfg.desc}</span></div>
                          : <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} /><span className="text-slate-300">{cfg.desc}</span></div>
                        }
                      </div>

                      {/* Progress timeline (not for denied) */}
                      {tracked.status !== 'denied' && (
                        <div className="space-y-3">
                          {stages.map((stage, i) => {
                            const done = cfg.step > i;
                            const active = cfg.step === i;
                            return (
                              <div key={stage} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold`}
                                  style={{
                                    background: done ? '#22c55e20' : active ? `${cfg.color}20` : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${done ? '#22c55e50' : active ? `${cfg.color}50` : 'rgba(255,255,255,0.08)'}`,
                                    color: done ? '#22c55e' : active ? cfg.color : '#475569',
                                  }}>
                                  {done ? '✓' : i + 1}
                                </div>
                                <div className="flex-1">
                                  <div className={`text-sm font-medium ${done || active ? 'text-white' : 'text-slate-600'}`}>{stage}</div>
                                  {active && <div className="text-xs mt-0.5" style={{ color: cfg.color }}>Current stage</div>}
                                </div>
                                {i < stages.length - 1 && (
                                  <div className="absolute left-[39px] mt-7 w-px h-3" style={{ background: done ? '#22c55e30' : 'rgba(255,255,255,0.06)' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dates */}
                      <div className="flex gap-4 text-xs text-slate-500 pt-1 border-t border-white/5">
                        <span>Submitted {new Date(tracked.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {tracked.reviewed_at && <span>· Reviewed {new Date(tracked.reviewed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
                      </div>

                      {tracked.status === 'approved' && (
                        <a href="/login"
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)', border: '1px solid rgba(88,101,242,0.4)' }}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                          </svg>
                          Sign in with Discord
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
