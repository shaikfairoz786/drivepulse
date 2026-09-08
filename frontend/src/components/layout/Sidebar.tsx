import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Car,
  Sparkles,
  CalendarClock,
  BarChart3,
  ShieldCheck,
  History,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user, isAdmin, isManager } = useAuth();

  const mainNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Leads / Requirements', path: '/requirements', icon: FileSpreadsheet },
    { label: 'Inventory', path: '/inventory', icon: Car },
    { label: 'Matching', path: '/matching', icon: Sparkles },
    { label: 'Follow-ups', path: '/followups', icon: CalendarClock },
    ...(isManager
      ? [
          { label: 'Reports', path: '/reports', icon: BarChart3 },
        ]
      : []),
  ];

  const adminNavItems = [
    ...(isAdmin
      ? [
          { label: 'Users & Roles', path: '/admin/users', icon: ShieldCheck },
          { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-brand-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg className="w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
                <path d="m13 6 3-3h3" />
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1">
                Drive<span className="text-brand-600 font-extrabold">Pulse</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-brand-50 text-brand-700 font-bold border border-brand-200">OS</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-medium -mt-0.5 tracking-wide">
                Automotive Sales Cloud
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Workspace
            </div>
            <div className="space-y-0.5">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          {adminNavItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Administration
              </div>
              <div className="space-y-0.5">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose()}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile bottom widget */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-300">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.fullName || 'Sales Executive'}
              </div>
              <div className="text-[11px] text-slate-500 truncate capitalize">
                {user?.role?.toLowerCase().replace('_', ' ') || 'Staff'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
