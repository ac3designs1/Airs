import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, Clock, BarChart2, FileText,
  AlertTriangle, Star, Briefcase, ArrowRightLeft, Award,
  ClipboardList, Settings, ChevronDown,
  X, Bell, Sword, UserCheck,
  ListChecks, Database, Key, AlertOctagon, Radio,
  TrendingUp, BookOpen, Megaphone, BadgeAlert, UserPlus, Car,
  MessageSquare, GraduationCap
} from 'lucide-react';
import { useAuth, hasSpecialRole } from '../contexts/AuthContext';
import api from '../api/client';

type Status = 'on_duty' | 'busy' | 'off_duty';

interface NavItem {
  id: string; title: string; path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number; roles?: string[]; specialRoles?: string[];
}
interface NavSection {
  id: string; title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[]; roles?: string[]; specialRoles?: string[];
  accentColor?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Senior Leadership', administrator: 'Senior Leadership', leadership: 'Leadership',
  senior_command: 'Senior Command', supervisor: 'Supervisor',
  officer: 'Officer', recruit: 'Recruit',
};

const STATUS_CONFIG: Record<Status, { label: string; dot: string; glow: string }> = {
  on_duty:  { label: 'On Duty',  dot: '#22c55e', glow: '0 0 8px rgba(34,197,94,0.9)' },
  busy:     { label: 'Busy',     dot: '#eab308', glow: '0 0 8px rgba(234,179,8,0.9)' },
  off_duty: { label: 'Off Duty', dot: '#475569', glow: 'none' },
};

