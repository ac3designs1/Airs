import { useState } from 'react';
import { Settings as SettingsIcon, User, Lock, Save, CheckCircle, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { auth, setAuth } = useAuth();
  const user = auth.user!;

  const [callsign, setCallsign] = useState(user.callsign ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [savingPw,  setSavingPw]  = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const r = await api.put('/auth/profile', { callsign: callsign.trim() || null });
      setAuth(prev => ({ ...prev, user: { ...prev.user!, ...r.data } }));
      localStorage.setItem('airs_user', JSON.stringify({ ...user, ...r.data }));
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save');
    } finally { setSavingProfile(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await api.put('/auth/profile', { current_password: currentPw, new_password: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.success('Password changed');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(100,116,139,0.12),rgba(14,165,233,0.06))', border: '1px solid rgba(100,116,139,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)' }}>
            <SettingsIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-slate-500 text-sm">Account and security</p>
          </div>
        </div>
      </div>

      {/* Profile card — read-only info */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-4 h-4 text-sky-400" />
          <h2 className="font-semibold text-white text-sm">Profile Information</h2>
        </div>

        <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.08)' }}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div>
            <div className="font-bold text-white">{user.first_name} {user.last_name}</div>
            <div className="text-sm text-slate-400">{user.rank} · {user.department}</div>
            <div className="text-xs text-slate-600 mt-0.5">{user.username} · <span className="capitalize text-slate-500">{user.role}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">MDT Callsign</label>
            <input value={callsign} onChange={e => setCallsign(e.target.value)}
              placeholder="e.g. GD-102" className="nx-input w-full font-mono" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Username</label>
            <input value={user.username} readOnly className="nx-input w-full opacity-50 cursor-not-allowed" />
          </div>
        </div>

        <button onClick={saveProfile} disabled={savingProfile}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
          {savingProfile
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          {savingProfile ? 'Saving…' : 'Save Callsign'}
        </button>
      </div>

      {/* Change password */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold text-white text-sm">Change Password</h2>
        </div>

        <form onSubmit={savePassword} className="space-y-4">
          {[
            { id: 'current', l: 'Current Password', v: currentPw, fn: setCurrentPw, ph: 'Enter current password' },
            { id: 'new',     l: 'New Password',     v: newPw,     fn: setNewPw,     ph: 'Min 6 characters' },
            { id: 'confirm', l: 'Confirm New Password', v: confirmPw, fn: setConfirmPw, ph: 'Repeat new password' },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">{f.l}</label>
              <div className="relative">
                <input required type={showPw ? 'text' : 'password'} value={f.v} onChange={e => f.fn(e.target.value)}
                  placeholder={f.ph} className="nx-input w-full pr-10" />
                {f.id === 'new' && (
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="submit" disabled={savingPw}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#b45309,#d97706)' }}>
            {savingPw
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle className="w-4 h-4" />}
            {savingPw ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Read-only security info */}
      <div className="glass rounded-2xl p-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: 'Role', v: user.role },
            { l: 'Department', v: user.department },
            { l: 'Rank', v: user.rank },
            { l: 'Status', v: user.status?.replace('_', ' ') ?? '—' },
          ].map(r => (
            <div key={r.l} className="p-3 rounded-xl" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(14,165,233,0.06)' }}>
              <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">{r.l}</div>
              <div className="text-sm text-slate-300 capitalize">{r.v}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-700 mt-4">All access and activity is monitored and logged. Contact your administrator to change your rank, role, or department.</p>
      </div>
    </div>
  );
}
