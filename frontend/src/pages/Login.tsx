import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Shield, Lock, Users, Radio, Zap, FileText } from 'lucide-react';
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

const FEATURES = [
  { icon: Radio,    label: 'Live Dispatch',  color: '#a855f7' },
  { icon: Shield,   label: 'Warrants',       color: '#ef4444' },
  { icon: Users,    label: 'Officer Roster', color: '#22c55e' },
  { icon: Zap,      label: 'Incident BOLO',  color: '#f59e0b' },
  { icon: FileText, label: 'Reports',        color: '#818cf8' },
  { icon: Lock,     label: 'Secure Access',  color: '#c084fc' },
];

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

      {/* ══════════════════════════════════════
          LEFT — Branding panel
      ══════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #0c0618 0%, #09060f 40%, #06040c 100%)' }}>

        {/* ── Glow layers ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'70%', height:'80%', borderRadius:'50%',
            background:'radial-gradient(ellipse, rgba(168,85,247,0.18) 0%, transparent 65%)', filter:'blur(60px)' }} />
          <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'60%', height:'60%', borderRadius:'50%',
            background:'radial-gradient(ellipse, rgba(236,72,153,0.14) 0%, transparent 65%)', filter:'blur(70px)' }} />
          <div style={{ position:'absolute', top:'40%', right:'10%', width:'40%', height:'40%', borderRadius:'50%',
            background:'radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 65%)', filter:'blur(50px)' }} />
          {/* Subtle grid */}
          <div className="absolute inset-0"
            style={{ backgroundImage:'linear-gradient(rgba(168,85,247,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,0.04) 1px,transparent 1px)', backgroundSize:'50px 50px', opacity:1 }} />
        </div>

        {/* ── Top bar ── */}
        <div className="relative z-10 flex items-center justify-between px-10 pt-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow:'0 0 8px rgba(34,197,94,1)' }} />
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-[0.18em]">System Online</span>
          </div>
          <span className="text-[11px] font-mono text-slate-700 uppercase tracking-widest">Melbourne · AEST</span>
        </div>

        {/* ── Main hero content ── */}
        <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-14 text-center transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Tag */}
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.28em] mb-5"
            style={{ color:'rgba(168,85,247,0.65)' }}>
            Next RP · Melbourne Police Force
          </div>

          {/* NEXT RP */}
          <h1 style={{
            fontSize:'clamp(64px,7vw,96px)',
            fontWeight:900,
            letterSpacing:'-0.04em',
            lineHeight:1,
            margin:'0 0 24px',
            background:'linear-gradient(135deg, #f5d0fe 0%, #d946ef 30%, #a855f7 60%, #818cf8 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            filter:'drop-shadow(0 0 50px rgba(168,85,247,0.50))',
          }}>
            NEXT RP
          </h1>

          <p className="text-slate-400 text-[15px] leading-relaxed max-w-[400px] mb-10">
            Melbourne's premier FiveM law enforcement system — secure, real-time, and built for serious roleplay.
          </p>

          {/* 4 feature chips — single row */}
          <div className="flex items-center gap-3">
            {FEATURES.slice(0, 4).map(({ icon: Icon, label, color }) => (
              <div key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
                style={{ background:`${color}12`, border:`1px solid ${color}30`, color }}>
                <Icon style={{ width:14, height:14, flexShrink:0 }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom ── */}
        <div className="relative z-10 flex items-center justify-between px-10 pb-8">
          <span className="text-[10px] font-mono text-slate-800 uppercase tracking-widest">AIRS · Next RP v2.0</span>
          <span className="text-[10px] font-mono text-slate-800 uppercase tracking-widest">All access is logged</span>
        </div>

        {/* Right divider */}
        <div className="absolute top-0 right-0 w-px h-full"
          style={{ background:'linear-gradient(180deg,transparent 0%,rgba(168,85,247,0.30) 25%,rgba(168,85,247,0.30) 75%,transparent 100%)' }} />
      </div>

      {/* ══════════════════════════════════════
          RIGHT — Login form
      ══════════════════════════════════════ */}
      <div className="w-full lg:w-[480px] lg:flex-shrink-0 flex flex-col relative"
        style={{ background:'#08060e' }}>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)',
            width:'400px', height:'400px', borderRadius:'50%',
            background:'radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 70%)', filter:'blur(55px)' }} />
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden flex items-center justify-between px-6 h-14 flex-shrink-0"
          style={{ borderBottom:'1px solid rgba(168,85,247,0.10)' }}>
          <img src="/airs-logo.png" alt="AIRS" draggable={false}
            style={{ height:'22px', width:'auto', filter:'drop-shadow(0 0 8px rgba(168,85,247,0.5))' }} />
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Next RP</span>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className={`w-full max-w-[360px] relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            {/* Heading */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background:'linear-gradient(90deg,rgba(168,85,247,0.5),transparent)' }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em]"
                  style={{ color:'rgba(168,85,247,0.55)' }}>Officer Portal</span>
                <div className="h-px flex-1" style={{ background:'linear-gradient(270deg,rgba(168,85,247,0.5),transparent)' }} />
              </div>
              <h2 className="text-[40px] font-black text-white leading-none mb-2.5"
                style={{ letterSpacing:'-0.035em' }}>
                Welcome Back
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Advanced Internal Reporting System
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl mb-6 animate-fade-in"
                style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-semibold leading-snug">{error}</p>
                  {discordTag && <p className="text-xs text-slate-600 mt-1 font-mono">{discordTag}</p>}
                </div>
              </div>
            )}

            {/* Discord sign-in */}
            <button onClick={handleDiscordLogin}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-white text-base mb-4 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
              style={{
                background:'linear-gradient(135deg,#5865F2 0%,#7c3aed 55%,#a855f7 100%)',
                boxShadow:'0 8px 32px rgba(88,101,242,0.40), inset 0 1px 0 rgba(255,255,255,0.12)',
                border:'1px solid rgba(168,85,247,0.45)',
                letterSpacing:'-0.01em',
              }}>
              <svg width="22" height="17" viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 49.9626 12.3413 52.7148 18.1147 54.5717C18.2071 54.6004 18.305 54.5662 18.3638 54.4899C19.7295 52.5754 20.9469 50.5535 21.9907 48.4296C22.0523 48.3062 21.9935 48.1601 21.8676 48.1151C19.9366 47.3921 18.0979 46.5084 16.3292 45.5006C16.1893 45.4191 16.1781 45.2241 16.3068 45.1285C16.679 44.8518 17.0513 44.5637 17.4067 44.2728C17.471 44.2193 17.5606 44.2079 17.6362 44.2418C29.2558 49.6202 41.8354 49.6202 53.3179 44.2418C53.3935 44.2051 53.4831 44.2165 53.5502 44.27C53.9057 44.5609 54.2779 44.8518 54.6529 45.1285C54.7816 45.2241 54.7732 45.4191 54.6333 45.5006C52.8646 46.5283 51.0259 47.3921 49.0921 48.1123C48.9662 48.1573 48.9102 48.3062 48.9718 48.4296C50.0384 50.5506 51.2558 52.5725 52.5959 54.487C52.6519 54.5662 52.7526 54.6004 52.845 54.5717C58.6464 52.7148 64.529 49.9626 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
              </svg>
              Sign in with Discord
            </button>

            <p className="text-center text-xs text-slate-600 mb-8">
              New officer?{' '}
              <a href="/apply" style={{ color:'#a855f7', fontWeight:700 }}
                className="hover:opacity-75 transition-opacity">Apply to join &rarr;</a>
            </p>

            {/* Info */}
            <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
              style={{ background:'rgba(168,85,247,0.05)', border:'1px solid rgba(168,85,247,0.12)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background:'rgba(168,85,247,0.12)', border:'1px solid rgba(168,85,247,0.20)' }}>
                <Lock className="w-3.5 h-3.5" style={{ color:'#c084fc' }} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Restricted to verified Next RP officers only. Sign in with your linked Discord. New officers must apply and be approved by leadership.
              </p>
            </div>

            {/* Hidden leadership bypass */}
            {showAdmin && (
              <div className="mt-8 animate-fade-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px" style={{ background:'rgba(168,85,247,0.15)' }} />
                  <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Leadership Access</span>
                  <div className="flex-1 h-px" style={{ background:'rgba(168,85,247,0.15)' }} />
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <input value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="Username" autoComplete="username" className="nx-input" />
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'}
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
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40"
                    style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                    {loading
                      ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                      : 'Sign In'}
                  </button>
                  <button type="button" onClick={() => setShowAdmin(false)}
                    className="w-full text-center text-xs text-slate-700 hover:text-slate-500 transition-colors py-1">
                    Cancel
                  </button>
                </form>
              </div>
            )}

            <div className="mt-10 text-center">
              <button
                onClick={() => { const n = tapCount + 1; setTapCount(n); if (n >= 5) { setShowAdmin(true); setTapCount(0); } }}
                className="text-[10px] font-mono select-none cursor-default"
                style={{ background:'none', border:'none', padding:0, color:'rgba(20,15,30,1)' }}>
                All access is monitored and logged
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
