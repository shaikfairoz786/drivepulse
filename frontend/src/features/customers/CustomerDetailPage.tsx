import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Plus,
  Edit2,
  FileSpreadsheet,
  Car,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { Customer } from '../../types';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { CustomerFormModal } from './CustomerFormModal';
import { RequirementFormModal } from '../requirements/RequirementFormModal';
import { formatBudgetRange, formatDate, formatRelativeTime } from '../../utils/formatters';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isAddReqOpen, setIsAddReqOpen] = useState(searchParams.get('addRequirement') === 'true');
  const [activeTab, setActiveTab] = useState<'requirements' | 'matches' | 'communications'>('requirements');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res: any = await api.get(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading customer profile..." />;
  }

  const customer: Customer = data;
  if (!customer) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-lg">
        <p className="text-slate-500 text-sm">Customer record not found.</p>
        <Button onClick={() => navigate('/customers')} className="mt-3" variant="outline" size="sm">
          Back to Directory
        </Button>
      </div>
    );
  }

  const requirements = customer.requirements || [];
  const communications = customer.communications || [];

  // Flatten all matches across requirements (strictly >= 50% cutoff)
  const allMatches = requirements.flatMap((r) =>
    (r.matches || []).filter((m) => (m.matchScore || 0) >= 50).map((m) => ({ ...m, requirement: r }))
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Breadcrumb
          items={[
            { label: 'Customers', href: '/customers' },
            { label: customer.fullName },
          ]}
        />

        <div className="flex items-center gap-2">
          {customer.primaryMobile && (
            <a
              href={`tel:${customer.primaryMobile}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium shadow-subtle"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Call</span>
            </a>
          )}
          <Button
            onClick={() => setIsEditCustomerOpen(true)}
            variant="outline"
            size="sm"
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
          <Button
            onClick={() => setIsAddReqOpen(true)}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Customer Profile Header Card */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {customer.fullName}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                {customer.customerType === 'FLEET_OPERATOR' ? 'Fleet Operator' : 'Individual'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5">
              <span className="font-mono font-medium text-slate-900">
                {customer.primaryMobile}
              </span>
              {customer.alternateMobile && (
                <span className="text-slate-500">Alt: {customer.alternateMobile}</span>
              )}
              {customer.email && (
                <span className="text-slate-500">{customer.email}</span>
              )}
              <span>{customer.city || customer.location || 'Location Not Specified'}</span>
              <span className="text-slate-400">Since {formatDate(customer.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-md border border-slate-200 self-start md:self-auto">
            <div className="text-center px-2.5 border-r border-slate-200">
              <span className="block text-lg font-bold text-slate-900">
                {requirements.length}
              </span>
              <span className="text-[10px] font-medium uppercase text-slate-400">
                Requirements
              </span>
            </div>
            <div className="text-center px-2.5 border-r border-slate-200">
              <span className="block text-lg font-bold text-brand-600">
                {allMatches.length}
              </span>
              <span className="text-[10px] font-medium uppercase text-slate-400">
                Matches
              </span>
            </div>
            <div className="text-center px-2.5">
              <span className="block text-lg font-bold text-slate-700">
                {communications.length}
              </span>
              <span className="text-[10px] font-medium uppercase text-slate-400">
                Outreaches
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('requirements')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'requirements' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Requirements ({requirements.length})</span>
          {activeTab === 'requirements' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'matches' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Matching Vehicles ({allMatches.length})</span>
          {activeTab === 'matches' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'communications' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Communication History ({communications.length})</span>
          {activeTab === 'communications' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>
      </div>

      {/* Tab 1: Requirements List */}
      {activeTab === 'requirements' && (
        <div className="space-y-3">
          {requirements.length === 0 ? (
            <EmptyState
              title="No requirements found"
              description="Record vehicle criteria (Brand, Model, Budget, Year) for this customer."
              actionLabel="Add Requirement"
              onAction={() => setIsAddReqOpen(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  onClick={() => navigate(`/requirements/${req.id}`)}
                  className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer transition-colors shadow-subtle group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {req.brand || ''} {req.model || 'Vehicle Requirement'} {req.variant || ''}
                      </h4>
                      <CategoryBadge category={req.category} />
                      <PriorityBadge priority={req.priority} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>
                        Budget: <strong className="text-slate-900">{formatBudgetRange(req.minBudget, req.maxBudget)}</strong>
                      </span>
                      {req.fuelType && req.fuelType !== 'ANY' && (
                        <span>· Fuel: {req.fuelType}</span>
                      )}
                      {req.minYear && (
                        <span>· Year: {req.minYear}+</span>
                      )}
                      {req.assignedTo && (
                        <span>· Owner: {req.assignedTo.fullName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusBadge status={req.status} />
                    <span className="text-xs font-medium text-brand-600 group-hover:text-brand-700 whitespace-nowrap">
                      Open Lead →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Matched Vehicles */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {allMatches.length === 0 ? (
            <EmptyState
              title="No matching inventory"
              description="When matching vehicle inventory is added, matches will appear here automatically."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allMatches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/inventory/${m.vehicle?.id}`)}
                  className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer transition-colors flex gap-3 shadow-subtle"
                >
                  <div className="w-20 h-16 rounded bg-slate-100 overflow-hidden shrink-0">
                    <img
                      src={
                        m.vehicle?.images?.[0]?.url ||
                        'https://images.unsplash.com/photo-1590362891988-349f7e5239e3?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={m.vehicle?.model}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {m.matchScore}% Match
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{m.vehicle?.price ? (m.vehicle.price / 100000).toFixed(1) : '0.0'}L
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate mt-0.5">
                      {m.vehicle?.make} {m.vehicle?.model} ({m.vehicle?.manufacturingYear})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      For: {m.requirement?.brand} {m.requirement?.model}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Communication History */}
      {activeTab === 'communications' && (
        <div className="space-y-3">
          {communications.length === 0 ? (
            <EmptyState
              title="No communications logged"
              description="Outreach messages prepared for WhatsApp will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {communications.map((comm: any) => (
                <div
                  key={comm.id}
                  className="p-3.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5 shadow-subtle"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      WhatsApp Outreach ({comm.status})
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDate(comm.createdAt)}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 font-mono text-xs whitespace-pre-line text-slate-800 border border-slate-200">
                    {comm.messageContent}
                  </div>
                  {comm.preparedBy && (
                    <div className="text-[11px] text-slate-500">
                      Prepared by {comm.preparedBy.fullName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CustomerFormModal
        isOpen={isEditCustomerOpen}
        onClose={() => setIsEditCustomerOpen(false)}
        initialData={customer}
        onSuccess={() => refetch()}
      />

      <RequirementFormModal
        isOpen={isAddReqOpen}
        onClose={() => setIsAddReqOpen(false)}
        customerId={customer.id}
        customerName={customer.fullName}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
