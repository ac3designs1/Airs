import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Radio, Users, Shield, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Home'     },
  { to: '/in-city-requests', icon: Radio,           label: 'Dispatch' },
  { to: '/roster',           icon: Users,           label: 'Roster'   },
  { to: '/warrants',         icon: Shield,          label: 'Warrants' },
  { to: '/settings',         icon: Settings,        label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();
  const { auth } = useAuth();
  if (!auth.user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 pb-safe"
      style={{
        background: 'rgba(8,6,14,0.96)',
        borderTop: '1px solid rgba(168,85,247,0.14)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingTop: '8px',
        height: 'calc(60px + env(safe-area-inset-bottom))',
      }}>
      {NAV.map(({ to, icon: Icon, label }) => {
        const active = location.pathname === to;
        return (
          <NavLink key={to} to={to}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all select-none"
            style={{ minWidth: 52 }}>
            <div className="relative flex items-center justify-center w-10 h-8 rounded-xl transition-all"
              style={{
                background: active ? 'rgba(168,85,247,0.16)' : 'transparent',
                boxShadow: active ? '0 0 12px rgba(168,85,247,0.18)' : 'none',
              }}>
              <Icon className="w-5 h-5 transition-colors" style={{ color: active ? '#c084fc' : '#475569' }} />
              {active && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full" style={{ background: '#a855f7' }} />
              )}
            </div>
            <span className="text-[10px] font-semibold transition-colors leading-none"
              style={{ color: active ? '#c084fc' : '#475569' }}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
