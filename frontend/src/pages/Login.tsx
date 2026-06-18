import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, UserX, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api')
  .replace(/\/api\/?$/, '');

const DISCORD_ERRORS: Record<string, string> = {
  no_account:     'No officer account is linked to your Discord. Contact leadership to get set up.',
  terminated:     'Your account has been terminated. Contact an administrator.',
  cancelled:      'Discord sign-in was cancelled.',
  server_error:   'A server error occurred during sign-in. Check Railway logs.',
  token_failed:   'Discord rejected the login. Verify DISCORD_CLIENT_SECRET in Railway.',
  not_configured: 'Discord OAuth is not configured on the server. Set up Railway environment variables.',
  already_linked: 'That Discord account is already linked to another officer.',
};

export default function Login() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [tapCount,  setTapCount]  = useState(0);
  const [form, setForm]           = useState({ username: '', password: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [mounted, setMounted]     = useState(false);

  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    setMounted(true);
    const de = params.get('discord_error');
    if (de) {
      const tag = params.get('discord_tag');
      if (tag) setDiscordTag(decodeURIComponent(tag));
      setError(DISCORD_ERRORS[de] ?? 'Discord sign-in failed. Please try again.');
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

  return (
    <div className="min-h-screen flex" style={{ background: '#060b18' }}>

      {/* ── Left panel — Branding ─────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #07112b 0%, #060d1f 50%, #04091a 100%)' }}>

        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        </div>

        {/* Top left logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0891b2,#1d4ed8)', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight">NextAirs MDT</div>
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: '#06b6d4' }}>Melbourne Police Force</div>
            </div>
          </div>
        </div>

        {/* Centre content */}
        <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Big shield */}
          <div className="relative mb-10">
            <div className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.20) 0%, transparent 70%)', filter: 'blur(20px)', transform: 'scale(1.5)' }} />
            <div className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #1d4ed8 100%)',
                boxShadow: '0 0 40px rgba(6,182,212,0.4), 0 0 80px rgba(6,182,212,0.15)',
              }}>
              <Shield className="w-14 h-14 text-white" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-4xl font-black text-white text-center leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Next RP<br />
            <span style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Police Force
            </span>
          </h1>
          <p className="text-slate-400 text-center text-base leading-relaxed max-w-sm">
            Melbourne's premier FiveM law enforcement CAD & MDT system. Secure, real-time, and built for serious roleplay.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Live Dispatch','Officer Roster','Warrant System','FTO Training','Certifications','Shift Tracking'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)', color: 'rgba(6,182,212,0.80)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 p-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
            <span className="text-xs font-mono text-slate-600">SYSTEM ONLINE</span>
          </div>
          <span className="text-xs font-mono text-slate-700">NextAirs v2.0 · FIVEM CAD</span>
        </div>

        {/* Right border fade */}
        <div className="absolute top-0 right-0 w-px h-full"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(6,182,212,0.20) 30%, rgba(6,182,212,0.20) 70%, transparent)' }} />
      </div>

      {/* ── Right panel — Login form ──────────────────────── */}
      <div className="flex-1 lg:max-w-[440px] flex flex-col items-center justify-center p-8 relative"
        style={{ background: '#080d1a' }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0891b2,#1d4ed8)', boxShadow: '0 0 18px rgba(6,182,212,0.3)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-black text-base">NextAirs MDT</div>
            <div className="text-[10px] font-mono" style={{ color: '#06b6d4' }}>NEXT RP · MELBOURNE</div>
          </div>
        </div>

        <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-1.5">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to access the MDT system.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-6 animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium leading-snug">{error}</p>
                {discordTag && <p className="text-xs text-slate-600 mt-1 font-mono">Discord: {discordTag}</p>}
              </div>
            </div>
          )}

          {/* Discord CTA */}
          <button onClick={handleDiscordLogin}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] mb-4"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #5b63f5 100%)',
              boxShadow: '0 8px 32px rgba(79,70,229,0.40), 0 2px 8px rgba(0,0,0,0.4)',
              border: '1px solid rgba(99,102,241,0.50)',
              letterSpacing: '-0.01em',
            }}>
            <svg width="22" height="22" viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 49.9626 12.3413 52.7148 18.1147 54.5717C18.2071 54.6004 18.305 54.5662 18.3638 54.4899C19.7295 52.5754 20.9469 50.5535 21.9907 48.4296C22.0523 48.3062 21.9935 48.1601 21.8676 48.1151C19.9366 47.3921 18.0979 46.5084 16.3292 45.5006C16.1893 45.4191 16.1781 45.2241 16.3068 45.1285C16.679 44.8518 17.0513 44.5637 17.4067 44.2728C17.471 44.2193 17.5606 44.2079 17.6362 44.2418C29.2558 49.6202 41.8354 49.6202 53.3179 44.2418C53.3935 44.2051 53.4831 44.2165 53.5502 44.27C53.9057 44.5609 54.2779 44.8518 54.6529 45.1285C54.7816 45.2241 54.7732 45.4191 54.6333 45.5006C52.8646 46.5283 51.0259 47.3921 49.0921 48.1123C48.9662 48.1573 48.9102 48.3062 48.9718 48.4296C50.0384 50.5506 51.2558 52.5725 52.5959 54.487C52.6519 54.5662 52.7526 54.6004 52.845 54.5717C58.6464 52.7148 64.529 49.9626 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
            </svg>
            Sign in with Discord
          </button>

          <p className="text-center text-xs text-slate-600 mb-6">
            Don't have an account?{' '}
            <a href="/apply" className="font-bold transition-colors" style={{ color: '#06b6d4' }}>Apply to join →</a>
          </p>

          {/* Hidden admin bypass — click "All access is monitored" 5× */}
          {showAdmin && (
            <div className="animate-fade-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(6,182,212,0.10)' }} />
                <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Leadership Access</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(6,182,212,0.10)' }} />
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3">
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
                <button type="button" onClick={() => setShowAdmin(false)}
                  className="w-full text-center text-xs text-slate-700 hover:text-slate-500 transition-colors py-1">
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Hidden trigger */}
          <div className="mt-8 text-center">
            <button
              onClick={() => { const n = tapCount + 1; setTapCount(n); if (n >= 5) { setShowAdmin(true); setTapCount(0); } }}
              className="text-[10px] font-mono text-slate-800 hover:text-slate-800 select-none cursor-default"
              style={{ background: 'none', border: 'none', padding: 0 }}>
              All access is monitored and logged
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
