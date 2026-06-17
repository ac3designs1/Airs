import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Shield, CheckCircle, AlertCircle, ChevronRight, Clock, Users, Star } from 'lucide-react';
import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const api = axios.create({ baseURL: apiBaseUrl });

const TIMEZONES = ['AEST (UTC+10)', 'AEDT (UTC+11)', 'ACST (UTC+9:30)', 'AWST (UTC+8)', 'NZT (UTC+12)', 'Other'];
const AVAILABILITY = ['1–5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', '20+ hrs/week'];
const REFERRAL = ['Friend / Existing Member', 'Discord', 'Reddit', 'TikTok / YouTube', 'FiveM Server List', 'Other'];

type Step = 1 | 2 | 3;

export default function Apply() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '', discord: '', age: '', timezone: 'AEST (UTC+10)',
    experience: '', why_join: '', availability: '5–10 hrs/week', referral: 'Friend / Existing Member',
  });

  useEffect(() => { setMounted(true); }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(s => (s + 1) as Step); return; }
    submit();
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/applications', { ...form, age: Number(form.age) });
      setSubmitted(true);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const STEPS = [
    { n: 1, label: 'Personal Info' },
    { n: 2, label: 'Experience' },
    { n: 3, label: 'Final Details' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #04080f 0%, #060d1a 50%, #030812 100%)' }}>
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[700px] h-[700px] rounded-full -top-80 -left-80 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full -bottom-40 -right-40 opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Nav bar */}
        <div className="flex items-center justify-between px-8 h-16 border-b border-sky-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">NextAirs</div>
              <div className="text-[10px] font-mono text-sky-500">NEXT RP · MELPOL</div>
            </div>
          </div>
          <a href="/login" className="text-xs text-slate-500 hover:text-sky-400 transition-colors flex items-center gap-1">
            Already a member? Sign in <ChevronRight className="w-3 h-3" />
          </a>
        </div>

        {submitted ? (
          /* ── Success ── */
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.35)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Application Submitted!</h1>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Thank you <span className="text-sky-400 font-semibold">{form.full_name}</span>. Your application has been received and will be reviewed by leadership. You'll be contacted via Discord at <span className="text-sky-400 font-mono">{form.discord}</span>.
              </p>
              <div className="glass rounded-xl p-4 text-left space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Review usually takes <strong className="text-slate-300">24–72 hours</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>You may be invited to an <strong className="text-slate-300">interview</strong> if shortlisted</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Star className="w-3.5 h-3.5" />
                  <span>Approved applicants start at <strong className="text-slate-300">Academy · Recruit</strong></span>
                </div>
              </div>
              <a href="/login" className="btn-primary px-6 py-2.5 inline-flex items-center gap-2 rounded-xl font-semibold text-sm">
                Back to Login
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6">
            <div className="w-full max-w-xl">

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Join Melbourne Police</h1>
                <p className="text-slate-500">Complete the application below. Our leadership team reviews every submission.</p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step > s.n ? 'bg-green-500 text-white' :
                        step === s.n ? 'text-white' : 'bg-slate-800 text-slate-500'
                      }`} style={step === s.n ? { background: 'linear-gradient(135deg,#0284c7,#6366f1)' } : {}}>
                        {step > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
                      </div>
                      <span className={`text-xs font-medium ${step === s.n ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-8 h-px ${step > s.n ? 'bg-sky-500/50' : 'bg-slate-800'}`} />}
                  </div>
                ))}
              </div>

              {/* Form card */}
              <div className="glass rounded-2xl p-8">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={next} className="space-y-5">
                  {step === 1 && (
                    <>
                      <h2 className="text-base font-bold text-white mb-4">Personal Information</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name <span className="text-rose-400">*</span></label>
                          <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                            placeholder="James Smith" className="nx-input" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Discord Username <span className="text-rose-400">*</span></label>
                          <input required value={form.discord} onChange={e => set('discord', e.target.value)}
                            placeholder="user#0001 or @user" className="nx-input" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Age <span className="text-rose-400">*</span></label>
                          <input required type="number" min={16} max={99} value={form.age} onChange={e => set('age', e.target.value)}
                            placeholder="18" className="nx-input" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Timezone <span className="text-rose-400">*</span></label>
                          <select required value={form.timezone} onChange={e => set('timezone', e.target.value)}
                            className="nx-input" style={{ colorScheme: 'dark' }}>
                            {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h2 className="text-base font-bold text-white mb-4">Experience & Background</h2>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Previous FiveM Law Enforcement Experience</label>
                        <textarea rows={4} value={form.experience} onChange={e => set('experience', e.target.value)}
                          placeholder="Describe any previous FiveM police roleplay experience, server names, ranks held, length of service, etc. Write 'None' if this is your first time."
                          className="nx-input resize-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Why do you want to join Melbourne Police? <span className="text-rose-400">*</span></label>
                        <textarea required rows={4} value={form.why_join} onChange={e => set('why_join', e.target.value)}
                          placeholder="Tell us why you want to join, what you hope to contribute, and your goals within the department. (minimum 3 sentences)"
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
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">How did you hear about us?</label>
                        <select value={form.referral} onChange={e => set('referral', e.target.value)}
                          className="nx-input" style={{ colorScheme: 'dark' }}>
                          {REFERRAL.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      {/* Summary */}
                      <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Application Summary</p>
                        {[
                          { l: 'Name', v: form.full_name },
                          { l: 'Discord', v: form.discord },
                          { l: 'Age', v: form.age },
                          { l: 'Timezone', v: form.timezone },
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
                      <button type="button" onClick={() => setStep(s => (s - 1) as Step)} className="btn-ghost flex-1 py-3">
                        Back
                      </button>
                    )}
                    <button type="submit" disabled={loading}
                      className="flex-1 py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: loading ? '#1e293b' : 'linear-gradient(135deg,#0284c7,#6366f1)', border: '1px solid rgba(14,165,233,0.3)' }}>
                      {loading
                        ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        : step < 3 ? (<>Next Step <ChevronRight className="w-4 h-4" /></>)
                        : 'Submit Application'
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
