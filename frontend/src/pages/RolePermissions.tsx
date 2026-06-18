import { useState, useEffect } from 'react';
import { Key, Check, X, Lock, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROLES = ['leadership', 'senior_command', 'supervisor', 'officer', 'recruit'];

const ROLE_LABELS: Record<string, string> = {
  leadership: 'Leadership', senior_command: 'Senior Command',
  supervisor: 'Supervisor', officer: 'Officer', recruit: 'Recruit',
};

const ROLE_COLORS: Record<string, string> = {
  leadership: 'text-amber-400', senior_command: 'text-orange-400',
  supervisor: 'text-blue-400', officer: 'text-slate-400', recruit: 'text-emerald-400',
};

const PERMISSIONS = [
  { category: 'Citizens & Records', items: ['View Citizens', 'Edit Citizens', 'Create Citizens', 'Delete Citizens'] },
  { category: 'Warrants', items: ['View Warrants', 'Create Warrants', 'Serve Warrants', 'Delete Warrants'] },
  { category: 'BOLOs', items: ['View BOLOs', 'Create BOLOs', 'Cancel BOLOs'] },
  { category: 'Dispatch', items: ['View Calls', 'Create Calls', 'Close Calls', 'Assign Units'] },
  { category: 'Roster', items: ['View Roster', 'Edit Officers', 'Add Officers', 'Remove Officers'] },
  { category: 'Reports & Incidents', items: ['View Reports', 'Create Reports', 'Delete Reports'] },
  { category: 'Leadership Tools', items: ['Promotions', 'Issue Strikes', 'Approve Leave', 'Approve Certifications'] },
  { category: 'Administration', items: ['User Management', 'Role Management', 'System Settings', 'View Logs'] },
];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  'View Citizens':          { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: false },
  'Edit Citizens':          { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'Create Citizens':        { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'Delete Citizens':        { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'View Warrants':          { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: false },
  'Create Warrants':        { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'Serve Warrants':         { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: false },
  'Delete Warrants':        { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'View BOLOs':             { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: true  },
  'Create BOLOs':           { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'Cancel BOLOs':           { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'View Calls':             { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: true  },
  'Create Calls':           { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: false },
  'Close Calls':            { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'Assign Units':           { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'View Roster':            { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: true  },
  'Edit Officers':          { leadership: true,  senior_command: true,  supervisor: false, officer: false, recruit: false },
  'Add Officers':           { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'Remove Officers':        { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'View Reports':           { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: true  },
  'Create Reports':         { leadership: true,  senior_command: true,  supervisor: true,  officer: true,  recruit: false },
  'Delete Reports':         { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'Promotions':             { leadership: true,  senior_command: true,  supervisor: false, officer: false, recruit: false },
  'Issue Strikes':          { leadership: true,  senior_command: true,  supervisor: false, officer: false, recruit: false },
  'Approve Leave':          { leadership: true,  senior_command: true,  supervisor: true,  officer: false, recruit: false },
  'Approve Certifications': { leadership: true,  senior_command: true,  supervisor: false, officer: false, recruit: false },
  'User Management':        { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'Role Management':        { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'System Settings':        { leadership: true,  senior_command: false, supervisor: false, officer: false, recruit: false },
  'View Logs':              { leadership: true,  senior_command: true,  supervisor: false, officer: false, recruit: false },
};

const STORAGE_KEY = 'nextairs_role_permissions';

function loadMatrix(): Record<string, Record<string, boolean>> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_MATRIX, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_MATRIX;
}

export default function RolePermissions() {
  const { auth } = useAuth();
  const role = auth.user?.role ?? '';
  const canEdit = ['admin', 'administrator'].includes(role);

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(loadMatrix);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setMatrix(loadMatrix());
  }, []);

  const toggle = (perm: string, r: string) => {
    if (!canEdit) return;
    setMatrix(m => ({
      ...m,
      [perm]: { ...m[perm], [r]: !m[perm]?.[r] },
    }));
    setDirty(true);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
    setDirty(false);
    toast.success('Permissions saved');
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMatrix(DEFAULT_MATRIX);
    setDirty(false);
    toast.success('Permissions reset to defaults');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.2)' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <Key className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Role Permissions</h1>
              <p className="text-slate-500 text-sm">
                {canEdit ? 'Click any cell to toggle. Senior Leadership always has full access.' : 'System access control matrix — read only.'}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button onClick={reset}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button onClick={save} disabled={!dirty}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: dirty ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(168,85,247,0.3)' }}>
                <Save className="w-3.5 h-3.5" /> {dirty ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}>
        <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Senior Leadership always has full access to all features regardless of this matrix. Permissions here are a reference guide — actual API-level enforcement is configured separately.</span>
      </div>

      {/* Permission tables */}
      {PERMISSIONS.map(cat => (
        <div key={cat.category} className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="font-semibold text-white text-sm">{cat.category}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-52">Permission</th>
                  {/* Senior Leadership — always locked */}
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                    Senior<br />Leadership
                  </th>
                  {ROLES.map(r => (
                    <th key={r} className={`px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider ${ROLE_COLORS[r]}`}>
                      {ROLE_LABELS[r].replace(' ', '\n')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.items.map((perm, i) => (
                  <tr key={perm} className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                    <td className="px-5 py-3 text-sm text-slate-300 font-medium">{perm}</td>

                    {/* Senior Leadership — always ✓, not editable */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                          <Check className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                      </div>
                    </td>

                    {ROLES.map(r => {
                      const has = matrix[perm]?.[r] ?? false;
                      return (
                        <td key={r} className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <button
                              onClick={() => toggle(perm, r)}
                              disabled={!canEdit}
                              title={canEdit ? `Click to ${has ? 'remove' : 'grant'} ${ROLE_LABELS[r]} access` : ''}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${canEdit ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                              style={{ background: has ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)' }}>
                              {has
                                ? <Check className="w-3.5 h-3.5 text-green-400" />
                                : <X className="w-3.5 h-3.5 text-slate-700" />
                              }
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
