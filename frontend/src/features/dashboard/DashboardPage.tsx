import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarClock,
  Car,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Plus,
  Phone,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Send,
  UserCheck,
  ChevronRight,
  Gauge,
  Calendar,
  Flame,
  Briefcase,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { VehicleFormModal } from '../inventory/VehicleFormModal';
import { formatLakhs, formatRelativeTime, formatDate } from '../../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);

  // 1. Core dashboard stats (KPIs, follow-ups, funnel, recent activities)
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats, isFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res: any = await api.get('/reports/dashboard');
      return res.data;
    },
    refetchInterval: 30000,
  });

  // 2. High-value inventory match opportunities
  const { data: opportunitiesData } = useQuery({
    queryKey: ['inventory-opportunities-dashboard'],
    queryFn: async () => {
      const res: any = await api.get('/reports/inventory-opportunities');
      return res.data || [];
    },
  });

  // 3. Today's follow-ups
  const { data: followUpsResult } = useQuery({
    queryKey: ['overdue-followups-dashboard'],
    queryFn: async () => {
      const res: any = await api.get('/followups?tab=TODAY&limit=5');
      return res.data?.followUps || [];
    },
  });

  if (isStatsLoading) {
    return <LoadingSpinner message="Loading your automotive sales cockpit..." />;
  }

  const kpis = statsData?.kpis || {};
  const followUpsSummary = statsData?.followUps || {};
  const funnel = statsData?.funnel || [];
  const recentActivities = statsData?.recentActivities || [];
  const opportunities = Array.isArray(opportunitiesData) ? opportunitiesData.slice(0, 5) : [];
  const todayFollowUps = Array.isArray(followUpsResult) ? followUpsResult : [];

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'there';
  const totalFunnelCount = funnel.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 1;

  return (
    <div className="space-y-5">
      {/* Top Banner & Fast Actions */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {firstName}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-brand-700 font-semibold border border-blue-200/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
              {user?.role ? user.role.replace('_', ' ') : 'Sales Rep'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automotive Sales Cloud & Dealership Intelligence Dashboard
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => refetchStats()}
            variant="outline"
            size="sm"
            isLoading={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : 'text-slate-500'}`} />}
          >
            Sync Data
          </Button>

          <Button
            onClick={() => setIsAddVehicleModalOpen(true)}
            variant="outline"
            size="sm"
            leftIcon={<Car className="w-3.5 h-3.5 text-slate-700" />}
          >
            Add Vehicle
          </Button>

          <Button
            onClick={() => setIsNewLeadModalOpen(true)}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Lead
          </Button>
        </div>
      </div>

      {/* KPI Highlight Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Active Requirements */}
        <div 
          onClick={() => navigate('/requirements')}
          className="card-base p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Buyer Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-2">
            {kpis.activeRequirements || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="font-medium text-brand-600">+{kpis.newLeadsToday || 0} new today</span>
            <span className="text-slate-400 group-hover:text-brand-600 transition-colors">View leads →</span>
          </div>
        </div>

        {/* Follow-ups Urgency */}
        <div 
          onClick={() => navigate('/followups')}
          className="card-base p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-ups Due</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-2">
            {followUpsSummary.today || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100">
            {(followUpsSummary.overdue || 0) > 0 ? (
              <span className="font-semibold text-rose-600">⚠️ {followUpsSummary.overdue} overdue</span>
            ) : (
              <span className="font-medium text-emerald-600">✓ On schedule</span>
            )}
            <span className="text-slate-400 group-hover:text-amber-600 transition-colors">Open queue →</span>
          </div>
        </div>

        {/* Live Inventory */}
        <div 
          onClick={() => navigate('/inventory')}
          className="card-base p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Cars</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-2">
            {kpis.availableVehicles || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>{kpis.totalVehicles || 0} total stock</span>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">Showroom →</span>
          </div>
        </div>

        {/* Closed Won Deals */}
        <div 
          onClick={() => navigate('/requirements?status=WON')}
          className="card-base p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closed Won</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-2">
            {kpis.wonDeals || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-700 mt-2 pt-2 border-t border-slate-100">
            <span className="font-semibold">Deals Delivered</span>
            <span className="text-slate-400 group-hover:text-emerald-700 transition-colors">View wins →</span>
          </div>
        </div>
      </div>

      {/* Priority Section: Needs Your Attention */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              Needs Your Attention
            </span>
          </div>
          <button
            onClick={() => navigate('/followups')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View all tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Overdue Alert */}
          {(followUpsSummary.overdue || 0) > 0 && (
            <div className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/40">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  OVERDUE
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {followUpsSummary.overdue} Customer follow-up{followUpsSummary.overdue > 1 ? 's' : ''} past scheduled deadline
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Action required to keep buyer engagement active and prevent lead drop-off.
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate('/followups?tab=OVERDUE')}
                variant="outline"
                size="sm"
                className="self-end sm:self-center bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                Review Overdue ({followUpsSummary.overdue})
              </Button>
            </div>
          )}

          {/* New Match Opportunity Banner */}
          {(kpis.matchingOpportunitiesCount || 0) > 0 && (
            <div className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/40">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  MATCH READY
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {kpis.matchingOpportunitiesCount} Inventory match{kpis.matchingOpportunitiesCount > 1 ? 'es' : ''} ready for WhatsApp proposal dispatch
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Buyer budget and brand preferences align with showroom stock.
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate('/matching')}
                variant="primary"
                size="sm"
                className="self-end sm:self-center"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Dispatch Proposals
              </Button>
            </div>
          )}

          {/* Today's Follow-up list preview */}
          {todayFollowUps.length > 0 ? (
            todayFollowUps.slice(0, 3).map((item: any) => (
              <div
                key={item.id}
                className="p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {item.followUpType || 'CALL'}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {item.requirement?.customer?.fullName || 'Customer'} ·{' '}
                      <span className="text-brand-700 font-medium">
                        {item.requirement?.brand || ''} {item.requirement?.model || 'Enquiry'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.notes || 'Scheduled customer touchpoint'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {item.requirement?.customer?.primaryMobile && (
                    <a
                      href={`tel:${item.requirement.customer.primaryMobile}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-subtle"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>Call</span>
                    </a>
                  )}
                  <Button
                    onClick={() => navigate(`/requirements/${item.requirementId}`)}
                    variant="outline"
                    size="sm"
                  >
                    Open Lead
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              No pending follow-ups due right now. You are completely caught up!
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Core Section: Lead Pipeline Velocity + Stock Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Lead Pipeline Velocity Funnel (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200/90 shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              Lead Pipeline Velocity
            </span>
            <button
              onClick={() => navigate('/requirements')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Pipeline Board →
            </button>
          </div>

          <div className="space-y-2.5">
            {funnel.map((item: any) => {
              const percent = Math.min(100, Math.round(((item.count || 0) / totalFunnelCount) * 100));
              return (
                <div
                  key={item.status}
                  onClick={() => navigate(`/requirements?status=${item.status}`)}
                  className="group cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 group-hover:text-brand-600 transition-colors">
                      {item.stage}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.status === 'WON'
                          ? 'bg-emerald-500'
                          : item.status === 'NEW'
                          ? 'bg-blue-500'
                          : item.status === 'TEST_DRIVE'
                          ? 'bg-purple-500'
                          : 'bg-brand-600'
                      }`}
                      style={{ width: `${Math.max(item.count > 0 ? 8 : 0, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: High-Converting Stock Matches (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-subtle overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
                Top Showroom Stock with Matching Buyers
              </span>
              <button
                onClick={() => navigate('/matching')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                View All Matches →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="py-2.5 px-4">Vehicle</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Matching Buyers</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {opportunities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                        No active vehicle-buyer match pairs found right now.
                      </td>
                    </tr>
                  ) : (
                    opportunities.map((opp: any) => (
                      <tr key={opp.vehicleId} className="table-row">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900">
                            {opp.make} {opp.model}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{opp.year}</span>
                            <span>•</span>
                            <span>{opp.fuelType}</span>
                            <span>•</span>
                            <span>{opp.location || 'Showroom'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatLakhs(opp.price)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            {opp.matchingBuyersCount} {opp.matchingBuyersCount === 1 ? 'buyer' : 'buyers'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/inventory/${opp.vehicleId}`)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            Match Details →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated matching correlates budget, fuel, transmission, and body category.</span>
            <button
              onClick={() => navigate('/inventory')}
              className="text-slate-700 hover:text-slate-900 font-semibold"
            >
              Browse Stock →
            </button>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      {recentActivities.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand-600" />
              <span>Live Dealership Activity Stream</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {recentActivities.map((act: any) => (
              <div
                key={act.id}
                className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80 flex items-start gap-2.5 text-xs hover:bg-slate-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-brand-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {act.performedBy?.fullName ? act.performedBy.fullName.charAt(0) : 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-900 truncate">
                      {act.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {act.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals for 1-Click Action */}
      <CustomerFormModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSuccess={(customer) => {
          setIsNewLeadModalOpen(false);
          refetchStats();
          navigate(`/customers/${customer.id}`);
        }}
      />

      <VehicleFormModal
        isOpen={isAddVehicleModalOpen}
        onClose={() => setIsAddVehicleModalOpen(false)}
        onSuccess={(vehicle) => {
          setIsAddVehicleModalOpen(false);
          refetchStats();
          if (vehicle?.matchedLeadsCount && vehicle.matchedLeadsCount > 0) {
            navigate(`/inventory/${vehicle.id}?tab=matches&justAdded=true&matched=${vehicle.matchedLeadsCount}`);
          } else {
            navigate(`/inventory/${vehicle.id}`);
          }
        }}
      />
    </div>
  );
};
