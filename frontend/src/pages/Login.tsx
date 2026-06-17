import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  'Real-time CAD dispatch system',
  'Divisions: Academy · GD · Highway · CIRT · SOG',
  'Recruit training & FTO tracker',
  'Shift logging & duty analytics',
  'Warrant & BOLO management',
  'Promotions, strikes & leave management',
];

export default function Login() {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [featureIdx, setFeatureIdx] = useState(0);

  const { login } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setFeatureIdx(i => (i + 1) % FEATURES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#07090f' }}>

      {/* ── Left Hero Panel ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(to top, #07090f, transparent)' }} />

        {/* Floating orbs */}
        <div className="absolute top-32 left-16 w-64 h-64 rounded-full pointer-events-none animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08), transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-48 right-8 w-48 h-48 rounded-full pointer-events-none animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 70%)', filter: 'blur(30px)', animationDelay: '1.5s' }} />

        {/* Logo + Brand */}
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

        {/* Main hero content */}
        <div className={`relative z-10 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Large badge icon */}
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
            Next RP
            <br />
            <span className="text-gradient text-4xl">Internal System</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-md leading-relaxed">
            Australia's premier FiveM roleplay CAD — real-time dispatch, warrants, roster management and more.
          </p>

          {/* Live feature ticker */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <div className="h-5 overflow-hidden">
              {FEATURES.map((f, i) => (
                <div key={f} className="transition-all duration-500 text-sm text-slate-300"
                  style={{ transform: `translateY(${(i - featureIdx) * 20}px)`, opacity: i === featureIdx ? 1 : 0, position: i === 0 ? 'relative' : 'absolute' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom system status */}
        <div className={`relative z-10 flex items-center gap-6 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {['CAD Online', 'Dispatch Active', 'MELPOL Connected'].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
                style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
              <span className="text-slate-500 text-xs font-mono">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ──────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 relative"
        style={{ background: 'rgba(5,7,14,0.97)' }}>
        {/* Subtle border left */}
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

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Secure Access</h2>
            <p className="text-slate-500 text-sm">Authorised personnel only. All access is logged.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
              <div className="relative">
                <Shield className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'u' ? 'text-sky-400' : 'text-slate-600'}`} />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  onFocus={() => setFocused('u')}
                  onBlur={() => setFocused(null)}
                  placeholder="username"
                  required
                  className="nx-input pl-10"
                  style={focused === 'u' ? { borderColor: 'rgba(14,165,233,0.55)', boxShadow: '0 0 0 3px rgba(14,165,233,0.08)' } : {}}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'p' ? 'text-sky-400' : 'text-slate-600'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onFocus={() => setFocused('p')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  className="nx-input pl-10 pr-11"
                  style={focused === 'p' ? { borderColor: 'rgba(14,165,233,0.55)', boxShadow: '0 0 0 3px rgba(14,165,233,0.08)' } : {}}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sky-400 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2.5 py-3">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Access System</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(14,165,233,0.10)' }} />
            <span className="text-slate-600 text-xs">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(14,165,233,0.10)' }} />
          </div>

          <button onClick={() => nav('/register')}
            className="btn-ghost w-full flex items-center justify-center gap-2 py-3">
            <span>Request Officer Access</span>
          </button>

          {/* Footer */}
          <p className="text-center text-slate-600 text-xs mt-8">
            Next RP · Melbourne, Australia · FiveM CAD v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
