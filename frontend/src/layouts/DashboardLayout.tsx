import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';

export default function DashboardLayout() {
  const { auth } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center" style={{ background: '#07090f' }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }} />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">NextAirs</p>
            <p className="text-slate-500 text-sm mt-1">Loading system…</p>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ea5e9', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!auth.user) return <Navigate to="/login" replace />;

  // Gate: recruits who haven't completed onboarding see the pending activation screen
  if (
    auth.user.role === 'recruit' &&
    auth.user.onboarding_complete !== 1 &&
    location.pathname !== '/pending-activation'
  ) {
    return <Navigate to="/pending-activation" replace />;
  }

  return (
    <div className="min-h-screen flex bg-dots" style={{ background: '#07090f' }}>
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-60 w-[500px] h-[300px] opacity-40"
          style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col md:pl-[240px] min-w-0 relative z-10">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
