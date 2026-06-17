import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Search, X, ChevronDown, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Call {
  id: string; call_number: string; type: string; description: string;
  location: string; priority: number; status: string; caller_name: string; created_at: string;
}

const CALL_TYPES = ['Traffic Stop', 'Shots Fired', 'Domestic Disturbance', 'Robbery in Progress',
  'Vehicle Pursuit', 'Medical Emergency', 'Suspicious Person', 'Noise Complaint', 'Traffic Accident', 'Welfare Check'];
const priorityColor: Record<number, string> = {
  1: 'text-red-400 bg-red-500/10 border-red-500/30',
  2: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  3: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};
const statusColor: Record<string, string> = {
  active: 'text-green-400 bg-green-500/10 border-green-500/30',
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  closed: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export default function InCityRequests() {
  const { auth } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Traffic Stop', description: '', location: '', priority: '3', caller_name: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/dispatch?${params}`).then(r => { setCalls(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/dispatch/calls', { ...form, priority: parseInt(form.priority) });
      setShowForm(false);
      setForm({ type: 'Traffic Stop', description: '', location: '', priority: '3', caller_name: '' });
      load();
    } catch {}
    setSubmitting(false);
  };

  const closeCall = async (id: string) => {
    await api.put(`/dispatch/calls/${id}`, { status: 'closed' });
    load();
  };

  const filtered = calls.filter(c => {
    const q = search.toLowerCase();
    return !q || c.type.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.call_number?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-800/50 p-6"
        style={{ background: 'linear-gradient(to right,rgba(59,130,246,0.1),rgba(99,102,241,0.05),rgba(168,85,247,0.1))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <ClipboardList className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">In-City Requests</h1>
              <p className="text-gray-400 text-sm mt-0.5">{filtered.length} call{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(to right,#2563eb,#4f46e5)' }}>
            <Plus className="w-4 h-4" /><span>New Call</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search calls..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-700/50 focus:border-blue-500/50 focus:outline-none text-sm"
            style={{ background: 'rgba(17,24,39,0.5)' }} />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-gray-700/50">
          {[{ v: '', l: 'All' }, { v: 'active', l: 'Active' }, { v: 'pending', l: 'Pending' }, { v: 'closed', l: 'Closed' }].map(s => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)}
              className={`px-3 py-2.5 text-sm transition-colors ${statusFilter === s.v ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800/40'}`}>{s.l}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700/50 shadow-xl" style={{ background: 'rgba(10,14,30,0.98)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
              <h2 className="text-lg font-bold text-white">Log New Call</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Call Type</label>
                  <div className="relative">
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-white border-2 border-gray-700/50 focus:border-blue-500/50 focus:outline-none text-sm"
                      style={{ background: 'rgba(17,24,39,0.8)' }}>
                      {CALL_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
                  <div className="relative">
                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-white border-2 border-gray-700/50 focus:border-blue-500/50 focus:outline-none text-sm"
                      style={{ background: 'rgba(17,24,39,0.8)' }}>
                      <option value="1">P1 — Critical</option>
                      <option value="2">P2 — High</option>
                      <option value="3">P3 — Medium</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
                <input required value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="Grove St & Forum Dr"
                  className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-700/50 focus:border-blue-500/50 focus:outline-none text-sm"
                  style={{ background: 'rgba(17,24,39,0.8)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Details of the call..."
                  className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-700/50 focus:border-blue-500/50 focus:outline-none text-sm resize-none"
                  style={{ background: 'rgba(17,24,39,0.8)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Caller Name (optional)</label>
                <input value={form.caller_name} onChange={e => setForm(p => ({ ...p, caller_name: e.target.value }))}
                  placeholder="Anonymous"
                  className="w-full px-3 py-2.5 rounded-xl text-white placeholder-gray-500 border-2 border-gray-700/50 focus:border-blue-500/50 focus:outline-none text-sm"
                  style={{ background: 'rgba(17,24,39,0.8)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700/50 text-gray-300 hover:bg-gray-800/50 text-sm">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm"
                  style={{ background: 'linear-gradient(to right,#2563eb,#4f46e5)' }}>
                  {submitting ? 'Logging...' : 'Log Call'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 rounded-2xl border border-gray-800/50 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No calls found</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-gray-900/30 backdrop-blur-xl rounded-xl border border-gray-800/50 p-5 hover:border-gray-700/50 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${priorityColor[c.priority] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                    P{c.priority}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs border capitalize ${statusColor[c.status] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{c.call_number}</span>
                </div>
                <h3 className="text-white font-semibold">{c.type}</h3>
                {c.description && <p className="text-sm text-gray-400 mt-1">{c.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                  {c.caller_name && <span>Caller: {c.caller_name}</span>}
                </div>
              </div>
              {c.status !== 'closed' && (
                <button onClick={() => closeCall(c.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border border-gray-700/50 text-gray-300 hover:bg-gray-800/50 transition-colors">
                  Close
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
