import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Car,
  UserCheck,
  FileText,
  Activity,
  Plus,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { NotificationItem } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

export const TopNavbar: React.FC<{ onMobileMenuToggle: () => void }> = ({
  onMobileMenuToggle,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Omni-search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    requirements: any[];
    vehicles: any[];
    activities: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced omni-search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res: any = await api.get(`/search/global?q=${encodeURIComponent(searchQuery)}`);
        if (res.success && res.data) {
          setSearchResults(res.data);
          setIsSearchOpen(true);
        }
      } catch (err) {
        console.error('Omni-search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res: any = await api.get('/audit/notifications');
        if (res.success && res.data) {
          setNotifications(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await api.patch('/audit/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Mobile Menu Button & Brand */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          onClick={onMobileMenuToggle}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-brand-500/20">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
              <path d="m13 6 3-3h3" />
            </svg>
          </div>
          <span className="font-display font-bold text-sm text-slate-900">
            Drive<span className="text-brand-600 font-extrabold">Pulse</span>
          </span>
        </div>
      </div>

      {/* Global Omni-Search Bar */}
      <div ref={searchRef} className="relative hidden sm:block w-72 md:w-80 lg:w-96">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search customers, vehicles, leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setIsSearchOpen(true);
            }}
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-md pl-9 pr-14 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
          <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
            {isSearching ? (
              <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 rounded border border-slate-300">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {/* Grouped Omni-Search Results Popup */}
        {isSearchOpen && searchResults && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-dropdown overflow-hidden max-h-96 overflow-y-auto z-50 p-2 space-y-2.5">
            {/* Customers */}
            {searchResults.customers.length > 0 && (
              <div>
                <div className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-500" /> Customers ({searchResults.customers.length})
                </div>
                <div className="space-y-0.5 mt-1">
                  {searchResults.customers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(`/customers/${c.id}`);
                      }}
                      className="px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-medium text-slate-900">{c.fullName}</span>
                        <span className="text-slate-500 ml-2">{c.primaryMobile}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{c.city || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements / Leads */}
            {searchResults.requirements.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100">
                <div className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500" /> Requirements ({searchResults.requirements.length})
                </div>
                <div className="space-y-0.5 mt-1">
                  {searchResults.requirements.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(`/requirements/${r.id}`);
                      }}
                      className="px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-medium text-slate-900">
                          {r.brand || ''} {r.model || 'Lead'}
                        </span>
                        <span className="text-slate-500 ml-2">· {r.customer?.fullName}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicles */}
            {searchResults.vehicles.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100">
                <div className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Car className="w-3 h-3 text-slate-500" /> Inventory ({searchResults.vehicles.length})
                </div>
                <div className="space-y-0.5 mt-1">
                  {searchResults.vehicles.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(`/inventory/${v.id}`);
                      }}
                      className="px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-medium text-slate-900">
                          {v.make} {v.model} ({v.manufacturingYear})
                        </span>
                        <span className="text-slate-500 ml-2">· {v.location}</span>
                      </div>
                      <span className="font-medium text-slate-900">
                        ₹{(v.price / 100000).toFixed(1)}L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.customers.length === 0 &&
              searchResults.requirements.length === 0 &&
              searchResults.vehicles.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  No records found for "{searchQuery}"
                </div>
              )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Quick New Lead Button */}
        <button
          onClick={() => navigate('/customers?create=true')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-medium shadow-subtle transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lead</span>
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-lg shadow-dropdown overflow-hidden z-50">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-900">Notifications ({unreadNotifs})</span>
                {unreadNotifs > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setIsNotifOpen(false);
                        if (n.link) navigate(n.link);
                      }}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <h5 className="text-xs font-medium text-slate-900">{n.title}</h5>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-dropdown overflow-hidden z-50 p-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="py-0.5">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
