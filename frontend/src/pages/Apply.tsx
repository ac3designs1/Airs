import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Shield, CheckCircle, AlertCircle, ChevronRight,
  Clock, Users, Star, XCircle, Loader, RefreshCw, Zap, Lock, MessageCircle
} from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api').replace(/\/$/, '');
const BACKEND_URL = apiBaseUrl.replace(/\/api$/, '');
const api = axios.create({ baseURL: apiBaseUrl });

const TIMEZONES   = ['AEST (UTC+10)', 'AEDT (UTC+11)', 'ACST (UTC+9:30)', 'AWST (UTC+8)', 'NZT (UTC+12)', 'Other'];
const AVAILABILITY = ['1–5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', '20+ hrs/week'];
const RP_LEVEL    = ['Beginner (new to FiveM RP)', 'Intermediate (some RP experience)', 'Advanced (experienced RPer)', 'Veteran (multiple servers/years)'];
const TIME_SLOTS  = ['Early Morning (5am–9am)', 'Morning (9am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–10pm)', 'Late Night (10pm–3am)'];

type Step = 1 | 2 | 3 | 4;

const STATUS_CONFIG: Record<string, { label: string; color: string; desc: string; step: number }> = {
  pending:   { label: 'Under Review',  color: '#f59e0b', desc: 'Your application has been received and is awaiting leadership review.',     step: 1 },
  interview: { label: 'Interview',     color: '#6366f1', desc: 'You have been shortlisted! Leadership will contact you on Discord shortly.', step: 2 },
  approved:  { label: 'Approved',      color: '#22c55e', desc: 'Congratulations! Your account has been created. Sign in with Discord now.',  step: 3 },
  denied:    { label: 'Unsuccessful',  color: '#ef4444', desc: 'Unfortunately your application was not successful at this time.',            step: -1 },
};

interface TrackedApp {
  id: string; full_name: string; discord_username?: string;
  discord_avatar?: string; status: string;
  created_at: string; reviewed_at?: string; review_notes?: string;
}

const STEPS = [
  { n: 1, label: 'About You' },
  { n: 2, label: 'Experience' },
  { n: 3, label: 'Availability' },
  { n: 4, label: 'Review' },
];

