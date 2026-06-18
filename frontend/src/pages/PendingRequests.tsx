import { useEffect, useState } from 'react';
import { Bell, CheckCircle, X, Clock, User, ArrowRightLeft, Star, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import api from '../api/client';
import toast from 'react-hot-toast';

interface LeaveReq { id: string; officer_name: string; callsign?: string; leave_type: string; start_date: string; end_date: string; reason: string; status: string; created_at: string; }
interface TransferReq { id: string; officer_name: string; officer_callsign?: string; from_division: string; to_division: string; why_transfer?: string; status: string; created_at: string; }
interface CertApp { id: string; officer_name: string; callsign?: string; cert_name: string; why_interested: string; status: string; created_at: string; }

type ItemType = 'leave' | 'transfer' | 'cert';
interface Item { id: string; type: ItemType; officer_name: string; callsign?: string; title: string; detail: string; status: string; created_at: string; }

function mapLeave(l: LeaveReq): Item {
  return { id: l.id, type: 'leave', officer_name: l.officer_name, callsign: l.callsign, title: `${l.leave_type?.replace('_',' ')} Leave`, detail: `${format(new Date(l.start_date), 'dd MMM')} → ${format(new Date(l.end_date), 'dd MMM yyyy')}${l.reason ? ` · ${l.reason}` : ''}`, status: l.status, created_at: l.created_at };
}
function mapTransfer(t: TransferReq): Item {
  return { id: t.id, type: 'transfer', officer_name: t.officer_name, callsign: t.officer_callsign, title: 'Division Transfer', detail: `${t.from_division} → ${t.to_division}${t.why_transfer ? ` · ${t.why_transfer}` : ''}`, status: t.status, created_at: t.created_at };
}
function mapCert(c: CertApp): Item {
  return { id: c.id, type: 'cert', officer_name: c.officer_name, callsign: c.callsign, title: `Cert Application: ${c.cert_name}`, detail: c.why_interested ?? '', status: c.status, created_at: c.created_at };
}

const TYPE_ICON: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  leave: Calendar, transfer: ArrowRightLeft, cert: Star,
};
const TYPE_CLS: Record<ItemType, string> = {
  leave: 'chip chip-blue', transfer: 'chip chip-purple', cert: 'chip chip-gold',
};
const STATUS_CLS: Record<string, string> = {
  pending: 'chip chip-yellow', approved: 'chip chip-green', rejected: 'chip chip-red', denied: 'chip chip-red',
};

export default function PendingRequests() {
  const [items,      setItems]      = useState<Item[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<'pending' | 'all'>('pending');
  const [processing, setProcessing] = useState<Item | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [noteText,   setNoteText]   = useState('');

  async function load() {
    try {
      const [l, t, c] = await Promise.all([
        api.get('/leave'), api.get('/transfers'), api.get('/certifications'),
      ]);
      setItems([
        ...(l.data as LeaveReq[]).map(mapLeave),
        ...((t.data?.transfers ?? t.data ?? []) as TransferReq[]).map(mapTransfer),
        ...(c.data as CertApp[]).map(mapCert),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const displayed = items.filter(i => tab === 'pending' ? i.status === 'pending' : true);
  const pending = items.filter(i => i.status === 'pending').length;

  function openProcess(item: Item, action: 'approved' | 'rejected') {
    setProcessing(item); setActionType(action); setNoteText('');
  }

  async function confirm() {
    if (!processing || !actionType) return;
    try {
      const endpoint = processing.type === 'leave' ? `/leave/${processing.id}`
        : processing.type === 'transfer' ? `/transfers/${processing.id}`
        : `/certifications/${processing.id}`;
      // All denial actions use 'denied' — certifications and transfers reject 'rejected'
      const resolvedStatus = actionType === 'rejected' ? 'denied' : actionType;
      const body = { status: resolvedStatus, review_notes: noteText };
      await api.put(endpoint, body);
      setItems(prev => prev.map(i => i.id === processing.id ? { ...i, status: resolvedStatus } : i));
      toast.success(`Request ${actionType}`);
    } catch { toast.error('Failed to update'); }
    setProcessing(null); setActionType(null);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(234,179,8,0.06))', border: '1px solid rgba(249,115,22,0.20)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl relative" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <Bell className="w-6 h-6 text-orange-400" />
            {pending > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{pending}</span>}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Pending Requests</h1>
            <p className="text-slate-500 text-sm">{pending > 0 ? `${pending} awaiting review` : 'All caught up'} · leave, transfers & cert applications</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid rgba(168,85,247,0.12)' }}>
        {([['pending','Pending',pending],['all','All',items.length]] as [string,string,number][]).map(([v,l,c]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-all ${tab === v ? 'bg-orange-500/15 text-orange-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
            {l}
            {c > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">{c}</span>}
          </button>
        ))}
      </div>

      {/* Confirm modal */}
      {processing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="p-5" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h2 className="font-bold text-white">{actionType === 'approved' ? '✓ Approve' : '✗ Deny'} Request</h2>
              <p className="text-sm text-slate-500 mt-1">{processing.title} · {processing.officer_name}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Response Note (optional)</label>
                <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note for the officer…" className="nx-input resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setProcessing(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={confirm}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-white text-sm transition-all ${actionType === 'approved' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                  {actionType === 'approved' ? 'Approve' : 'Deny'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading requests…</div>
      ) : displayed.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600 opacity-30" />
          <p className="text-slate-500">No {tab === 'pending' ? 'pending ' : ''}requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(r => {
            const Icon = TYPE_ICON[r.type];
            return (
              <div key={`${r.type}-${r.id}`} className={`glass rounded-xl p-4 transition-all ${r.status === 'pending' ? 'border-orange-500/15' : 'opacity-75'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(168,85,247,0.06)' }}>
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={TYPE_CLS[r.type]}>{r.title}</span>
                        <span className={STATUS_CLS[r.status] ?? 'chip chip-gray'}>
                          {r.status === 'pending' ? <Clock className="w-2.5 h-2.5" /> : r.status === 'approved' ? <CheckCircle className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                          <span className="capitalize">{r.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white font-medium text-sm">{r.officer_name}</span>
                        {r.callsign && <span className="text-xs text-purple-400 font-mono">{r.callsign}</span>}
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2">{r.detail}</p>
                      <p className="text-xs text-slate-600 mt-1">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openProcess(r, 'approved')}
                        className="p-2 rounded-lg text-green-400 hover:bg-green-500/15 transition-colors" style={{ border: '1px solid rgba(34,197,94,0.25)' }}>
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => openProcess(r, 'rejected')}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
