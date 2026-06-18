import { useEffect, useState } from 'react';
import { Settings, Users, Database, Shield, Activity, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface Stats {
  total_officers: number;
  on_duty: number;
  active_warrants: number;
  active_bolos: number;
  active_calls: number;
  total_incidents: number;
  total_citizens: number;
  total_vehicles: number;
}

export default function Admin() {
  const { auth } = useAuth();
  const isAdmin = ['admin', 'administrator', 'leadership', 'senior_command'].includes(auth.user?.role ?? '');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/dispatch/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-yellow-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-red-500/20 rounded-xl border border-red-400/30">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">System panel — NextAirs v2.0</p>
          </div>
        </div>
      </div>

      {/* System stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Officers', value: stats?.total_officers ?? '—', icon: Users, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Active Warrants', value: stats?.active_warrants ?? '—', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
          { label: 'Active Calls', value: stats?.active_calls ?? '—', icon: Activity, color: 'text-purple-400 bg-purple-500/10' },
          { label: 'Total Citizens', value: stats?.total_citizens ?? '—', icon: Database, color: 'text-green-400 bg-green-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900/30 backdrop-blur-xl rounded-xl border border-gray-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{s.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-6 h-6" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { title: 'User Management', desc: 'Manage officer accounts, roles, and access', icon: Users, to: '/users', color: 'blue' },
          { title: 'Divisions', desc: 'Department and division configuration', icon: Shield, to: '/divisions', color: 'indigo' },
          { title: 'Database Stats', desc: 'System performance and database health', icon: Database, to: '/database-stats', color: 'green' },
          { title: 'Role Permissions', desc: 'Configure what each role can access', icon: Settings, to: '/role-permissions', color: 'purple' },
          { title: 'Termination Logs', desc: 'Review officer termination history', icon: AlertTriangle, to: '/termination-logs', color: 'red' },
          { title: 'Activity Logs', desc: 'System-wide activity monitoring', icon: Activity, to: '/duty-analytics', color: 'yellow' },
        ].map(p => (
          <a key={p.title} href={p.to}
            className="group bg-gray-900/30 backdrop-blur-xl rounded-xl border border-gray-800/50 hover:border-gray-700/50 p-5 transition-all hover:bg-gray-800/30">
            <div className={`p-3 bg-${p.color}-500/10 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform`}>
              <p.icon className={`w-6 h-6 text-${p.color}-400`} />
            </div>
            <h3 className="font-semibold text-white">{p.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{p.desc}</p>
          </a>
        ))}
      </div>

      {/* System info */}
      <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6">
        <h2 className="font-semibold text-white mb-4">System Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'System', value: 'NextAirs' },
            { label: 'Version', value: 'v2.0.0' },
            { label: 'Database', value: 'SQLite (WAL)' },
            { label: 'Status', value: 'Online', green: true },
          ].map(i => (
            <div key={i.label} className="p-4 rounded-xl border border-gray-800/50" style={{ background: 'rgba(17,24,39,0.3)' }}>
              <p className="text-xs text-gray-400">{i.label}</p>
              <p className={`font-semibold mt-1 ${i.green ? 'text-green-400' : 'text-white'}`}>{i.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
