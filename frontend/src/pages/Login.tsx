import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertCircle, UserX, XCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api')
  .replace(/\/api\/?$/, '');

const FEATURES = [
  { text: 'Real-time CAD dispatch & command', icon: '📡' },
  { text: 'Divisions: Academy · GD · Highway · CIRT · SOG', icon: '🏛️' },
  { text: 'Recruit FTO tracking & sign-off', icon: '🎓' },
  { text: 'Shift logging & duty analytics', icon: '📊' },
  { text: 'Warrant & BOLO management', icon: '🚨' },
  { text: 'Full leadership command centre', icon: '⚡' },
];

const DISCORD_ERRORS: Record<string, { icon: typeof AlertCircle; msg: string }> = {
  no_account:     { icon: UserX,       msg: 'No officer account linked to your Discord. Contact leadership to get access.' },
  terminated:     { icon: XCircle,     msg: 'Your account has been terminated. Contact an administrator.' },
  cancelled:      { icon: AlertCircle, msg: 'Discord sign-in was cancelled.' },
  server_error:   { icon: AlertCircle, msg: 'Server error during sign-in. Check Railway logs — the exact error is printed there.' },
  token_failed:   { icon: AlertCircle, msg: 'Discord rejected the login. Redirect URI or Client Secret may be misconfigured in Railway.' },
  not_configured: { icon: AlertCircle, msg: 'Discord OAuth is not configured. Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL and FRONTEND_URL in Railway.' },
  already_linked: { icon: AlertCircle, msg: 'That Discord account is already linked to another officer.' },
};