export default function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { auth } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const role = auth.user?.role ?? 'officer';
  const isAdmin = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'].includes(role);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('nr-sidebar'); if (s) return new Set(JSON.parse(s)); } catch {}
    const defaults = ['overview', 'operations', 'records', 'training', 'leadership'];
    const userRole = auth.user?.role ?? 'officer';
    if (['commissioner', 'admin', 'administrator', 'leadership', 'senior_command'].includes(userRole)) {
      defaults.push('admin');
    }
    return new Set(defaults);
  });
  const [stats, setStats] = useState({ activeWarrants: 0, activeCalls: 0, activeBolos: 0, pendingApps: 0, pendingLeave: 0 });
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Status>((auth.user?.status as Status) ?? 'on_duty');

  useEffect(() => {
    api.get('/dispatch/stats').then(r => setStats(p => ({ ...p, activeWarrants: r.data.active_warrants ?? 0, activeCalls: r.data.active_calls ?? 0, activeBolos: r.data.active_bolos ?? 0 }))).catch(() => {});
    if (isAdmin) {
      api.get('/applications/stats').then(r => setStats(p => ({ ...p, pendingApps: r.data.pending ?? 0 }))).catch(() => {});
      api.get('/leave').then(r => setStats(p => ({ ...p, pendingLeave: r.data.filter((l: { status: string }) => l.status === 'pending').length }))).catch(() => {});
    }
  }, [isAdmin]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    localStorage.setItem('nr-sidebar', JSON.stringify([...next]));
    return next;
  });

  const changeStatus = (s: Status) => {
    setCurrentStatus(s);
    setStatusOpen(false);
    api.put('/roster/status', { status: s }).catch(() => {});
  };

  // canSee checks base role OR special roles
  const user = auth.user;
  const canSee = (item: { roles?: string[]; specialRoles?: string[] }) => {
    if (!item.roles && !item.specialRoles) return true;
    if (item.roles && item.roles.includes(role)) return true;
    if (item.specialRoles && user?.special_roles?.some(sr => item.specialRoles!.includes(sr))) return true;
    return false;
  };

  // Permission helpers
  const SENIOR_CMD = ['commissioner','admin','administrator','senior_command'];
  const LEADERSHIP  = ['commissioner','admin','administrator','leadership','senior_command'];
  const ALL_STAFF   = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];

  const sections: NavSection[] = [
    {
      id: 'overview', title: 'Overview', icon: LayoutDashboard, accentColor: '#a855f7',
      items: [
        { id: 'cmd', title: 'Command Centre', path: '/command-centre', icon: AlertOctagon, roles: LEADERSHIP, badge: stats.activeCalls || undefined },
        { id: 'db', title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { id: 'shifts', title: 'My Shifts', path: '/shifts', icon: Clock },
        { id: 'stats', title: 'Statistics', path: '/statistics', icon: BarChart2 },
      ],
    },
    {
      id: 'operations', title: 'Operations', icon: Radio, accentColor: '#ef4444',
      items: [
        { id: 'dispatch', title: 'In-City Requests', path: '/in-city-requests', icon: Radio },
        { id: 'warrants', title: 'Warrants', path: '/warrants', icon: AlertTriangle, badge: stats.activeWarrants || undefined },
        { id: 'bolos', title: 'BOLOs', path: '/bolos', icon: AlertOctagon, badge: stats.activeBolos || undefined },
        { id: 'incidents', title: 'Incidents', path: '/incidents', icon: FileText },
        { id: 'reports', title: 'Reports', path: '/reports', icon: ClipboardList },
        { id: 'fpo', title: 'FPO Tracker', path: '/fpo-tracker', icon: Shield, roles: LEADERSHIP },
        { id: 'roster', title: 'Officer Roster', path: '/roster', icon: Users },
        { id: 'weapons', title: 'Weapons Inventory', path: '/weapons-inventory', icon: Sword },
      ],
    },
    {
      id: 'myrecords', title: 'My Records', icon: BookOpen, accentColor: '#a78bfa',
      items: [
        { id: 'leave', title: 'Leave Requests', path: '/leave-requests', icon: ArrowRightLeft },
        { id: 'certs', title: 'Certifications', path: '/certifications', icon: Award },
        { id: 'rewards', title: 'Rewards', path: '/rewards', icon: Star },
        { id: 'divtransfer', title: 'Division Transfer', path: '/division-transfers', icon: Briefcase },
      ],
    },
    {
      // Training section: visible to FTO special roles AND leadership+
      id: 'training', title: 'Training', icon: UserCheck, accentColor: '#22c55e',
      roles: ALL_STAFF, specialRoles: ['fto','senior_fto','cirt_fto','academy_leadership'],
      items: [
        {
          id: 'recruit-tracker', title: 'Recruit Management', path: '/recruit-tracker', icon: GraduationCap,
          roles: LEADERSHIP, specialRoles: ['fto','senior_fto','academy_leadership'],
        },
        {
          id: 'cirt-recruit', title: 'CIRT Recruit Tracker', path: '/cirt-recruit-tracker', icon: Shield,
          roles: SENIOR_CMD, specialRoles: ['cirt_fto'],
        },
        {
          id: 'fto', title: 'FTO Tracking', path: '/fto-tracking', icon: Award,
          roles: ALL_STAFF, specialRoles: ['fto','senior_fto'],
        },
      ],
    },
    {
      id: 'leadership', title: 'Leadership', icon: TrendingUp, accentColor: '#f59e0b',
      roles: LEADERSHIP, specialRoles: ['academy_leadership'],
      items: [
        { id: 'lc',               title: 'Command Centre',      path: '/leadership-command',    icon: TrendingUp,  roles: LEADERSHIP, badge: (stats.pendingLeave + stats.pendingApps) || undefined },
        { id: 'academy-onboarding', title: 'Academy Onboarding', path: '/academy-onboarding',   icon: GraduationCap, roles: LEADERSHIP },
        { id: 'applications',     title: 'Applications',        path: '/leadership-applications', icon: UserPlus,  roles: SENIOR_CMD, specialRoles: ['academy_leadership'], badge: stats.pendingApps || undefined },
        { id: 'pending-req',      title: 'Pending Requests',    path: '/pending-requests',      icon: Bell,        roles: LEADERSHIP, badge: stats.pendingLeave || undefined },
        { id: 'announcements',    title: 'Announcements',       path: '/announcements',         icon: Megaphone,   roles: LEADERSHIP },
        { id: 'promotions',       title: 'Promotions',          path: '/promotions',            icon: TrendingUp,  roles: LEADERSHIP },
        { id: 'strikes',          title: 'Strikes & Demerits',  path: '/strikes',               icon: BadgeAlert,  roles: LEADERSHIP },
        // Termination Approval: Senior Command + Commissioner ONLY
        { id: 'termapproval',     title: 'Termination Approval', path: '/termination-approval', icon: AlertTriangle, roles: SENIOR_CMD },
        { id: 'analytics',        title: 'Duty Analytics',      path: '/duty-analytics',        icon: BarChart2,   roles: LEADERSHIP },
        { id: 'mdt',              title: 'Officer Management',  path: '/mdt',                   icon: Users,       roles: LEADERSHIP },
        { id: 'termlogs',         title: 'Termination Logs',    path: '/termination-logs',      icon: ListChecks,  roles: SENIOR_CMD },
        { id: 'feedback-view',    title: 'Feedback Review',     path: '/feedback',              icon: MessageSquare, roles: LEADERSHIP },
      ],
    },
    {
      id: 'admin', title: 'Administration', icon: Key, accentColor: '#f43f5e',
      roles: SENIOR_CMD,
      items: [
        { id: 'users',   title: 'User Management',  path: '/users',            icon: Users,     roles: SENIOR_CMD },
        { id: 'divisions', title: 'Divisions',      path: '/divisions',        icon: Briefcase, roles: SENIOR_CMD },
        { id: 'roles',   title: 'Role Permissions', path: '/role-permissions', icon: Key,       roles: ['commissioner','admin','administrator'] },
        { id: 'admindb', title: 'Admin Panel',      path: '/admin',            icon: Settings,  roles: ['commissioner','admin','administrator'] },
        { id: 'dbstats', title: 'Database Stats',   path: '/database-stats',   icon: Database,  roles: ['commissioner','admin','administrator'] },
      ],
    },
    {
      id: 'personal', title: 'Personal', icon: Settings, accentColor: '#64748b',
      items: [
        { id: 'settings',  title: 'Settings',  path: '/settings',  icon: Settings },
        { id: 'feedback',  title: 'Feedback',  path: '/feedback',  icon: MessageSquare },
      ],
    },
  ];

  const statusConf = STATUS_CONFIG[currentStatus];
  const user = auth.user;

  const SidebarContent = (
    <div className="h-full flex flex-col select-none" style={{ background: '#06060a', borderRight: '1px solid rgba(168,85,247,0.12)' }}>

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(168,85,247,0.10)' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <img src="/airs-logo.png" alt="AIRS" draggable={false}
                style={{ height: '28px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.55))' }} />
            </div>
            <div className="absolute -top-0.5 right-3 w-2 h-2 bg-green-400 rounded-full border-2 animate-pulse"
              style={{ borderColor: '#06060a', boxShadow: '0 0 5px rgba(34,197,94,0.9)' }} />
          </div>
        <button className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5" onClick={() => setMobileOpen(false)}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Officer card ──────────────────────────────────── */}
      {user && (
        <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-3 relative"
            style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.12)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate leading-none">
                {(user as unknown as { in_city_name?: string }).in_city_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">{user.callsign || user.rank}</div>
            </div>

            {/* Status badge + dropdown */}
            <div className="relative flex-shrink-0">
              <button onClick={() => setStatusOpen(o => !o)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                style={{ background: 'rgba(168,85,247,0.06)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: statusConf.dot, boxShadow: statusConf.glow }} />
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl overflow-hidden z-50 shadow-xl"
                    style={{ background: '#0d0a14', border: '1px solid rgba(168,85,247,0.20)' }}>
                    {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([s, c]) => (
                      <button key={s} onClick={() => changeStatus(s)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors ${currentStatus === s ? 'text-white bg-purple-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot, boxShadow: currentStatus === s ? c.glow : 'none' }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 nav-scrollbar px-2">
        {sections.filter(s => canSee(s)).map(section => {
          const SIcon = section.icon;
          const isOpen = expanded.has(section.id);
          const visible = section.items.filter(canSee);
          if (visible.length === 0) return null;
          const isActive = visible.some(i => location.pathname === i.path);

          return (
            <div key={section.id} className="mb-0.5">
              <button onClick={() => toggle(section.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                  isActive && !isOpen ? 'text-slate-300' : 'text-slate-600 hover:text-slate-400'}`}>
                <div className="flex items-center gap-2">
                  <SIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[10.5px] font-semibold tracking-[0.09em] uppercase">{section.title}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {visible.map(item => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                      <NavLink key={item.id} to={item.path} onClick={() => setMobileOpen(false)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-[10px] text-sm transition-all ${active ? 'nav-active' : 'nav-item text-slate-500'}`}>
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-purple-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                          <span className={`font-semibold text-sm ${active ? 'text-purple-300' : 'group-hover:text-slate-300'}`}>{item.title}</span>
                        </div>
                        {item.badge != null && item.badge > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: '#ef4444', color: 'white', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(168,85,247,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
            style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
          <span className="text-[10px] font-mono text-slate-600">NextAirs v2.0</span>
        </div>
        {isAdmin && (
          <button onClick={() => nav('/admin')} className="text-[10px] font-mono text-rose-500/60 hover:text-rose-400 transition-colors">
            LEADERSHIP
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block fixed inset-y-0 left-0 w-[240px] z-30">{SidebarContent}</div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[240px] flex-shrink-0 z-50">{SidebarContent}</div>
        </div>
      )}
    </>
  );
}
