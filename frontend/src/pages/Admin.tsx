import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Users, Database, Shield, Activity, AlertTriangle,
  Server, Key, BookOpen, ChevronRight, TrendingUp, Wifi
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface Stats {
  total_officers: number; on_duty: number;
  active_warrants: number; active_bolos: number;
  active_calls: number; total_incidents: number;
  total_citizens: number;
}

const PANELS = [
  { title: 'User Management',    desc: 'Manage officer accounts, roles and access',    icon: Users,         to: '/users',             accent: '#06b6d4', glow: 'rgba(6,182,212,0.15)'  },
  { title: 'Role Permissions',   desc: 'Configure access matrix for each role',        icon: Key,           to: '/role-permissions',  accent: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
  { title: 'Divisions',          desc: 'Department and division configuration',        icon: Shield,        to: '/divisions',         accent: '#6366f1', glow: 'rgba(99,102,241,0.15)'  },
  { title: 'Database Stats',     desc: 'System performance and database health',       icon: Database,      to: '/database-stats',    accent: '#22c55e', glow: 'rgba(34,197,94,0.15)'   },
  { title: 'Termination Logs',   desc: 'Review and manage officer termination records',icon: AlertTriangle, to: '/termination-logs',  accent: '#ef4444', glow: 'rgba(239,68,68,0.15)'   },
  { title: 'Duty Analytics',     desc: 'System-wide activity and duty monitoring',     icon: Activity,      to: '/duty-analytics',    accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)'  },
  { title: 'Leadership Command', desc: 'Approve requests, promotions and actions',     icon: TrendingUp,    to: '/leadership-command',accent: '#f97316', glow: 'rgba(249,115,22,0.15)'  },
  { title: 'Reports',            desc: 'Officer incident and field reports',           icon: BookOpen,      to: '/reports',           accent: '#38bdf8', glow: 'rgba(56,189,248,0.15)'  },
] as const;

export default function Admin() {
  const { auth } = useAuth();
  const isAdmin = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'].includes(auth.user?.role ?? '');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/dispatch/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const kpis = [
    { label: 'Total Officers', value: stats?.total_officers ?? '—', color: '#06b6d4', icon: Users },
    { label: 'Active Warrants', value: stats?.active_warrants ?? '—', color: '#ef4444', icon: AlertTriangle },
    { label: 'Live Calls', value: stats?.active_calls ?? '—', color: '#a78bfa', icon: Activity },
    { label: 'Citizens on File', value: stats?.total_citizens ?? '—', color: '#22c55e', icon: Database },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(249,115,22,0.06),rgba(245,158,11,0.08))', border: '1px solid rgba(239,68,68,0.22)' }}>
        <div className="absolute right-0 top-0 w-72 h-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at right, rgba(239,68,68,0.4), transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <Shield className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Leadership Panel</h1>
              <p className="text-slate-400 text-sm mt-0.5">Senior administration — NextAirs v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)' }}>
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 text-xs font-mono font-semibold">System Online</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">{k.label}</span>
              <div className="p-2 rounded-lg" style={{ background: `${k.color}18` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white font-mono">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Navigation panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PANELS.map(p => (
          <Link key={p.title} to={p.to}
            className="group glass rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] flex flex-col gap-3"
            style={{ '--glow': p.glow } as React.CSSProperties}>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl transition-all group-hover:scale-110"
                style={{ background: p.glow, border: `1px solid ${p.accent}30` }}>
                <p.icon className="w-5 h-5" style={{ color: p.accent }} />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{p.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.desc}</p>
            </div>
            <div className="h-px w-full mt-auto" style={{ background: `linear-gradient(to right, ${p.accent}30, transparent)` }} />
          </Link>
        ))}
      </div>

      {/* System info */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-white text-sm">System Information</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'System',   value: 'NextAirs' },
            { label: 'Version',  value: 'v2.0.0' },
            { label: 'Database', value: 'SQLite (WAL)' },
            { label: 'Runtime',  value: 'Node.js 20+', green: false },
            { label: 'Officers On Duty', value: stats ? `${stats.on_duty} / ${stats.total_officers}` : '—', green: (stats?.on_duty ?? 0) > 0 },
            { label: 'Active Incidents', value: stats?.total_incidents ?? '—' },
            { label: 'Active BOLOs', value: stats?.active_bolos ?? '—' },
            { label: 'Status', value: 'Operational', green: true },
          ].map(i => (
            <div key={i.label} className="rounded-xl p-3" style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{i.label}</p>
              <p className={`font-semibold text-sm mt-1 ${i.green ? 'text-green-400' : 'text-white'}`}>{i.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
