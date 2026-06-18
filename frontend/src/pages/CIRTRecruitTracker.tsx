import { Shield } from 'lucide-react';

export default function CIRTRecruitTracker() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(168,85,247,0.06))', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">CIRT Recruit Tracker</h1>
            <p className="text-slate-500 text-sm">Critical Incident Response Team — Recruit Progress</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Coming Soon</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          The CIRT Recruit Tracker is being configured. Content will be added shortly.
        </p>
        <span className="chip" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' }}>
          CIRT FTO Access Required
        </span>
      </div>
    </div>
  );
}
