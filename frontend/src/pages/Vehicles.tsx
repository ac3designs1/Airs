import { useEffect, useState, FormEvent } from 'react';
import { Car, Search, Plus, X, AlertTriangle, Save, User, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Vehicle {
  id: string; plate: string; make?: string; model?: string; year?: string; color?: string;
  vin?: string; owner_id?: string; owner_name?: string; registration_status: string;
  insurance_status: string; stolen: number; impounded: number; notes?: string;
  flags?: string; license_status?: string; citizen_id?: string;
}

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const REG_CFG: Record<string, string> = {
  valid: 'chip-green', expired: 'chip-yellow', suspended: 'chip-red', unregistered: 'chip-red',
};

const blank = {
  plate: '', make: '', model: '', year: '', color: '',
  vin: '', owner_id: '', registration_status: 'valid', insurance_status: 'valid', notes: '',
};

export default function Vehicles() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [mode, setMode] = useState<'search' | 'browse'>('search');
  const [plate, setPlate] = useState('');
  const [result, setResult] = useState<Vehicle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [looking, setLooking] = useState(false);
  const [browse, setBrowse] = useState<Vehicle[]>([]);
  const [browseQ, setBrowseQ] = useState('');
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;
    setLooking(true); setResult(null); setNotFound(false);
    try {
      const r = await api.get(`/vehicles/plate/${plate.trim().toUpperCase()}`);
      setResult(r.data);
    } catch { setNotFound(true); }
    finally { setLooking(false); }
  };

  const loadBrowse = async (q: string) => {
    setLoadingBrowse(true);
    try { const r = await api.get(`/vehicles?q=${encodeURIComponent(q)}&limit=40`); setBrowse(r.data.vehicles); }
    finally { setLoadingBrowse(false); }
  };

  useEffect(() => {
    if (mode === 'browse') {
      const t = setTimeout(() => loadBrowse(browseQ), 300);
      return () => clearTimeout(t);
    }
  }, [browseQ, mode]);

  useEffect(() => { if (mode === 'browse') loadBrowse(''); }, [mode]);

  const toggleFlag = async (v: Vehicle, flag: 'stolen' | 'impounded') => {
    const updated = await api.put(`/vehicles/${v.id}`, {
      ...v, stolen: flag === 'stolen' ? (v.stolen ? 0 : 1) : v.stolen,
      impounded: flag === 'impounded' ? (v.impounded ? 0 : 1) : v.impounded,
    });
    setResult(updated.data);
    setBrowse(prev => prev.map(x => x.id === updated.data.id ? updated.data : x));
  };

  const saveVehicle = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editTarget) {
        const r = await api.put(`/vehicles/${editTarget.id}`, form);
        setResult(r.data); setBrowse(prev => prev.map(x => x.id === r.data.id ? r.data : x));
      } else {
        const r = await api.post('/vehicles', form);
        setResult(r.data); setMode('search'); setPlate(r.data.plate);
        if (mode === 'browse') setBrowse(prev => [r.data, ...prev]);
      }
      setShowForm(false); setEditTarget(null);
    } finally { setSaving(false); }
  };

  const openEdit = (v: Vehicle) => {
    setEditTarget(v);
    setForm({ plate: v.plate, make: v.make ?? '', model: v.model ?? '', year: v.year ?? '', color: v.color ?? '', vin: v.vin ?? '', owner_id: v.owner_id ?? '', registration_status: v.registration_status, insurance_status: v.insurance_status, notes: v.notes ?? '' });
    setShowForm(true);
  };

  const StatusBadges = ({ v }: { v: Vehicle }) => (
    <div className="flex flex-wrap gap-2">
      <span className={`chip text-xs ${REG_CFG[v.registration_status] ?? 'chip-gray'}`}>
        Rego: {v.registration_status}
      </span>
      <span className={`chip text-xs ${REG_CFG[v.insurance_status] ?? 'chip-gray'}`}>
        Insurance: {v.insurance_status}
      </span>
      {v.stolen ? <span className="chip chip-red text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />STOLEN</span> : null}
      {v.impounded ? <span className="chip chip-yellow text-xs">IMPOUNDED</span> : null}
      {v.license_status && v.license_status !== 'valid' && (
        <span className="chip chip-red text-xs flex items-center gap-1"><User className="w-3 h-3" />Owner Licence {v.license_status}</span>
      )}
    </div>
  );

  const VehicleCard = ({ v }: { v: Vehicle }) => (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sky-400 text-xl font-bold">{v.plate}</span>
            {v.stolen ? <span className="chip chip-red text-xs animate-pulse">⚠ STOLEN</span> : null}
          </div>
          <p className="text-white font-semibold">{[v.year, v.color, v.make, v.model].filter(Boolean).join(' ') || 'Unknown Vehicle'}</p>
          {v.vin && <p className="text-xs text-slate-600 font-mono mt-0.5">VIN: {v.vin}</p>}
          {v.owner_name && (
            <div className="flex items-center gap-1.5 mt-2">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm text-slate-400">Registered to:</span>
              <span className="text-sm text-white font-medium">{v.owner_name}</span>
              {v.license_status && v.license_status !== 'valid' && (
                <span className="chip chip-red text-[10px] ml-1">Licence {v.license_status}</span>
              )}
            </div>
          )}
          <div className="mt-3"><StatusBadges v={v} /></div>
          {v.notes && <p className="text-xs text-slate-500 mt-2">{v.notes}</p>}
        </div>
        {isLeader && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={() => openEdit(v)} className="px-3 py-1.5 rounded-lg text-xs font-bold chip-blue flex items-center gap-1">
              <Save className="w-3 h-3" /> Edit
            </button>
            <button onClick={() => toggleFlag(v, 'stolen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${v.stolen ? 'chip-gray' : 'chip-red'}`}>
              {v.stolen ? 'Clear Stolen' : 'Flag Stolen'}
            </button>
            <button onClick={() => toggleFlag(v, 'impounded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${v.impounded ? 'chip-gray' : 'chip-yellow'}`}>
              {v.impounded ? 'Clear Impound' : 'Impound'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(14,165,233,0.06))', border: '1px solid rgba(16,185,129,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Car className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Vehicles</h1>
              <p className="text-slate-500 text-sm">Plate lookup & vehicle registry</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.08)' }}>
              {(['search', 'browse'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${mode === m ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  {m === 'search' ? 'Plate Lookup' : 'Browse All'}
                </button>
              ))}
            </div>
            {isLeader && (
              <button onClick={() => { setShowForm(true); setEditTarget(null); setForm({ ...blank }); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Plus className="w-4 h-4" /> Register Vehicle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plate lookup */}
      {mode === 'search' && (
        <div className="space-y-4">
          <form onSubmit={lookup} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="Enter plate number…" maxLength={10}
                className="nx-input pl-10 w-full font-mono text-lg tracking-widest uppercase" />
            </div>
            <button type="submit" disabled={looking}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)', border: '1px solid rgba(16,185,129,0.3)' }}>
              {looking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              {looking ? 'Searching…' : 'Lookup'}
            </button>
          </form>

          {notFound && (
            <div className="glass rounded-xl p-6 text-center">
              <Car className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-400 font-semibold">No vehicle found for plate <span className="font-mono text-sky-400">{plate}</span></p>
              <p className="text-slate-600 text-sm mt-1">Plate not registered in system.</p>
            </div>
          )}

          {result && <VehicleCard v={result} />}

          {!result && !notFound && !looking && (
            <div className="glass rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <Car className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-500 text-sm">Enter a licence plate to run an instant vehicle check</p>
              <p className="text-slate-700 text-xs mt-1">Returns registration, insurance, stolen flag and owner details</p>
            </div>
          )}
        </div>
      )}

      {/* Browse mode */}
      {mode === 'browse' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={browseQ} onChange={e => setBrowseQ(e.target.value)}
              placeholder="Search plate, make, model…" className="nx-input pl-10 w-full" />
          </div>
          {loadingBrowse ? <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
          : browse.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-slate-600 text-sm">No vehicles registered.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {browse.map(v => <VehicleCard key={v.id} v={v} />)}
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(16,185,129,0.10)', background: 'rgba(16,185,129,0.05)' }}>
              <h2 className="text-base font-bold text-white">{editTarget ? 'Edit Vehicle' : 'Register Vehicle'}</h2>
              <button onClick={() => { setShowForm(false); setEditTarget(null); }} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveVehicle} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { k: 'plate', l: 'Plate', req: true, p: 'ABC123', upper: true },
                  { k: 'make', l: 'Make', p: 'Toyota' },
                  { k: 'model', l: 'Model', p: 'Camry' },
                  { k: 'year', l: 'Year', p: '2022' },
                  { k: 'color', l: 'Colour', p: 'White' },
                  { k: 'vin', l: 'VIN (optional)', p: '' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">{f.l}{f.req && <span className="text-rose-400 ml-0.5">*</span>}</label>
                    <input required={f.req} value={(form as Record<string, string>)[f.k]} placeholder={f.p}
                      onChange={e => setForm(p => ({ ...p, [f.k]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                      className={`nx-input w-full${f.upper ? ' font-mono' : ''}`} />
                  </div>
                ))}
                {[
                  { k: 'registration_status', l: 'Rego Status', opts: ['valid', 'expired', 'suspended', 'unregistered'] },
                  { k: 'insurance_status', l: 'Insurance', opts: ['valid', 'expired', 'none'] },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">{f.l}</label>
                    <select value={(form as Record<string, string>)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Notes</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="nx-input w-full" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                  <CheckCircle className="w-4 h-4" />{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
