import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { RANKS } from '../constants/ranks';

export default function Register() {
  const [mounted, setMounted] = useState(false);
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirm: '', first_name: '', last_name: '', callsign: '', department: 'Academy', rank: 'Recruit' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/register', {
        username: form.username, password: form.password,
        first_name: form.first_name, last_name: form.last_name,
        callsign: form.callsign, department: form.department, rank: form.rank,
      });
      setSuccess(true);
      setTimeout(() => nav('/login'), 2000);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[800px] h-[800px] rounded-full -top-96 -left-96" style={{ background: 'rgba(59,130,246,0.03)', filter: 'blur(120px)' }} />
        <div className="absolute w-[600px] h-[600px] rounded-full -bottom-48 -right-48" style={{ background: 'rgba(99,102,241,0.03)', filter: 'blur(100px)' }} />
      </div>
      <div className={`w-full max-w-lg relative transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="relative bg-gray-900/30 backdrop-blur-xl rounded-full p-4 border border-gray-800/50 shadow-2xl">
              <Shield className="w-12 h-12 text-blue-400" />
              <div className="absolute inset-0 border-2 border-transparent border-t-blue-400/50 rounded-full animate-spin-slow" />
            </div>
          </div>
        </div>
        <div className="text-center mb-8">
          <p className="text-gray-300 text-sm font-medium tracking-widest">NEXTAIRS — NEXT GEN INTERNAL REPORTING SYSTEM</p>
          <div className="w-24 h-px mx-auto mt-4" style={{ background: 'linear-gradient(to right,transparent,#3b82f6,transparent)' }} />
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-800/50 shadow-2xl" style={{ background: 'rgba(17,24,39,0.3)', backdropFilter: 'blur(24px)' }}>
          <div className="absolute top-0 left-0 w-1/3 h-px animate-scan" style={{ background: 'linear-gradient(to right,transparent,rgba(96,165,250,1),transparent)' }} />
          <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-blue-400/50" />
          <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-blue-400/50" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-blue-400/50" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-blue-400/50" />
          <div className="relative z-10 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Request Access</h2>
              <p className="text-gray-400 text-sm">Create your NextAirs officer account</p>
            </div>
            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-green-400 font-semibold">Account Created!</p>
                <p className="text-gray-400 text-sm mt-1">Redirecting to login...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" /><span>{error}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'first_name', label: 'First Name', placeholder: 'James' },
                    { key: 'last_name', label: 'Last Name', placeholder: 'Smith' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">{f.label}</label>
                      <input required value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
                        style={{ background: 'rgba(31,41,55,0.5)' }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'callsign', label: 'Callsign', placeholder: 'L-102', required: false },
                    { key: 'username', label: 'Username', placeholder: 'j.smith', required: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">{f.label}{!f.required && <span className="text-gray-500 text-xs ml-1">(optional)</span>}</label>
                      <input required={f.required} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
                        style={{ background: 'rgba(31,41,55,0.5)' }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Department</label>
                    <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-white border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
                      style={{ background: 'rgba(31,41,55,0.5)' }}>
                      {['Academy', 'GD', 'Highway', 'CIRT', 'SOG'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Rank</label>
                    <select value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-white border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
                      style={{ background: 'rgba(31,41,55,0.5)' }}>
                      {RANKS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                  <input type="password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
                    style={{ background: 'rgba(31,41,55,0.5)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                  <input type="password" required value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
                    style={{ background: 'rgba(31,41,55,0.5)' }} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all mt-2"
                  style={{ background: loading ? '#4b5563' : 'linear-gradient(to right,#2563eb,#4f46e5)' }}>
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating account...</span>
                    </div>
                  ) : 'Create Account'}
                </button>
                <div className="text-center pt-2 border-t border-gray-700/50">
                  <p className="text-gray-400 text-sm">
                    Already have an account?{' '}
                    <button type="button" onClick={() => nav('/login')} className="text-blue-400 hover:text-blue-300 hover:underline font-medium">Sign In</button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
