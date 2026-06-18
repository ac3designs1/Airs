import { useEffect, useState } from 'react';
import { Shield, CheckCircle, Clock, Lock, LogOut } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface ChecklistItem {
  id: string; name: string; desc: string;
  status: 'not_started' | 'in_progress' | 'completed';
  updated_by_name?: string; completed_at?: string;
}
interface Progress {
  officer: { first_name: string; last_name: string; callsign?: string };
  items: ChecklistItem[];
  completedCount: number;
  total: number;
}

export default function PendingActivation() {
  const { auth, logout } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (!auth.user?.id) return;
    api.get(`/onboarding/${auth.user.id}`)
      .then(r => setProgress(r.data))
      .catch(() => {});
  }, [auth.user?.id]);

  const pct = progress ? Math.round((progress.completedCount / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #04080f 0%, #060d1a 50%, #030812 100%)' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full -top-60 -left-60 opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-8 h-16 border-b border-sky-500/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0284c7,#06b6d4)' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">NextAirs</div>
            <div className="text-[10px] font-mono text-sky-500">NEXT RP · MELBOURNE POLICE</div>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-5">

          {/* Header card */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)', boxShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Welcome, {auth.user?.first_name}!
                </h1>
                <p className="text-sky-400 text-sm font-mono">{auth.user?.callsign || 'Academy · Recruit'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  Your application has been <span className="text-sky-400 font-semibold">approved</span>. Before you get full access to the NextAirs MDT, you must complete your <span className="text-white font-semibold">Initial Training</span> with a senior officer or FTO. Leadership will contact you on Discord to schedule your sessions.
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {progress && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-medium">Training Progress</span>
                  <span className="text-xs font-bold" style={{ color: pct === 100 ? '#22c55e' : '#06b6d4' }}>
                    {progress.completedCount}/{progress.total} completed
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100
                        ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                        : 'linear-gradient(90deg,#0284c7,#6366f1)',
                    }} />
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          {progress && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="font-bold text-white text-sm">Initial Training Checklist</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your FTO/Leadership will mark these off during your training sessions.</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {progress.items.map((item, i) => {
                  const done = item.status === 'completed';
                  const inProg = item.status === 'in_progress';
                  return (
                    <div key={item.id} className="px-5 py-3.5 flex items-start gap-3.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold transition-all ${
                        done ? 'bg-green-500/20 border border-green-500/40' : inProg ? 'border border-sky-500/40 bg-sky-500/10' : 'bg-slate-800/60 border border-slate-700/50'
                      }`}>
                        {done
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          : inProg
                            ? <Clock className="w-3 h-3 text-sky-400" />
                            : <span className="text-slate-600">{i + 1}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${done ? 'text-slate-400 line-through decoration-slate-600' : inProg ? 'text-sky-300' : 'text-white'}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                        {done && item.updated_by_name && (
                          <p className="text-[10px] text-green-600 mt-1">Signed off by {item.updated_by_name}</p>
                        )}
                      </div>
                      {done && (
                        <div className="flex-shrink-0">
                          <span className="text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">DONE</span>
                        </div>
                      )}
                      {!done && (
                        <div className="flex-shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-700" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* What's next */}
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">What Happens Next</p>
            <div className="space-y-2">
              {[
                'Leadership will contact you on Discord to schedule your training sessions',
                'Complete all checklist items with your assigned FTO or senior officer',
                'Once signed off, you\'ll get full access to the NextAirs MDT system',
                'You\'ll be assigned your official callsign and issued equipment',
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500/50 flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
