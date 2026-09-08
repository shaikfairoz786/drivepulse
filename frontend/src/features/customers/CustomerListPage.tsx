import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  ChevronRight,
  Filter,
} from 'lucide-react';
import api from '../../services/api';
import { Customer } from '../../types';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CustomerFormModal } from './CustomerFormModal';
import { formatRelativeTime } from '../../utils/formatters';

export const CustomerListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'NEW' | 'WITH_REQS'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === 'true');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', searchTerm, activeTab, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', String(page));
      params.set('limit', '25');
      const res: any = await api.get(`/customers?${params.toString()}`);
      return res;
    },
  });

  const rawCustomers: Customer[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1, limit: 25 };

  // Filter tabs
  const customers = rawCustomers.filter((c) => {
    if (activeTab === 'WITH_REQS') return c.requirements && c.requirements.length > 0;
    if (activeTab === 'NEW') {
      const created = new Date(c.createdAt).getTime();
      const now = Date.now();
      return now - created < 3 * 24 * 60 * 60 * 1000; // past 3 days
    }
    return true;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Customers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client directory and associated vehicle requirements.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Customer
        </Button>
      </div>

      {/* Filter Bar & Tabs */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </form>

        {/* Tab filters */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Customers' },
            { key: 'WITH_REQS', label: 'With Requirements' },
            { key: 'NEW', label: 'New This Week' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-700 ml-1 px-1.5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Customer List Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading customer directory..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Create your first customer to record vehicle requirements and trigger inventory matching."
          actionLabel="Add Customer"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Mobile</th>
                  <th className="py-2.5 px-4">Requirements</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Created</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="table-row cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200">
                          {c.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {c.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.customerType === 'FLEET_OPERATOR' ? 'Fleet Operator' : 'Individual'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <a
                        href={`tel:${c.primaryMobile}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-brand-600 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.primaryMobile}</span>
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      {c.requirements && c.requirements.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.requirements.slice(0, 2).map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {r.brand || ''} {r.model || 'Requirement'}
                            </span>
                          ))}
                          {c.requirements.length > 2 && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              +{c.requirements.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {c.city || c.location || '—'}
                    </td>

                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatRelativeTime(c.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-medium text-brand-600 group-hover:text-brand-700">
                        Open →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {((page - 1) * meta.limit) + 1} - {Math.min(page * meta.limit, meta.total)} of {meta.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-medium text-slate-800">
                  Page {page} of {meta.totalPages}
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
      )}

      {/* Customer Create Modal */}
      <CustomerFormModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setSearchParams((prev) => {
            prev.delete('create');
            return prev;
          });
        }}
        onSuccess={(newCustomer) => {
          refetch();
          navigate(`/customers/${newCustomer.id}`);
        }}
      />
    </div>
  );
};
