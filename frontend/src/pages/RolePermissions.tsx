import { Key, Check, X } from 'lucide-react';

const ROLES = ['administrator', 'senior_command', 'leadership', 'supervisor', 'officer'];
const PERMISSIONS = [
  { category: 'Citizens', items: ['View Citizens', 'Edit Citizens', 'Create Citizens', 'Delete Citizens'] },
  { category: 'Warrants', items: ['View Warrants', 'Create Warrants', 'Serve Warrants', 'Delete Warrants'] },
  { category: 'BOLOs', items: ['View BOLOs', 'Create BOLOs', 'Cancel BOLOs'] },
  { category: 'Dispatch', items: ['View Calls', 'Create Calls', 'Close Calls', 'Assign Units'] },
  { category: 'Roster', items: ['View Roster', 'Edit Officers', 'Add Officers', 'Remove Officers'] },
  { category: 'Reports', items: ['View Reports', 'Create Reports', 'Delete Reports'] },
  { category: 'Administration', items: ['User Management', 'Role Management', 'System Settings', 'View Logs'] },
];

// Which roles have which permissions (matrix)
const MATRIX: Record<string, Record<string, boolean>> = {
  'View Citizens': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Edit Citizens': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'Create Citizens': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'Delete Citizens': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'View Warrants': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Create Warrants': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'Serve Warrants': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Delete Warrants': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'View BOLOs': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Create BOLOs': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'Cancel BOLOs': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'View Calls': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Create Calls': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Close Calls': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'Assign Units': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: false },
  'View Roster': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Edit Officers': { administrator: true, senior_command: true, leadership: true, supervisor: false, officer: false },
  'Add Officers': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'Remove Officers': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'View Reports': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Create Reports': { administrator: true, senior_command: true, leadership: true, supervisor: true, officer: true },
  'Delete Reports': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'User Management': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'Role Management': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'System Settings': { administrator: true, senior_command: false, leadership: false, supervisor: false, officer: false },
  'View Logs': { administrator: true, senior_command: true, leadership: false, supervisor: false, officer: false },
};

const roleColors: Record<string, string> = {
  administrator: 'text-red-400', senior_command: 'text-orange-400', leadership: 'text-yellow-400',
  supervisor: 'text-blue-400', officer: 'text-gray-400',
};

export default function RolePermissions() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-purple-500/20 p-6"
        style={{ background: 'linear-gradient(to right,rgba(168,85,247,0.1),rgba(99,102,241,0.05),rgba(59,130,246,0.1))' }}>
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-400/30">
            <Key className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Role Permissions</h1>
            <p className="text-gray-400 text-sm mt-0.5">System access control matrix</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/10 rounded-xl p-3 border border-gray-800/50 text-xs text-yellow-400 flex items-center gap-2">
        <Key className="w-4 h-4 flex-shrink-0" />
        <span>Administrators always have full system access. Role permissions are enforced at the API level.</span>
      </div>

      {PERMISSIONS.map(cat => (
        <div key={cat.category} className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-800/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800/50 bg-gray-900/20">
            <h2 className="font-semibold text-white">{cat.category}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-48">Permission</th>
                  {ROLES.map(r => (
                    <th key={r} className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider capitalize ${roleColors[r]}`}>
                      {r.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.items.map((perm, i) => (
                  <tr key={perm} className={`border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors ${i % 2 ? 'bg-gray-900/10' : ''}`}>
                    <td className="px-5 py-3 text-sm text-gray-300">{perm}</td>
                    {ROLES.map(role => {
                      const has = MATRIX[perm]?.[role] ?? false;
                      return (
                        <td key={role} className="px-4 py-3 text-center">
                          {has
                            ? <div className="flex justify-center"><Check className="w-4 h-4 text-green-400" /></div>
                            : <div className="flex justify-center"><X className="w-4 h-4 text-gray-700" /></div>
                          }
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
