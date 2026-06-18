import { useState, useEffect } from 'react';
import { Menu, Bell, Settings, LogOut, ChevronDown, Shield, Radio } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard', '/roster': 'Officer Roster', '/warrants': 'Warrants',
  '/shifts': 'My Shifts', '/statistics': 'Statistics', '/settings': 'Settings',
  '/admin': 'Admin Panel', '/users': 'User Management', '/leave-requests': 'Leave Requests',
  '/command-centre': 'Command Centre', '/fpo-tracker': 'FPO Tracker',
  '/in-city-requests': 'In-City Requests', '/rewards': 'Rewards',
  '/weapons-inventory': 'Weapons Inventory', '/division-transfers': 'Division Transfers',
  '/certifications': 'Certifications', '/pending-requests': 'Pending Requests',
  '/termination-approval': 'Termination Approval', '/termination-logs': 'Termination Logs',
  '/feedback': 'Feedback Viewer', '/duty-analytics': 'Duty Analytics',
  '/reports': 'Reports', '/mdt': 'Officer Management', '/recruit-training': 'Recruit Training',
  '/fto-tracking': 'FTO Tracking', '/divisions': 'Divisions',
  '/role-permissions': 'Role Permissions', '/database-stats': 'Database Stats',
  '/announcements': 'Announcements', '/promotions': 'Promotions', '/strikes': 'Strikes & Demerits',
};

export default function Header({ setMobileOpen }: { setMobileOpen: (v: boolean) => void }) {
  const { auth, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [dropdown, setDropdown] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => { await logout(); nav('/login'); };

  const pageTitle = PAGE_LABELS[location.pathname] ?? 'NextAirs';

  const statusColor = auth.user?.status === 'on_duty' ? '#22c55e' :
    auth.user?.status === 'busy' ? '#eab308' : '#475569';
  const statusGlow = auth.user?.status === 'on_duty' ? '0 0 8px rgba(34,197,94,0.8)' :
    auth.user?.status === 'busy' ? '0 0 8px rgba(234,179,8,0.8)' : 'none';

  return (
    <header className="h-[60px] flex items-center justify-between px-4 sm:px-6 flex-shrink-0 sticky top-0 z-20"
      style={{ background: 'rgba(8,13,26,0.96)', borderBottom: '1px solid rgba(6,182,212,0.10)', backdropFilter: 'blur(12px)' }}>

      {/* Left */}
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setMobileOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Shield className="w-3.5 h-3.5" style={{ color: '#06b6d4' }} />
            <span className="text-slate-600">NextAirs</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-700 -rotate-90" />
          <span className="font-semibold text-white">{pageTitle}</span>
        </div>

        {/* Mobile title */}
        <span className="md:hidden font-semibold text-white text-sm">{pageTitle}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)' }}>
          <Radio className="w-3 h-3" style={{ color: '#06b6d4' }} />
          <span className="font-mono text-xs text-slate-400">
            {time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
          <Bell className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button onClick={() => setDropdown(d => !d)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors hover:bg-white/5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#0891b2,#1d4ed8)' }}>
                {auth.user?.first_name?.[0]}{auth.user?.last_name?.[0]}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: statusColor, borderColor: '#080d1a', boxShadow: statusGlow }} />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-white leading-none">{auth.user?.first_name} {auth.user?.last_name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{auth.user?.callsign || auth.user?.username}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {dropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl z-20 overflow-hidden shadow-2xl animate-fade-in"
                style={{ background: '#0d1526', border: '1px solid rgba(6,182,212,0.18)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
                  <div className="font-semibold text-white text-sm">{auth.user?.first_name} {auth.user?.last_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{auth.user?.callsign ? `${auth.user.callsign} · ` : ''}{auth.user?.department}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: statusGlow }} />
                    <span className="text-xs capitalize text-slate-400">{auth.user?.status?.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="py-1.5">
                  <button onClick={() => { setDropdown(false); nav('/settings'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                    <Settings className="w-4 h-4" /><span>Settings</span>
                  </button>
                  <div className="mx-3 my-1 h-px" style={{ background: 'rgba(6,182,212,0.08)' }} />
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <LogOut className="w-4 h-4" /><span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
