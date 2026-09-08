import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Car,
  Search,
  Plus,
  Filter,
  MapPin,
  Fuel,
  Gauge,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { Vehicle, VehicleCategory, VehicleStatus } from '../../types';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { VehicleStatusBadge, CategoryBadge } from '../../components/common/Badge';
import { VehicleFormModal } from './VehicleFormModal';
import { formatLakhs, formatNumber } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const InventoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isManager } = useAuth();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('add') === 'true' || searchParams.get('create') === 'true');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vehicles', searchTerm, categoryFilter, statusFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      const res: any = await api.get(`/vehicles?${params.toString()}`);
      return res;
    },
  });

  const vehicles: Vehicle[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1, limit: pageSize };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(searchTerm || categoryFilter || statusFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Vehicle Inventory & Stock
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold font-mono border border-slate-200">
              {meta.total} Total Cars
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Passenger cars and commercial fleet vehicles ready for buyer requirement matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Showroom Grid
            </button>
          </div>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search make, model, variant, location..."
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
            <option value="">All Inventory Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="BOOKED">Booked</option>
            <option value="SOLD">Sold</option>
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

      {/* Main Content Area: Table vs Grid View */}
      {isLoading ? (
        <LoadingSpinner message="Loading vehicle showroom inventory..." />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles found in inventory"
          description={hasActiveFilters ? "No vehicles match your active filter criteria." : "Start by adding a vehicle to your showroom stock."}
          actionLabel={hasActiveFilters ? "Clear Filters" : "Add Vehicle"}
          onAction={hasActiveFilters ? clearFilters : () => setIsAddModalOpen(true)}
        />
      ) : viewMode === 'TABLE' ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4">Vehicle Details</th>
                  <th className="py-2.5 px-4">Specs / Mileage</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Selling Price</th>
                  <th className="py-2.5 px-4">Stock Status</th>
                  <th className="py-2.5 px-4">Interested Buyers</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vehicles.map((v) => {
                  const primaryImg =
                    v.images?.find((img) => img.isPrimary)?.url ||
                    v.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=150&q=80';

                  return (
                    <tr
                      key={v.id}
                      onClick={() => navigate(`/inventory/${v.id}`)}
                      className="table-row cursor-pointer group"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-subtle">
                            <img
                              src={primaryImg}
                              alt={v.model}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                              {v.make} {v.model} {v.variant || ''}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {v.registrationNumber || 'Unregistered'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {v.manufacturingYear} · {v.fuelType}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatNumber(v.kmDriven)} km
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">{v.location || 'Showroom'}</span>
                      </td>

                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatLakhs(v.price)}
                      </td>

                      <td className="py-2.5 px-4">
                        <VehicleStatusBadge status={v.status} />
                      </td>

                      <td className="py-2.5 px-4">
                        {(() => {
                          const validLeads = (v.matches || []).filter((m: any) => (m.matchScore || 0) >= 50).length;
                          return validLeads > 0 ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/inventory/${v.id}?tab=matches`);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Click to view matching buyers"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                              {validLeads} Waiting Buyer{validLeads > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0 leads</span>
                          );
                        })()}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                          View Car →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const primaryImg =
              v.images?.find((img) => img.isPrimary)?.url ||
              v.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80';

            return (
              <div
                key={v.id}
                onClick={() => navigate(`/inventory/${v.id}`)}
                className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-subtle hover:border-slate-300 hover:shadow-card cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={primaryImg}
                      alt={`${v.make} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <VehicleStatusBadge status={v.status} />
                      <CategoryBadge category={v.category} />
                    </div>
                    {v.registrationNumber && (
                      <span className="absolute bottom-2.5 right-2.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur text-white">
                        {v.registrationNumber}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <span>{v.manufacturingYear}</span>
                      <span>•</span>
                      <span>{v.fuelType}</span>
                      <span>•</span>
                      <span>{v.transmission || 'Manual'}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {v.make} {v.model} {v.variant || ''}
                    </h3>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {formatLakhs(v.price)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {formatNumber(v.kmDriven)} km
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  {(() => {
                    const matchCount = (v.matches || []).filter((m: any) => (m.matchScore || 0) >= 50).length;
                    return matchCount > 0 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                        {matchCount} Waiting Buyer{matchCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">0 Waiting Buyers</span>
                    );
                  })()}
                  <span className="text-slate-500 group-hover:text-brand-600 font-medium transition-colors">
                    Specs & Leads →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Pagination & Page Size Toolbar */}
      {meta.total > 0 && (
        <div className="p-3.5 border border-slate-200 bg-white rounded-xl shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900">{((page - 1) * meta.limit) + 1} - {Math.min(page * meta.limit, meta.total)}</strong> of <strong className="text-slate-900">{meta.total}</strong> Vehicles
            </span>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-slate-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            <span className="font-semibold px-2 py-1 bg-slate-100 rounded text-slate-800">
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

      {/* Vehicle Add Modal */}
      <VehicleFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(veh) => {
          setIsAddModalOpen(false);
          refetch();
          if (veh?.matchedLeadsCount && veh.matchedLeadsCount > 0) {
            navigate(`/inventory/${veh.id}?tab=matches&justAdded=true&matched=${veh.matchedLeadsCount}`);
          } else {
            navigate(`/inventory/${veh.id}`);
          }
        }}
      />
    </div>
  );
};