export default function Login() {
  const [featureIdx, setFeatureIdx]   = useState(0);
  const [showAdmin, setShowAdmin]     = useState(false);
  const [form, setForm]               = useState({ username: '', password: '' });
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [errorCode, setErrorCode]     = useState('');
  const [discordTag, setDiscordTag]   = useState('');
  const [mounted, setMounted]         = useState(false);

  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setFeatureIdx(i => (i + 1) % FEATURES.length), 2800);
    const de = params.get('discord_error');
    if (de) {
      const tag = params.get('discord_tag');
      if (tag) setDiscordTag(decodeURIComponent(tag));
      setErrorCode(de);
      setError(DISCORD_ERRORS[de]?.msg ?? 'Discord sign-in failed.');
      window.history.replaceState({}, '', '/login');
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

  const ErrorIcon = error ? (DISCORD_ERRORS[errorCode]?.icon ?? AlertCircle) : AlertCircle;

  return (
    <div className="min-h-screen flex" style={{ background: '#060810' }}>

      {/* ── Left panel — branding ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(145deg, #060d1f 0%, #050a18 40%, #07090f 100%)' }}>

        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full -top-40 -left-40 opacity-30 animate-orb-drift"
            style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 65%)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full bottom-0 right-0 opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 65%)', animationDelay: '4s' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 animate-pulse-slow"
            style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 65%)' }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-glow-blue"
                style={{ background: 'linear-gradient(135deg, #0284c7, #6366f1)' }}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 bg-green-400 animate-pulse"
                style={{ borderColor: '#060d1f', boxShadow: '0 0 8px rgba(34,197,94,0.9)' }} />
            </div>
            <div>
              <div className="text-white font-black text-xl tracking-tight">NextAirs</div>
              <div className="text-[11px] font-mono tracking-widest uppercase" style={{ color: '#0ea5e9' }}>Next RP · Melbourne Police</div>
            </div>
          </div>

          {/* Hero text */}
          <div className="mt-auto mb-auto pt-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.20)', color: '#38bdf8' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              FiveM CAD / MDT System v2.0
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              The Command<br />
              <span className="text-gradient">Platform</span> for<br />
              Next RP Police
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-md">
              A fully integrated CAD, MDT and leadership management system built for Melbourne's finest. Everything you need, in one place.
            </p>

            {/* Animated feature */}
            <div className="mt-8 p-4 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.14)' }}>
              <div className="flex items-center gap-3 animate-fade-in" key={featureIdx}>
                <span className="text-2xl">{FEATURES[featureIdx].icon}</span>
                <p className="text-slate-300 text-sm font-medium">{FEATURES[featureIdx].text}</p>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1.5 mt-3">
                {FEATURES.map((_, i) => (
                  <div key={i} className="h-0.5 rounded-full transition-all duration-500 flex-1"
                    style={{ background: i === featureIdx ? '#0ea5e9' : 'rgba(14,165,233,0.18)' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 font-mono">© 2026 Next RP Melbourne</span>
            <a href="/apply" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-400 transition-colors">
              Apply to join <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto"
        style={{ background: '#07090f' }}>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-6 pb-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow-blue"
            style={{ background: 'linear-gradient(135deg, #0284c7, #6366f1)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-black text-base">NextAirs</div>
            <div className="text-[10px] font-mono text-sky-500">NEXT RP · MELPOL</div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className={`w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white mb-1">Secure Access</h2>
              <p className="text-slate-500 text-sm">Authorised personnel only. All access is logged.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-xl animate-fade-in"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <ErrorIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                  {discordTag && (
                    <p className="text-slate-500 text-xs mt-1">Your Discord: <span className="font-mono text-slate-400">{discordTag}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Discord login */}
            <div className="space-y-3 mb-6">
              <button onClick={handleDiscordLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #5b63f5, #7c3aed)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}>
                <svg width="22" height="22" viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 49.9626 12.3413 52.7148 18.1147 54.5717C18.2071 54.6004 18.305 54.5662 18.3638 54.4899C19.7295 52.5754 20.9469 50.5535 21.9907 48.4296C22.0523 48.3062 21.9935 48.1601 21.8676 48.1151C19.9366 47.3921 18.0979 46.5084 16.3292 45.5006C16.1893 45.4191 16.1781 45.2241 16.3068 45.1285C16.679 44.8518 17.0513 44.5637 17.4067 44.2728C17.471 44.2193 17.5606 44.2079 17.6362 44.2418C29.2558 49.6202 41.8354 49.6202 53.3179 44.2418C53.3935 44.2051 53.4831 44.2165 53.5502 44.27C53.9057 44.5609 54.2779 44.8518 54.6529 45.1285C54.7816 45.2241 54.7732 45.4191 54.6333 45.5006C52.8646 46.5283 51.0259 47.3921 49.0921 48.1123C48.9662 48.1573 48.9102 48.3062 48.9718 48.4296C50.0384 50.5506 51.2558 52.5725 52.5959 54.487C52.6519 54.5662 52.7526 54.6004 52.845 54.5717C58.6464 52.7148 64.529 49.9626 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
                </svg>
                Sign in with Discord
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: 'rgba(14,165,233,0.10)' }} />
              <span className="text-xs text-slate-600 font-medium">or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(14,165,233,0.10)' }} />
            </div>

            {/* Admin/Leadership bypass */}
            {!showAdmin ? (
              <button onClick={() => setShowAdmin(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-400 transition-colors"
                style={{ border: '1px solid rgba(14,165,233,0.08)' }}>
                <Lock className="w-3.5 h-3.5" />
                Leadership bypass login
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leadership Access</span>
                  <button type="button" onClick={() => setShowAdmin(false)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Cancel</button>
                </div>
                <input
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="Username"
                  autoComplete="username"
                  className="nx-input"
                  style={{ fontSize: '15px' }}
                />
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="nx-input pr-11"
                    style={{ fontSize: '15px' }}
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading || !form.username || !form.password}
                  className="btn-primary w-full">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>
            )}

            {/* Info box */}
            <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.09)' }}>
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="text-slate-400 font-semibold">Don't have access? </span>
                Officer accounts are created when your application is approved.{' '}
                <a href="/apply" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">Apply here</a> to join Next RP Police.
              </p>
            </div>

            <p className="text-center text-[11px] text-slate-700 mt-6 font-mono">
              Next RP · Melbourne, Australia · FiveM CAD v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
