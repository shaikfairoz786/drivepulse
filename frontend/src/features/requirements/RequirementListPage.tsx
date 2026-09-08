import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Filter,
  Car,
  Truck,
  Phone,
  User,
  Calendar,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../../services/api';
import { CustomerRequirement, LeadStatus, Priority, VehicleCategory } from '../../types';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { formatBudgetRange, formatRelativeTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const RequirementListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [ownershipScope, setOwnershipScope] = useState<'MY_LEADS' | 'ALL_LEADS'>(
    isManager ? 'ALL_LEADS' : 'MY_LEADS'
  );
  const [viewMode, setViewMode] = useState<'TABLE' | 'BOARD'>('TABLE');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // In BOARD view, fetch up to 500 leads so all Kanban columns have all their active leads!
  const effectiveLimit = viewMode === 'BOARD' ? 500 : pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ['requirements', searchTerm, statusFilter, categoryFilter, ownershipScope, page, effectiveLimit, viewMode, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (ownershipScope === 'MY_LEADS' && user?.id) {
        params.set('assignedToId', user.id);
      }
      params.set('page', String(viewMode === 'BOARD' ? 1 : page));
      params.set('limit', String(effectiveLimit));
      const res: any = await api.get(`/requirements?${params.toString()}`);
      return res;
    },
  });

  const rawRequirements: CustomerRequirement[] = data?.data || [];
  
  // Prioritize logged-in user's assigned leads at the very top of the list
  const requirements = React.useMemo(() => {
    if (!user?.id) return rawRequirements;
    return [...rawRequirements].sort((a, b) => {
      const aMine = a.assignedToId === user.id ? 1 : 0;
      const bMine = b.assignedToId === user.id ? 1 : 0;
      if (aMine !== bMine) {
        return bMine - aMine; // User's assigned leads first
      }
      return 0;
    });
  }, [rawRequirements, user?.id]);

  const meta = data?.meta || { total: 0, page: 1, totalPages: 1, limit: effectiveLimit };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter || categoryFilter);

  // Group requirements for Kanban view
  const pipelineStages = [
    { key: 'NEW', label: 'New Enquiry', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'CONTACTED', label: 'Contacted', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
    { key: 'REQUIREMENT_CONFIRMED', label: 'Req Confirmed', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { key: 'VEHICLE_MATCHED', label: 'Stock Matched', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'INTERESTED', label: 'Interested', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'VISIT_SCHEDULED', label: 'Visit / Yard', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
    { key: 'TEST_DRIVE', label: 'Test Drive', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'NEGOTIATION', label: 'Negotiation', badgeColor: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'BOOKING', label: 'Booking', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { key: 'WON', label: 'Won / Delivered', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'LOST', label: 'Lost Deal', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Leads & Requirements
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold font-mono border border-slate-200">
              {meta.total} Total Leads
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Active customer purchase enquiries, showroom stock matches, and deal pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ownership Toggle: My Leads vs All Leads */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            <button
              onClick={() => { setOwnershipScope('MY_LEADS'); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all ${
                ownershipScope === 'MY_LEADS' ? 'bg-white text-brand-700 font-bold shadow-subtle' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Leads
            </button>
            <button
              onClick={() => { setOwnershipScope('ALL_LEADS'); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all ${
                ownershipScope === 'ALL_LEADS' ? 'bg-white text-slate-900 font-bold shadow-subtle' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Leads
            </button>
          </div>

          {/* Table / Kanban Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('BOARD')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'BOARD' ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pipeline Board
            </button>
          </div>

          <Button
            onClick={() => setIsCustomerModalOpen(true)}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Lead
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search brand, model, customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            <option value="PASSENGER">🚗 Passenger Cars</option>
            <option value="COMMERCIAL">🚚 Commercial Fleets</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Stages</option>
            <option value="NEW">New Enquiry</option>
            <option value="CONTACTED">Contacted</option>
            <option value="REQUIREMENT_CONFIRMED">Req Confirmed</option>
            <option value="VEHICLE_MATCHED">Stock Matched</option>
            <option value="TEST_DRIVE">Test Drive</option>
            <option value="NEGOTIATION">Negotiation</option>
            <option value="BOOKING">Booking</option>
            <option value="WON">Won (Delivered)</option>
            <option value="LOST">Lost</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Content View: Table or Kanban Board */}
      {isLoading ? (
        <LoadingSpinner message="Loading active leads..." />
      ) : requirements.length === 0 ? (
        <EmptyState
          title="No customer leads found"
          description={hasActiveFilters ? "No requirements match your active filter criteria." : "Start by registering your first customer enquiry."}
          actionLabel={hasActiveFilters ? "Clear Filters" : "Register Lead"}
          onAction={hasActiveFilters ? clearFilters : () => setIsCustomerModalOpen(true)}
        />
      ) : viewMode === 'TABLE' ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4">Lead / Vehicle</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Budget Range</th>
                  <th className="py-2.5 px-4">Pipeline Stage</th>
                  <th className="py-2.5 px-4">Stock Matches</th>
                  <th className="py-2.5 px-4">Assigned Staff</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requirements.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/requirements/${req.id}`)}
                    className="table-row cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {req.brand || ''} {req.model || 'Requirement'} {req.variant || ''}
                        </span>
                        {user?.id && req.assignedToId === user.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Assigned to You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">
                          {req.category === VehicleCategory.COMMERCIAL ? 'Commercial' : 'Passenger'}
                        </span>
                        {req.fuelType && req.fuelType !== 'ANY' && (
                          <>
                            <span>•</span>
                            <span>{req.fuelType}</span>
                          </>
                        )}
                        {req.minYear && (
                          <>
                            <span>•</span>
                            <span>{req.minYear}+</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {req.customer?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {req.customer?.primaryMobile}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatBudgetRange(req.minBudget, req.maxBudget)}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>

                    <td className="py-3 px-4">
                      {(() => {
                        const validMatchesCount = (req.matches || []).filter((m: any) => (m.matchScore || 0) >= 50).length;
                        return validMatchesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            {validMatchesCount} matches
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 matches</span>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {req.assignedTo?.fullName ? (
                        <span className="font-medium text-slate-800">{req.assignedTo.fullName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                        View Lead →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination & Toolbar */}
          {meta.total > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-slate-900">{((page - 1) * meta.limit) + 1} - {Math.min(page * meta.limit, meta.total)}</strong> of <strong className="text-slate-900">{meta.total}</strong> Leads
                </span>
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <span className="text-slate-500">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={500}>All (500)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-semibold px-2 py-1 bg-white rounded border border-slate-200 text-slate-800">
                  Page {page} of {Math.max(1, meta.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kanban Pipeline Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
          {pipelineStages.map((stage) => {
            const stageReqs = requirements.filter((r) => r.status === stage.key);
            return (
              <div key={stage.key} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200/90 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                  <span className="font-display text-xs font-bold text-slate-800 tracking-tight">{stage.label}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${stage.badgeColor}`}>
                    {stageReqs.length}
                  </span>
                </div>

                <div className="space-y-2.5 mt-2.5 flex-1">
                  {stageReqs.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-slate-400 italic">No leads in this stage</div>
                  ) : (
                    stageReqs.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => navigate(`/requirements/${req.id}`)}
                        className="p-3 bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 hover:shadow-card cursor-pointer shadow-subtle text-xs transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                              {req.brand || ''} {req.model || 'Lead'}
                            </div>
                            {user?.id && req.assignedToId === user.id && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Assigned to You
                              </span>
                            )}
                          </div>
                          {req.priority && (
                            <PriorityBadge priority={req.priority} />
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500">
                          <div className="font-medium text-slate-800">{req.customer?.fullName}</div>
                          <div className="font-mono text-slate-500 text-[10px]">{req.customer?.primaryMobile}</div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className="font-mono text-slate-900 font-bold">
                            {formatBudgetRange(req.minBudget, req.maxBudget)}
                          </span>
                          {(req.matches?.length || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <Sparkles className="w-2.5 h-2.5" />
                              {req.matches?.length}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No match</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer / Lead Create Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(c) => navigate(`/customers/${c.id}?addRequirement=true`)}
      />
    </div>
  );
};
