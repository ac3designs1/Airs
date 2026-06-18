import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertCircle, UserX, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api')
  .replace(/\/api\/?$/, '');

const FEATURES = [
  'Real-time CAD dispatch system',
  'Divisions: Academy · GD · Highway · CIRT · SOG',
  'Recruit training & FTO tracker',
  'Shift logging & duty analytics',
  'Warrant & BOLO management',
  'Promotions, strikes & leave management',
];

const DISCORD_ERRORS: Record<string, { icon: typeof AlertCircle; msg: string }> = {
  no_account:   { icon: UserX,       msg: 'No officer account is linked to your Discord. Contact leadership to get access.' },
  terminated:   { icon: XCircle,     msg: 'Your account has been terminated. Contact an administrator.' },
  cancelled:    { icon: AlertCircle, msg: 'Discord sign-in was cancelled.' },
  server_error: { icon: AlertCircle, msg: 'Access denied. Please contact leadership.' },
  already_linked: { icon: AlertCircle, msg: 'That Discord account is already linked to another officer.' },
};

export default function Login() {
  const [mounted, setMounted]         = useState(false);
  const [featureIdx, setFeatureIdx]   = useState(0);
  const [showAdmin, setShowAdmin]     = useState(false);
  const [form, setForm]               = useState({ username: '', password: '' });
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [discordTag, setDiscordTag]   = useState('');

  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setFeatureIdx(i => (i + 1) % FEATURES.length), 2800);

    // Handle Discord OAuth error params
    const de = params.get('discord_error');
    if (de) {
      const tag = params.get('discord_tag');
      if (tag) setDiscordTag(decodeURIComponent(tag));
      setError(DISCORD_ERRORS[de]?.msg ?? 'Discord sign-in failed.');
    }

    return () => clearInterval(t);
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/discord/login`;
  };

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return;
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      nav('/dashboard');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const ErrorIcon = error ? (DISCORD_ERRORS[params.get('discord_error') ?? '']?.icon ?? AlertCircle) : AlertCircle;

  return (
    <div className="min-h-screen flex" style={{ background: '#07090f' }}>

      {/* ── Left Hero Panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(to top, #07090f, transparent)' }} />
        <div className="absolute top-32 left-16 w-64 h-64 rounded-full pointer-events-none animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08), transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-48 right-8 w-48 h-48 rounded-full pointer-events-none animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 70%)', filter: 'blur(30px)', animationDelay: '1.5s' }} />

        {/* Logo */}
        <div className={`relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-blue"
                style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 animate-pulse"
                style={{ borderColor: '#07090f', boxShadow: '0 0 8px rgba(34,197,94,0.8)' }} />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">NextAirs</span>
              <div className="text-xs font-mono" style={{ color: '#0ea5e9' }}>NEXT RP · MELPOL CAD</div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className={`relative z-10 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative mb-10 w-fit">
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 rounded-full border-2 border-dashed animate-spin-slow"
                style={{ borderColor: 'rgba(14,165,233,0.20)' }} />
              <div className="absolute inset-3 rounded-full border animate-spin-slow-r"
                style={{ borderColor: 'rgba(14,165,233,0.15)' }} />
              <div className="absolute inset-6 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.3), rgba(14,165,233,0.15))', border: '1px solid rgba(14,165,233,0.3)' }}>
                <Shield className="w-8 h-8 animate-pulse-slow" style={{ color: '#38bdf8' }} />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-3">
            Next RP<br />
            <span className="text-gradient text-4xl">Internal System</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-md leading-relaxed">
            Australia's premier FiveM roleplay CAD — real-time dispatch, warrants, roster management and more.
          </p>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <div className="h-5 overflow-hidden relative w-64">
              {FEATURES.map((f, i) => (
                <div key={f} className="transition-all duration-500 text-sm text-slate-300 absolute w-full"
                  style={{ transform: `translateY(${(i - featureIdx) * 20}px)`, opacity: i === featureIdx ? 1 : 0 }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom status */}
        <div className={`relative z-10 flex items-center gap-6 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {['CAD Online', 'Dispatch Active', 'MELPOL Connected'].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
              <span className="text-slate-500 text-xs font-mono">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ───────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 py-10 relative overflow-y-auto"
        style={{ background: 'rgba(5,7,14,0.97)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-px hidden lg:block"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(14,165,233,0.2) 30%, rgba(14,165,233,0.2) 70%, transparent)' }} />

        <div className={`w-full max-w-sm transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">NextAirs</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Secure Access</h2>
            <p className="text-slate-500 text-sm">Authorised personnel only. All access is logged.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <ErrorIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {discordTag && (
                  <p className="mt-1 text-xs text-red-300/60">
                    Discord: <span className="font-mono text-red-300">{discordTag}</span> — show this to leadership.
                  </p>
                )}
              </div>
            </div>
          )}

          {!showAdmin ? (
            <>
              {/* Discord Login */}
              <button onClick={handleDiscordLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)', boxShadow: '0 0 24px rgba(88,101,242,0.35)', border: '1px solid rgba(88,101,242,0.4)' }}>
                {/* Discord icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Sign in with Discord
              </button>

              <div className="mt-6 p-4 rounded-xl text-xs text-slate-500 leading-relaxed"
                style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.08)' }}>
                <p className="font-semibold text-slate-400 mb-1">Don't have access yet?</p>
                <p>Officer accounts are created when your application is approved. <a href="/apply" className="text-sky-400 hover:underline">Apply here</a> to join Next RP Police.</p>
              </div>

              {/* Hidden admin bypass */}
              <button onClick={() => setShowAdmin(true)}
                className="mt-8 w-full text-center text-[10px] font-mono text-slate-700 hover:text-slate-500 transition-colors">
                ⬡ leadership access
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500/70">⚠ Leadership / Emergency Access</span>
                <button onClick={() => setShowAdmin(false)} className="text-xs text-slate-600 hover:text-slate-400">← Back</button>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="username" required className="nx-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••" required className="nx-input pr-11" />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sky-400 transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Access System</>}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-slate-600 text-xs mt-8">
            Next RP · Melbourne, Australia · FiveM CAD v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
