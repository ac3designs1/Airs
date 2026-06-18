import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertCircle, UserX, XCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api')
  .replace(/\/api\/?$/, '');

const DISCORD_ERRORS: Record<string, { icon: typeof AlertCircle; msg: string }> = {
  no_account:     { icon: UserX,       msg: 'No officer account linked to your Discord. Contact leadership.' },
  terminated:     { icon: XCircle,     msg: 'Your account has been terminated. Contact an administrator.' },
  cancelled:      { icon: AlertCircle, msg: 'Discord sign-in was cancelled.' },
  server_error:   { icon: AlertCircle, msg: 'Server error during sign-in. Check Railway logs for the exact error.' },
  token_failed:   { icon: AlertCircle, msg: 'Discord rejected the login. Check DISCORD_CLIENT_SECRET and BACKEND_URL in Railway.' },
  not_configured: { icon: AlertCircle, msg: 'Discord OAuth not configured on server. Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL, FRONTEND_URL in Railway.' },
  already_linked: { icon: AlertCircle, msg: 'That Discord account is already linked to another officer.' },
};

export default function Login() {
  const [showAdmin, setShowAdmin]   = useState(false);
  const [form, setForm]             = useState({ username: '', password: '' });
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [errorCode, setErrorCode]   = useState('');
  const [discordTag, setDiscordTag] = useState('');

  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const de = params.get('discord_error');
    if (de) {
      const tag = params.get('discord_tag');
      if (tag) setDiscordTag(decodeURIComponent(tag));
      setErrorCode(de);
      setError(DISCORD_ERRORS[de]?.msg ?? 'Discord sign-in failed.');
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/discord/login`;
  };

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return;
    setError(''); setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      nav('/dashboard');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const ErrorIcon = error ? (DISCORD_ERRORS[errorCode]?.icon ?? AlertCircle) : AlertCircle;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'linear-gradient(160deg, #04080f 0%, #060c1a 50%, #05091a 100%)' }}>

      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      {/* Subtle glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />

      {/* Main card */}
      <div className="relative w-full max-w-md animate-fade-up">

        {/* Top accent line */}
        <div className="h-px w-full mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)' }} />

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0891b2, #1d4ed8)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">NextAirs MDT</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#06b6d4' }}>NEXT RP · MELBOURNE POLICE FORCE</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px #22c55e' }} />
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#0d1526', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>

          {/* Card header bar */}
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.10)', background: 'rgba(6,182,212,0.03)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(6,182,212,0.7)' }}>Secure Access</span>
              <span className="text-[10px] font-mono text-slate-600">AUTH · v2.0</span>
            </div>
          </div>

          <div className="p-6 space-y-4">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg animate-fade-in"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <ErrorIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                  {discordTag && (
                    <p className="text-xs text-slate-500 mt-1 font-mono">Discord: {discordTag}</p>
                  )}
                </div>
              </div>
            )}

            {/* Discord button */}
            <button onClick={handleDiscordLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-lg font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #5b63f5)',
                border: '1px solid rgba(99,102,241,0.45)',
                boxShadow: '0 4px 16px rgba(79,70,229,0.30)',
                fontSize: 15,
              }}>
              <svg width="20" height="20" viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 49.9626 12.3413 52.7148 18.1147 54.5717C18.2071 54.6004 18.305 54.5662 18.3638 54.4899C19.7295 52.5754 20.9469 50.5535 21.9907 48.4296C22.0523 48.3062 21.9935 48.1601 21.8676 48.1151C19.9366 47.3921 18.0979 46.5084 16.3292 45.5006C16.1893 45.4191 16.1781 45.2241 16.3068 45.1285C16.679 44.8518 17.0513 44.5637 17.4067 44.2728C17.471 44.2193 17.5606 44.2079 17.6362 44.2418C29.2558 49.6202 41.8354 49.6202 53.3179 44.2418C53.3935 44.2051 53.4831 44.2165 53.5502 44.27C53.9057 44.5609 54.2779 44.8518 54.6529 45.1285C54.7816 45.2241 54.7732 45.4191 54.6333 45.5006C52.8646 46.5283 51.0259 47.3921 49.0921 48.1123C48.9662 48.1573 48.9102 48.3062 48.9718 48.4296C50.0384 50.5506 51.2558 52.5725 52.5959 54.487C52.6519 54.5662 52.7526 54.6004 52.845 54.5717C58.6464 52.7148 64.529 49.9626 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
              </svg>
              Sign in with Discord
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(6,182,212,0.08)' }} />
              <span className="text-[11px] text-slate-600 font-mono">OR</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(6,182,212,0.08)' }} />
            </div>

            {/* Leadership bypass */}
            {!showAdmin ? (
              <button onClick={() => setShowAdmin(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-400 transition-colors"
                style={{ border: '1px solid rgba(6,182,212,0.08)' }}>
                <Lock className="w-3.5 h-3.5" />
                Leadership bypass
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="section-label">Leadership access</span>
                  <button type="button" onClick={() => { setShowAdmin(false); setError(''); }}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors">✕ Close</button>
                </div>
                <input
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="Username" autoComplete="username"
                  className="nx-input" />
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Password" autoComplete="current-password"
                    className="nx-input pr-10" />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors p-1">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading || !form.username || !form.password}
                  className="btn-primary w-full">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>
            )}
          </div>

          {/* Card footer */}
          <div className="px-6 py-3.5 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(6,182,212,0.08)', background: 'rgba(6,182,212,0.02)' }}>
            <p className="text-[11px] text-slate-600">
              No access?{' '}
              <a href="/apply" className="font-semibold transition-colors" style={{ color: '#06b6d4' }}>Apply to join</a>
            </p>
            <span className="text-[10px] font-mono text-slate-700">All access logged</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 font-mono mt-6">
          NEXT RP · MELBOURNE · FIVEM CAD v2.0 · AUTHORISED USE ONLY
        </p>
      </div>
    </div>
  );
}
