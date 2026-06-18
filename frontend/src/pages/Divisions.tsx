import { useEffect, useState } from 'react';
import { Briefcase, Users, Plus, X } from 'lucide-react';
import api from '../api/client';

interface Division { id: string; name: string; type: string; description: string; commander: string; memberCount: number; color: string; }

const DEPT_META: Record<string, { type: string; description: string; color: string }> = {
  Academy: { type: 'Training',    color: '#06b6d4', description: 'Recruitment and training division. All recruits begin here before field placement.' },
  GD:      { type: 'Primary',     color: '#3b82f6', description: 'General Duties — primary patrol and first response for the city.' },
  Highway: { type: 'Primary',     color: '#f59e0b', description: 'Highway Patrol — motorway enforcement, pursuits, and crash investigation.' },
  CIRT:    { type: 'Specialist',  color: '#ef4444', description: 'Critical Incident Response Team — high-risk tactical operations.' },
  SOG:     { type: 'Specialist',  color: '#8b5cf6', description: 'Special Operations Group — elite specialist unit for the most complex operations.' },
};

const RANK_ORDER = ['Commissioner','Deputy Commissioner','Assistant Commissioner','Commander','Superintendent','Inspector','Senior Sergeant','Sergeant','Leading Senior Constable','Senior Constable','First Constable','Constable','Probationary Constable','Recruit'];

interface OfficerRow { first_name: string; last_name: string; rank: string; department: string; callsign?: string; }

function buildDivisions(officers: OfficerRow[]): Division[] {
  return ['Academy','GD','Highway','CIRT','SOG'].map((name, i) => {
    const meta = DEPT_META[name] ?? { type: 'Primary', color: '#64748b', description: '' };
    const members = officers.filter(o => o.department === name);
    const sorted = [...members].sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
    const co = sorted[0];
    const commander = co ? `${co.first_name} ${co.last_name} (${co.rank})` : 'Vacant';
    return { id: String(i + 1), name, type: meta.type, description: meta.description, commander, memberCount: members.length, color: meta.color };
  });
}

export default function Divisions() {
  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Primary', description: '', commander: '' });

  const divisions = buildDivisions(officers);

  useEffect(() => { api.get('/roster').then(r => setOfficers(r.data)).catch(() => {}); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    // Custom divisions (not one of the 5 core) can't yet persist to backend
    setShowForm(false);
    setForm({ name: '', type: 'Primary', description: '', commander: '' });
  };

  const typeColor: Record<string, string> = { Primary: 'text-blue-400 bg-blue-500/10', Specialist: 'text-purple-400 bg-purple-500/10', Support: 'text-green-400 bg-green-500/10' };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-500/20 p-6"
        style={{ background: 'linear-gradient(to right,rgba(99,102,241,0.1),rgba(79,70,229,0.05),rgba(59,130,246,0.1))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Briefcase className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Divisions</h1>
              <p className="text-gray-400 text-sm mt-0.5">{divisions.length} divisions · {officers.length} officers</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(to right,#4f46e5,#2563eb)' }}>
            <Plus className="w-4 h-4" /><span>Add Division</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700/50 shadow-xl" style={{ background: 'rgba(10,14,30,0.98)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
              <h2 className="text-lg font-bold text-white">Add Division</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Division Name</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Air Support Unit"
                  className="w-full px-3 py-2.5 rounded-xl text-white border-2 border-gray-700/50 focus:outline-none text-sm"
                  style={{ background: 'rgba(17,24,39,0.8)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-white border-2 border-gray-700/50 focus:outline-none text-sm"
                  style={{ background: 'rgba(17,24,39,0.8)' }}>
                  {['Primary', 'Specialist', 'Support'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-white border-2 border-gray-700/50 focus:outline-none text-sm resize-none"
                  style={{ background: 'rgba(17,24,39,0.8)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Commander</label>
                <input value={form.commander} onChange={e => setForm(p => ({ ...p, commander: e.target.value }))} placeholder="Name (Rank)"
                  className="w-full px-3 py-2.5 rounded-xl text-white border-2 border-gray-700/50 focus:outline-none text-sm"
                  style={{ background: 'rgba(17,24,39,0.8)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-700/50 text-gray-300 text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm"
                  style={{ background: 'linear-gradient(to right,#4f46e5,#2563eb)' }}>Add Division</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {divisions.map(d => (
          <div key={d.id} className="bg-gray-900/30 backdrop-blur-xl rounded-xl border border-gray-800/50 p-5 hover:border-indigo-500/20 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${d.color}20`, border: `1px solid ${d.color}40` }}>
                  <Briefcase className="w-5 h-5" style={{ color: d.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{d.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor[d.type] ?? 'text-gray-400 bg-gray-500/10'}`}>{d.type}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">{d.description}</p>
            <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" /><span>{d.memberCount} member{d.memberCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="text-sm text-gray-400">
                CO: <span className="text-gray-300">{d.commander || '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