export default function Apply() {
  const [mounted, setMounted]         = useState(false);
  const [step, setStep]               = useState<Step>(1);
  const [submitted, setSubmitted]     = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [existing, setExisting]       = useState<TrackedApp | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const [params] = useSearchParams();
  const discordId       = params.get('discord_id') || '';
  const discordUsername = params.get('discord_username') || '';
  const discordAvatar   = params.get('discord_avatar') || '';
  const discordAuthed   = !!discordId;

  const [form, setForm] = useState({
    full_name: '', age: '', timezone: 'AEST (UTC+10)',
    rp_level: RP_LEVEL[1],
    experience: '', why_join: '',
    character_background: '',
    previous_bans: 'No',
    availability: '5–10 hrs/week',
    play_times: [] as string[],
    rules_acknowledged: false,
  });

  const set = (k: string, v: string | boolean | string[]) => setForm(f => ({ ...f, [k]: v }));

  const togglePlayTime = (slot: string) => {
    setForm(f => ({
      ...f,
      play_times: f.play_times.includes(slot)
        ? f.play_times.filter(s => s !== slot)
        : [...f.play_times, slot],
    }));
  };

  useEffect(() => {
    setMounted(true);
    if (params.get('discord_error')) setError('Discord authentication failed. Please try again.');

    // Auto-check for existing application when Discord authed
    if (discordId) {
      setCheckingExisting(true);
      api.get('/applications/track', { params: { discord_id: discordId } })
        .then(r => setExisting(r.data))
        .catch(() => setExisting(null))
        .finally(() => setCheckingExisting(false));
    }
  }, []);

  const handleDiscordAuth = () => {
    window.location.href = `${BACKEND_URL}/api/auth/discord/apply`;
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (step === 3 && form.play_times.length === 0) {
      setError('Please select at least one preferred play time.');
      return;
    }
    setError('');
    if (step < 4) { setStep(s => (s + 1) as Step); return; }
    submit();
  };

  const submit = async () => {
    if (!form.rules_acknowledged) { setError('Please acknowledge the server rules.'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        full_name: form.full_name,
        discord: discordUsername,
        discord_id: discordId || undefined,
        discord_username: discordUsername || undefined,
        discord_avatar: discordAvatar || undefined,
        age: Number(form.age),
        timezone: form.timezone,
        experience: `[RP Level: ${form.rp_level}]\n\n${form.experience}`,
        why_join: form.why_join,
        availability: `${form.availability} — Preferred times: ${form.play_times.join(', ')}`,
        referral: `Character background: ${form.character_background} | Previous bans: ${form.previous_bans}`,
      };
      const res = await api.post('/applications', payload);
      setSubmittedId(res.data.id);
      setSubmitted(true);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const refreshStatus = async () => {
    if (!discordId) return;
    setCheckingExisting(true);
    try {
      const r = await api.get('/applications/track', { params: { discord_id: discordId } });
      setExisting(r.data);
    } catch { setExisting(null); }
    finally { setCheckingExisting(false); }
  };

  // Shared Discord SVG icon
  const DiscordIcon = ({ size = 5 }: { size?: number }) => (
    <svg className={`w-${size} h-${size}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#06060a' }}>

      {/* ── LEFT PANEL — Branding ─────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0a0614 0%,#08050f 50%,#050308 100%)' }}>

        {/* Glow orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:'absolute', top:'15%', left:'20%', width:'500px', height:'500px', borderRadius:'50%',
            background:'radial-gradient(circle,rgba(168,85,247,0.22) 0%,rgba(124,58,237,0.10) 40%,transparent 70%)', filter:'blur(40px)' }} />
          <div style={{ position:'absolute', bottom:'10%', right:'10%', width:'320px', height:'320px', borderRadius:'50%',
            background:'radial-gradient(circle,rgba(236,72,153,0.14) 0%,transparent 70%)', filter:'blur(50px)' }} />
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage:'linear-gradient(rgba(168,85,247,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,0.6) 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow:'0 0 20px rgba(168,85,247,0.40)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight">NextAirs MDT</div>
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color:'#a855f7' }}>Melbourne Police Force</div>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.22)', color:'#4ade80' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Applications Open
          </div>

          <h1 className="text-[62px] font-black text-center leading-none mb-6 select-none"
            style={{ letterSpacing:'-0.03em' }}>
            <span className="text-white">Join </span>
            <span style={{ background:'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', filter:'drop-shadow(0 0 30px rgba(168,85,247,0.45))' }}>Melbourne</span>
            <br />
            <span className="text-white">Police Force</span>
          </h1>

          <p className="text-slate-500 text-center text-sm leading-relaxed max-w-sm">
            Australia's most immersive FiveM police roleplay experience. Leadership personally reviews every application.
          </p>

          {/* Stats */}
          <div className="flex items-center gap-10 mt-10">
            {[
              { v:'24–72h',         l:'Review Time',       c:'#a855f7' },
              { v:'Discord',        l:'Required',          c:'#818cf8' },
              { v:'General Duties', l:'Starting Division', c:'#22c55e' },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-black" style={{ color:s.c }}>{s.v}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Strict Whitelisting','FTO Training Program','Custom Police Scripts','Realistic Procedures','Active Leadership'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.20)', color:'rgba(168,85,247,0.80)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 p-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow:'0 0 6px rgba(34,197,94,0.8)' }} />
            <span className="text-xs font-mono text-slate-600">RECRUITING NOW</span>
          </div>
          <span className="text-xs font-mono text-slate-700">NextAirs v2.0 · FIVEM CAD</span>
        </div>

        {/* Right border */}
        <div className="absolute top-0 right-0 w-px h-full"
          style={{ background:'linear-gradient(180deg,transparent,rgba(168,85,247,0.25) 30%,rgba(168,85,247,0.25) 70%,transparent)' }} />
      </div>

      {/* ── RIGHT PANEL — Form ────────────────────────────── */}
      <div className="flex-1 lg:max-w-[480px] flex flex-col relative overflow-y-auto"
        style={{ background:'#08060e' }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between px-6 h-14" style={{ borderBottom:'1px solid rgba(168,85,247,0.10)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-black text-sm">NextAirs MDT</span>
          </div>
          <a href="/login" className="text-xs text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-1">
            Officer login <ChevronRight className="w-3 h-3" />
          </a>
        </div>

        {/* Right panel glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:'280px', height:'280px', borderRadius:'50%',
            background:'radial-gradient(circle,rgba(168,85,247,0.07) 0%,transparent 70%)', filter:'blur(40px)' }} />
        </div>

        <div className={`relative z-10 flex-1 flex flex-col justify-center p-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="w-full max-w-sm mx-auto">

            {/* ── Loading existing application check ── */}
            {checkingExisting && (
              <div className="glass rounded-2xl p-8 text-center mb-4">
                <Loader className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Checking for existing application…</p>
              </div>
            )}

            {/* ── Existing application status ── */}
            {!checkingExisting && existing && !submitted && (() => {
              const cfg = STATUS_CONFIG[existing.status] ?? STATUS_CONFIG.pending;
              const stages = ['Submitted', 'Under Review', 'Interview', 'Decision'];
              return (
                <div className="space-y-4">
                  {/* Discord banner */}
                  <div className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)' }}>
                    {discordAvatar
                      ? <img src={discordAvatar} alt="" className="w-8 h-8 rounded-full" />
                      : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>{discordUsername[0]?.toUpperCase()}</div>
                    }
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">@{discordUsername}</p>
                      <p className="text-xs text-indigo-400">Signed in with Discord</p>
                    </div>
                    <button onClick={refreshStatus} className="text-slate-500 hover:text-cyan-400 transition-colors p-1">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="glass rounded-2xl p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-white text-lg">Your Application</h2>
                        <p className="text-xs text-slate-500">Submitted {new Date(existing.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold"
                        style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                        {cfg.label}
                      </div>
                    </div>

                    {/* Status message */}
                    <div className="p-4 rounded-xl text-sm" style={{ background: `${cfg.color}0d`, border: `1px solid ${cfg.color}25` }}>
                      <div className="flex items-start gap-2">
                        {existing.status === 'denied'
                          ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                          : <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                        }
                        <span className="text-slate-300 leading-relaxed">{cfg.desc}</span>
                      </div>
                    </div>

                    {/* Progress timeline */}
                    {existing.status !== 'denied' && (
                      <div className="space-y-2">
                        {stages.map((stage, i) => {
                          const done   = cfg.step > i;
                          const active = cfg.step === i;
                          return (
                            <div key={stage} className="flex items-center gap-3 py-1">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
                                style={{
                                  background: done ? '#22c55e20' : active ? `${cfg.color}20` : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${done ? '#22c55e50' : active ? `${cfg.color}50` : 'rgba(255,255,255,0.07)'}`,
                                  color: done ? '#22c55e' : active ? cfg.color : '#334155',
                                }}>
                                {done ? '✓' : i + 1}
                              </div>
                              <div className="flex-1">
                                <span className={`text-sm font-medium ${done || active ? 'text-white' : 'text-slate-600'}`}>{stage}</span>
                                {active && <span className="ml-2 text-xs" style={{ color: cfg.color }}>← Current</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reviewed date */}
                    {existing.reviewed_at && (
                      <p className="text-xs text-slate-600 pt-1 border-t border-white/5">
                        Reviewed {new Date(existing.reviewed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}

                    {/* Login button if approved */}
                    {existing.status === 'approved' && (
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
                </div>
              );
            })()}

            {/* ── No existing application — show form or Discord gate ── */}
            {!checkingExisting && !existing && (
              submitted ? (
                /* Success */
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.35)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Application Submitted!</h2>
                  <p className="text-slate-400 mb-6">
                    Thanks <span className="text-cyan-400 font-semibold">{form.full_name}</span>. Leadership will be in touch via Discord.
                  </p>
                  <div className="glass rounded-xl p-4 mb-6 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Application ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-cyan-400 font-mono text-xs flex-1 break-all">{submittedId}</code>
                      <button onClick={() => navigator.clipboard.writeText(submittedId)}
                        className="text-xs text-slate-500 hover:text-cyan-400 px-2 py-1 rounded border border-slate-700">Copy</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-4 text-left space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" /><span>24–72 hour review time</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Users className="w-3.5 h-3.5" /><span>You may be invited to an interview if shortlisted</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Star className="w-3.5 h-3.5" /><span>Approved applicants start at Academy · Recruit</span></div>
                  </div>
                  <p className="text-xs text-slate-600 mt-4">Come back to this page and sign in with Discord to check your status at any time.</p>
                </div>
              ) : !discordAuthed ? (
                /* Discord gate */
                <div className="space-y-4">
                  {/* Header card */}
                  <div className="rounded-2xl p-8 text-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(168,85,247,0.08))', border: '1px solid rgba(168,85,247,0.22)' }}>
                    {/* Glow behind icon */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
                      style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.25) 0%,transparent 70%)', filter: 'blur(20px)' }} />
                    {/* Icon */}
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 8px 32px rgba(168,85,247,0.50)' }}>
                      <DiscordIcon size={8} />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 tracking-tight">Connect Your Discord</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Required to apply. Already applied? We'll pull up your status automatically.
                    </p>
                  </div>

                  {/* Feature pills */}
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: Zap,           label: 'One click — no password needed',       color: '#a855f7' },
                      { icon: Lock,          label: 'Only accesses your username & avatar',  color: '#818cf8' },
                      { icon: MessageCircle, label: 'Get status updates directly in your DMs', color: '#22c55e' },
                    ].map(f => (
                      <div key={f.label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="p-1.5 rounded-lg flex-shrink-0"
                          style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                          <f.icon className="w-3.5 h-3.5" style={{ color: f.color }} />
                        </div>
                        <span className="text-sm text-slate-400">{f.label}</span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                  )}

                  {/* CTA */}
                  <button onClick={handleDiscordAuth}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#c026d3)', boxShadow: '0 8px 32px rgba(168,85,247,0.40)', border: '1px solid rgba(168,85,247,0.40)', letterSpacing: '-0.01em' }}>
                    <DiscordIcon size={5} />
                    Continue with Discord
                  </button>
                </div>
              ) : (
                /* Multi-step application form */
                <>
                  {/* Discord banner */}
                  <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
                    style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)' }}>
                    {discordAvatar
                      ? <img src={discordAvatar} alt="" className="w-8 h-8 rounded-full" />
                      : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>{discordUsername[0]?.toUpperCase()}</div>
                    }
                    <div>
                      <p className="text-sm font-semibold text-white">@{discordUsername}</p>
                      <p className="text-xs text-indigo-400">Discord connected ✓</p>
                    </div>
                  </div>

                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-1 mb-6">
                    {STEPS.map((s, i) => (
                      <div key={s.n} className="flex items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'text-white' : 'bg-slate-800 text-slate-500'
                          }`} style={step === s.n ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)' } : {}}>
                            {step > s.n ? '✓' : s.n}
                          </div>
                          <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`w-6 h-px mx-1 ${step > s.n ? 'bg-purple-500/50' : 'bg-slate-800'}`} />}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl p-8" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.14)' }}>
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                      </div>
                    )}

                    <form onSubmit={next} className="space-y-5">

                      {/* ── Step 1: About You ── */}
                      {step === 1 && (
                        <>
                          <h2 className="text-base font-bold text-white mb-4">About You</h2>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name <span className="text-rose-400">*</span></label>
                            <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                              placeholder="James Smith" className="nx-input" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
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
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Roleplay Experience Level <span className="text-rose-400">*</span></label>
                            <select required value={form.rp_level} onChange={e => set('rp_level', e.target.value)}
                              className="nx-input" style={{ colorScheme: 'dark' }}>
                              {RP_LEVEL.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Have you ever had any Staff Actions from Next RP? <span className="text-rose-400">*</span></label>
                            <select required value={form.previous_bans} onChange={e => set('previous_bans', e.target.value)}
                              className="nx-input" style={{ colorScheme: 'dark' }}>
                              <option>No</option>
                              <option>Yes (will be discussed in interview)</option>
                            </select>
                          </div>
                        </>
                      )}

                      {/* ── Step 2: Experience ── */}
                      {step === 2 && (
                        <>
                          <h2 className="text-base font-bold text-white mb-4">Experience & Motivation</h2>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Previous FiveM Police Experience</label>
                            <textarea rows={3} value={form.experience} onChange={e => set('experience', e.target.value)}
                              placeholder="Server names, ranks held, length of service. Write 'None' if first time."
                              className="nx-input resize-none" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Why do you want to join Next RP Police? <span className="text-rose-400">*</span></label>
                            <textarea required rows={4} value={form.why_join} onChange={e => set('why_join', e.target.value)}
                              placeholder="Tell us why you want to join, what you can contribute, and your goals within the department. Minimum 3 sentences."
                              className="nx-input resize-none" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Character Background / Backstory <span className="text-rose-400">*</span></label>
                            <textarea required rows={4} value={form.character_background} onChange={e => set('character_background', e.target.value)}
                              placeholder="Tell us about your character's background — their history, motivation for joining the police, personality traits, etc."
                              className="nx-input resize-none" />
                          </div>
                        </>
                      )}

                      {/* ── Step 3: Availability ── */}
                      {step === 3 && (
                        <>
                          <h2 className="text-base font-bold text-white mb-4">Availability</h2>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Weekly Hours Available</label>
                            <select value={form.availability} onChange={e => set('availability', e.target.value)}
                              className="nx-input" style={{ colorScheme: 'dark' }}>
                              {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Preferred Play Times <span className="text-rose-400">*</span></label>
                            <p className="text-xs text-slate-600 mb-3">Select all that apply (AEST timezone)</p>
                            <div className="space-y-2">
                              {TIME_SLOTS.map(slot => (
                                <button key={slot} type="button" onClick={() => togglePlayTime(slot)}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${
                                    form.play_times.includes(slot) ? 'text-white' : 'text-slate-400 hover:text-slate-300'
                                  }`}
                                  style={{
                                    background: form.play_times.includes(slot) ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${form.play_times.includes(slot) ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.06)'}`,
                                  }}>
                                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                                    form.play_times.includes(slot) ? '' : 'bg-slate-800 border border-slate-700'
                                  }`} style={form.play_times.includes(slot) ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)' } : {}}>
                                    {form.play_times.includes(slot) && <CheckCircle className="w-3 h-3 text-white" />}
                                  </div>
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── Step 4: Review & Submit ── */}
                      {step === 4 && (
                        <>
                          <h2 className="text-base font-bold text-white mb-4">Review & Submit</h2>
                          <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.14)' }}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Application Summary</p>
                            {[
                              { l: 'Name',         v: form.full_name },
                              { l: 'Discord',      v: `@${discordUsername}` },
                              { l: 'Age',          v: form.age },
                              { l: 'Timezone',     v: form.timezone },
                              { l: 'RP Level',     v: form.rp_level.split(' (')[0] },
                              { l: 'Availability', v: form.availability },
                              { l: 'Play Times',   v: form.play_times.length ? form.play_times.map(s => s.split(' (')[0]).join(', ') : 'None selected' },
                            ].map(r => (
                              <div key={r.l} className="flex justify-between gap-4">
                                <span className="text-slate-500 text-xs flex-shrink-0">{r.l}</span>
                                <span className="text-white text-xs font-medium text-right">{r.v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Rules acknowledgement */}
                          <button type="button" onClick={() => set('rules_acknowledged', !form.rules_acknowledged)}
                            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all ${
                              form.rules_acknowledged ? 'text-white' : 'text-slate-400'
                            }`}
                            style={{
                              background: form.rules_acknowledged ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${form.rules_acknowledged ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                              form.rules_acknowledged ? 'bg-green-500' : 'bg-slate-800 border border-slate-700'
                            }`}>
                              {form.rules_acknowledged && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span>I confirm all information is accurate and I have read and agree to abide by the Next RP server rules. False applications will result in a permanent ban.</span>
                          </button>
                        </>
                      )}

                      <div className="flex gap-3 pt-2">
                        {step > 1 && (
                          <button type="button" onClick={() => { setError(''); setStep(s => (s - 1) as Step); }}
                            className="btn-ghost flex-1 py-3">Back</button>
                        )}
                        <button type="submit" disabled={loading}
                          className="flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                          style={{ background: loading ? '#1e293b' : 'linear-gradient(135deg,#7c3aed,#a855f7,#c026d3)', border: '1px solid rgba(168,85,247,0.35)', boxShadow: loading ? 'none' : '0 4px 20px rgba(168,85,247,0.30)' }}>
                          {loading
                            ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            : step < 4
                              ? <>Next <ChevronRight className="w-4 h-4" /></>
                              : 'Submit Application'}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

