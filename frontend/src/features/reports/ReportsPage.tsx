import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Users,
  Car,
  DollarSign,
  PieChart as PieIcon,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import api from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatLakhs } from '../../utils/formatters';

export const ReportsPage: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'sources' | 'team' | 'demand'>('sources');

  const { data: sourcesData, isLoading: isSourcesLoading } = useQuery({
    queryKey: ['report-sources'],
    queryFn: async () => {
      const res: any = await api.get('/reports/lead-sources');
      return res.data || [];
    },
  });

  const { data: teamData, isLoading: isTeamLoading } = useQuery({
    queryKey: ['report-team'],
    queryFn: async () => {
      const res: any = await api.get('/reports/team-performance');
      return res.data || [];
    },
  });

  const { data: demandData, isLoading: isDemandLoading } = useQuery({
    queryKey: ['report-demand'],
    queryFn: async () => {
      const res: any = await api.get('/reports/vehicle-demand');
      return res.data || [];
    },
  });

  const isLoading = isSourcesLoading || isTeamLoading || isDemandLoading;

  if (isLoading) {
    return <LoadingSpinner message="Generating automotive intelligence reports..." />;
  }

  const sources = sourcesData || [];
  const team = teamData || [];
  const demand = demandData || [];

  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777', '#0891b2'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Analytics & Performance Reports
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time channel conversion, sales team win rates, and inventory demand vs supply metrics.
        </p>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('sources')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
            activeReportTab === 'sources'
              ? 'bg-slate-900 text-white shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Lead Source ROI</span>
        </button>

        <button
          onClick={() => setActiveReportTab('team')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
            activeReportTab === 'team'
              ? 'bg-slate-900 text-white shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team Performance</span>
        </button>

        <button
          onClick={() => setActiveReportTab('demand')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
            activeReportTab === 'demand'
              ? 'bg-slate-900 text-white shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Demand vs Supply Deficit</span>
        </button>
      </div>

      {/* Tab 1: Lead Sources */}
      {activeReportTab === 'sources' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-subtle">
            <h3 className="text-xs font-semibold uppercase text-slate-700 mb-3">
              Lead Generation Volume by Channel
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sources}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="source" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="totalLeads" fill="#2563eb" radius={[4, 4, 0, 0]}>
                    {sources.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="py-2.5 px-4">Channel / Source</th>
                    <th className="py-2.5 px-4">Total Enquiries</th>
                    <th className="py-2.5 px-4">Won Deals</th>
                    <th className="py-2.5 px-4 text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sources.map((s: any) => (
                    <tr key={s.source} className="table-row">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{s.source}</td>
                      <td className="py-2.5 px-4 font-mono">{s.totalLeads}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700 font-medium">{s.wonLeads}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-brand-600">
                        {s.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Team Performance */}
      {activeReportTab === 'team' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4">Sales Executive</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Assigned Leads</th>
                  <th className="py-2.5 px-4">Active Pipeline</th>
                  <th className="py-2.5 px-4">Follow-ups Done</th>
                  <th className="py-2.5 px-4">Won Deals</th>
                  <th className="py-2.5 px-4 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {team.map((member: any) => (
                  <tr key={member.userId} className="table-row">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{member.fullName}</td>
                    <td className="py-2.5 px-4 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono">{member.totalAssigned}</td>
                    <td className="py-2.5 px-4 font-mono text-brand-600 font-medium">{member.activeDeals}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{member.completedFollowUps}</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-700 font-bold">{member.wonDeals}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {member.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Vehicle Demand vs Supply Deficit */}
      {activeReportTab === 'demand' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-subtle">
            <h3 className="text-xs font-semibold uppercase text-slate-700 mb-1">
              Top In-Demand Brands vs Live Inventory
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Number of customer buyer requirements per brand compared to active available stock.
            </p>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="brand" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="demandedRequirements" name="Demanded by Buyers" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="availableStock" name="Available Stock" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="py-2.5 px-4">Brand / Category</th>
                    <th className="py-2.5 px-4">Buyer Enquiries</th>
                    <th className="py-2.5 px-4">Stock Available</th>
                    <th className="py-2.5 px-4 text-right">Procurement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {demand.map((d: any) => (
                    <tr key={d.brand} className="table-row">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {d.brand} <span className="text-[11px] text-slate-500 font-normal">({d.category})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-purple-700 font-semibold">
                        {d.demandedRequirements}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700 font-semibold">
                        {d.availableStock}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium">
                        {d.supplyDeficit > 0 ? (
                          <span className="text-amber-700 font-semibold">+{d.supplyDeficit} needed</span>
                        ) : (
                          <span className="text-slate-500">Adequate</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
