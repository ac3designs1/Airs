import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Lock, Save, CheckCircle, Eye, EyeOff, Link, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'https://airs-production-4e96.up.railway.app/api').replace(/\/api\/?$/, '');

const ROLE_LABELS: Record<string, string> = {
  admin: 'Leadership',
  administrator: 'Leadership',
  leadership: 'Leadership',
  senior_command: 'Senior Command',
  supervisor: 'Supervisor',
  officer: 'Officer',
  recruit: 'Recruit',
};

export default function Settings() {
  const { auth, setAuth } = useAuth();
  const user = auth.user!;
  const [searchParams] = useSearchParams();

  const [callsign, setCallsign] = useState(user.callsign ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (searchParams.get('discord_linked') === '1') toast.success('Discord account linked successfully!');
    if (searchParams.get('discord_error') === 'already_linked') toast.error('That Discord is already linked to another account.');
    if (searchParams.get('discord_error') === 'cancelled') toast.error('Discord link was cancelled.');
  }, []);

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
            { l: 'Role', v: ROLE_LABELS[user.role] ?? user.role },
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
        <p className="text-xs text-slate-700 mt-4">All access and activity is monitored and logged. Contact leadership to change your rank, role, or department.</p>
      </div>

      {/* Discord Link */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          <h2 className="font-semibold text-white text-sm">Discord Account</h2>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl mb-4"
          style={{ background: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white font-medium">
                {(user as unknown as { discord_username?: string }).discord_username
                  ? `@${(user as unknown as { discord_username?: string }).discord_username}`
                  : 'Not linked'}
              </p>
              <p className="text-xs text-slate-500">Used for MDT login</p>
            </div>
          </div>
          {(user as unknown as { discord_username?: string }).discord_username && (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
        </div>
        <a href={`${BACKEND_URL}/api/auth/discord/link`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 w-fit"
          style={{ background: 'linear-gradient(135deg,#5865F2,#4752C4)' }}>
          <Link className="w-4 h-4" />
          {(user as unknown as { discord_username?: string }).discord_username ? 'Re-link Discord' : 'Link Discord Account'}
        </a>
      </div>
    </div>
  );
}
