import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';

export default function DashboardLayout() {
  const { auth } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center" style={{ background: '#06060a' }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-glow"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }} />
          </div>
          <div className="text-center">
            <p className="text-white font-black tracking-tight">NextAirs</p>
            <p className="text-slate-500 text-xs mt-1 font-mono">Loading system…</p>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#a855f7', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!auth.user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-grid" style={{ background: '#06060a' }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-60 w-[600px] h-[350px] opacity-100"
          style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.04) 0%, transparent 70%)' }} />
      </div>

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col md:pl-[240px] min-w-0 relative z-10">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-[1800px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
