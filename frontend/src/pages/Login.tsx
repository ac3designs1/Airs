import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen flex" style={{ background: '#06060a' }}>

      {/* ── Left panel — Branding ─────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a0614 0%, #08050f 50%, #050308 100%)' }}>

        {/* Background glow orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main purple orb */}
          <div style={{
            position: 'absolute', top: '15%', left: '20%',
            width: '520px', height: '520px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, rgba(124,58,237,0.10) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          {/* Pink orb */}
          <div style={{
            position: 'absolute', bottom: '10%', right: '10%',
            width: '340px', height: '340px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }} />
          {/* Faint blue accent */}
          <div style={{
            position: 'absolute', top: '60%', left: '5%',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'linear-gradient(rgba(168,85,247,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.6) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Top left logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(168,85,247,0.40)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight">NextAirs MDT</div>
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: '#a855f7' }}>Melbourne Police Force</div>
            </div>
          </div>
        </div>

        {/* Centre hero */}
        <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Subtitle */}
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-5"
            style={{ color: 'rgba(168,85,247,0.70)' }}>
            Australian FiveM Roleplay
          </p>

          {/* Big title */}
          <h1 className="text-[72px] font-black text-center leading-none mb-6 select-none"
            style={{
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #e879f9 0%, #a855f7 40%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 40px rgba(168,85,247,0.45))',
            }}>
            NEXT RP
          </h1>

          <p className="text-slate-300 text-center text-base leading-relaxed max-w-sm font-semibold uppercase tracking-wider text-[13px]">
            Melbourne Police Force MDT
          </p>
          <p className="text-slate-600 text-center text-sm leading-relaxed max-w-sm mt-2">
            Melbourne's premier FiveM law enforcement CAD & MDT system. Secure, real-time, and built for serious roleplay.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Live Dispatch','Officer Roster','Warrant System','FTO Training','Certifications','Shift Tracking'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.20)', color: 'rgba(168,85,247,0.80)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom status */}
        <div className="relative z-10 p-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
            <span className="text-xs font-mono text-slate-600">SYSTEM ONLINE</span>
          </div>
          <span className="text-xs font-mono text-slate-700">NextAirs v2.0 · FIVEM CAD</span>
        </div>

        {/* Right border */}
        <div className="absolute top-0 right-0 w-px h-full"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(168,85,247,0.25) 30%, rgba(168,85,247,0.25) 70%, transparent)' }} />
      </div>

      {/* ── Right panel — Login form ──────────────────────── */}
      <div className="flex-1 lg:max-w-[440px] flex flex-col items-center justify-center p-8 relative"
        style={{ background: '#08060e' }}>

        {/* Background glow behind form */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 18px rgba(168,85,247,0.35)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-black text-base">NextAirs MDT</div>
            <div className="text-[10px] font-mono" style={{ color: '#a855f7' }}>NEXT RP · MELBOURNE</div>
          </div>
        </div>

        <div className={`w-full max-w-sm relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Heading */}
          <div className="mb-8 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: 'rgba(168,85,247,0.60)' }}>
              Officer Portal
            </div>
            <h2 className="text-3xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Welcome Back</h2>
            <p className="text-slate-600 text-sm">Sign in to access the MDT system.</p>
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

          {/* Discord button */}
          <button onClick={handleDiscordLogin}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] mb-3"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c026d3 100%)',
              boxShadow: '0 8px 32px rgba(168,85,247,0.40), 0 2px 8px rgba(0,0,0,0.5)',
              border: '1px solid rgba(168,85,247,0.45)',
              letterSpacing: '-0.01em',
            }}>
            <svg width="22" height="22" viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 49.9626 12.3413 52.7148 18.1147 54.5717C18.2071 54.6004 18.305 54.5662 18.3638 54.4899C19.7295 52.5754 20.9469 50.5535 21.9907 48.4296C22.0523 48.3062 21.9935 48.1601 21.8676 48.1151C19.9366 47.3921 18.0979 46.5084 16.3292 45.5006C16.1893 45.4191 16.1781 45.2241 16.3068 45.1285C16.679 44.8518 17.0513 44.5637 17.4067 44.2728C17.471 44.2193 17.5606 44.2079 17.6362 44.2418C29.2558 49.6202 41.8354 49.6202 53.3179 44.2418C53.3935 44.2051 53.4831 44.2165 53.5502 44.27C53.9057 44.5609 54.2779 44.8518 54.6529 45.1285C54.7816 45.2241 54.7732 45.4191 54.6333 45.5006C52.8646 46.5283 51.0259 47.3921 49.0921 48.1123C48.9662 48.1573 48.9102 48.3062 48.9718 48.4296C50.0384 50.5506 51.2558 52.5725 52.5959 54.487C52.6519 54.5662 52.7526 54.6004 52.845 54.5717C58.6464 52.7148 64.529 49.9626 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
            </svg>
            Sign in with Discord
          </button>

          <p className="text-center text-xs text-slate-600 mb-6">
            Don't have an account?{' '}
            <a href="/apply" className="font-bold transition-colors" style={{ color: '#a855f7' }}>Apply to join →</a>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.10)' }} />
            <span className="text-[10px] font-mono text-slate-800 uppercase tracking-widest">Secure Access</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.10)' }} />
          </div>

          {/* Info blurb */}
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.10)' }}>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access is restricted to verified Next RP officers. Use your linked Discord account to sign in. New officers must apply and be approved by leadership.
            </p>
          </div>

          {/* Hidden admin bypass */}
          {showAdmin && (
            <div className="mt-6 animate-fade-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.12)' }} />
                <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Leadership Access</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.12)' }} />
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
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: '1px solid rgba(168,85,247,0.30)' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
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

          {/* Hidden trigger — click 5x */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { const n = tapCount + 1; setTapCount(n); if (n >= 5) { setShowAdmin(true); setTapCount(0); } }}
              className="text-[10px] font-mono text-slate-900 hover:text-slate-900 select-none cursor-default"
              style={{ background: 'none', border: 'none', padding: 0 }}>
              All access is monitored and logged
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
