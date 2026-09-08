import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Car,
  Users,
  Send,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { WhatsAppOutreachModal } from '../communications/WhatsAppOutreachModal';
import { MatchCriteriaCard } from '../../components/common/MatchCriteriaCard';
import { formatLakhs, formatBudgetRange } from '../../utils/formatters';

export const MatchingOpportunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});
  const [selectedVehicleForOutreach, setSelectedVehicleForOutreach] = useState<any | null>(null);
  const [outreachRequirements, setOutreachRequirements] = useState<any[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['matching-opportunities', minScoreFilter],
    queryFn: async () => {
      const res: any = await api.get(`/reports/inventory-opportunities?minScore=${minScoreFilter}`);
      return res.data || [];
    },
  });

  const allOpportunities: any[] = data || [];

  const filteredOpportunities = allOpportunities.filter((opp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const vehMatch = `${opp.make} ${opp.model} ${opp.variant || ''} ${opp.location || ''}`.toLowerCase().includes(term);
    const buyerMatch = opp.topMatches?.some((tm: any) =>
      `${tm.customerName} ${tm.mobile}`.toLowerCase().includes(term)
    );
    return vehMatch || buyerMatch;
  });

  const totalMatchingLeads = allOpportunities.reduce((sum, opp) => sum + (opp.matchingBuyersCount || 0), 0);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await api.post('/matching/recalculate');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Recalculation failed');
    } finally {
      setIsRecalculating(false);
    }
  };

  const toggleExpand = (vehicleId: string) => {
    setExpandedVehicles((prev) => ({
      ...prev,
      [vehicleId]: !prev[vehicleId],
    }));
  };

  const handleOpenOutreach = async (opp: any) => {
    try {
      const res: any = await api.get(`/vehicles/${opp.vehicleId}`);
      const veh = res.data;
      const matchingReqs = veh.matches?.map((m: any) => m.requirement).filter(Boolean) || [];

      setSelectedVehicleForOutreach(veh);
      setOutreachRequirements(matchingReqs);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Vehicle Matching Engine
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>{allOpportunities.length} Matched Cars ({totalMatchingLeads} Buyer Leads)</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated multi-factor correlation matching live buyer budgets, brand, fuel, and year preferences against showroom stock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRecalculate}
            isLoading={isRecalculating}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : 'text-slate-600'}`} />}
          >
            Recalculate All Matches
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Match Strength Threshold Tabs */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => setMinScoreFilter(50)}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md transition-all ${
              minScoreFilter === 50 ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Matches (50%+)
          </button>
          <button
            onClick={() => setMinScoreFilter(70)}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md transition-all ${
              minScoreFilter === 70 ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Strong Matches (70%+)
          </button>
          <button
            onClick={() => setMinScoreFilter(85)}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md transition-all ${
              minScoreFilter === 85 ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exact / High (85%+)
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search make, model, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      {isLoading ? (
        <LoadingSpinner message="Scanning stock and customer buyer profiles..." />
      ) : filteredOpportunities.length === 0 ? (
        <EmptyState
          title="No match opportunities for current filter"
          description="Try selecting 'All Matches (50%+)' or clear search filters to view more opportunities."
          actionLabel="View All Inventory"
          onAction={() => navigate('/inventory')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpportunities.map((opp: any) => {
            const isExpanded = expandedVehicles[opp.vehicleId];
            const validMatches = (opp.topMatches || []).filter((m: any) => m.score >= 50);
            const displayMatches = isExpanded ? validMatches : validMatches.slice(0, 3);

            return (
              <div
                key={opp.vehicleId}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between space-y-3.5 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-subtle">
                        <img
                          src={
                            opp.primaryImage ||
                            'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={opp.model}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                          <span>{opp.year}</span>
                          <span>•</span>
                          <span>{opp.fuelType}</span>
                          <span>•</span>
                          <span>{opp.location || 'Showroom'}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {opp.make} {opp.model} {opp.variant || ''}
                        </h3>
                        <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                          {formatLakhs(opp.price)}
                        </div>
                      </div>
                    </div>

                    <span
                      onClick={() => navigate(`/inventory/${opp.vehicleId}`)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shrink-0 cursor-pointer transition-colors"
                      title="View vehicle details and matching buyers in showroom inventory"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      {opp.matchingBuyersCount} {opp.matchingBuyersCount === 1 ? 'Buyer' : 'Buyers'}
                    </span>
                  </div>

                  {/* Matched Buyer Leads */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        onClick={() => navigate(`/inventory/${opp.vehicleId}`)}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-brand-600 cursor-pointer transition-colors"
                        title="Open vehicle in inventory"
                      >
                        Matching Buyer Leads ({opp.matchingBuyersCount})
                      </span>
                      {opp.topMatches?.length > 3 && (
                        <button
                          onClick={() => toggleExpand(opp.vehicleId)}
                          className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-0.5"
                        >
                          {isExpanded ? (
                            <>Show Top 3 <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>View All {opp.topMatches.length} <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      )}
                    </div>

                    {displayMatches?.map((tm: any) => (
                      <div
                        key={tm.requirementId}
                        onClick={() => navigate(`/requirements/${tm.requirementId}`)}
                        className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex flex-col gap-1.5 text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-brand-700 font-bold flex items-center justify-center text-[10px]">
                              {tm.customerName ? tm.customerName.charAt(0) : 'U'}
                            </div>
                            <span className="font-semibold text-slate-900">{tm.customerName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{tm.mobile}</span>
                          </div>
                          <span className={`font-bold font-mono px-2 py-0.5 rounded border text-[11px] ${
                            tm.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-brand-700 border-blue-200'
                          }`}>
                            {tm.score}% Match
                          </span>
                        </div>

                        {/* Budget & Key Criteria breakdown */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>Budget: <strong className="text-slate-800 font-mono">{formatBudgetRange(tm.minBudget, tm.maxBudget)}</strong></span>
                          <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-medium text-[10px] text-slate-600">
                            Stage: {tm.status || 'Active'}
                          </span>
                        </div>

                        {/* Multi-Factor Match Breakdown (Matches in Green, Mismatches in Red) */}
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <MatchCriteriaCard
                            reasons={tm.reasons}
                            score={tm.score}
                            vehicle={opp}
                            requirement={tm}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outreach Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/inventory/${opp.vehicleId}`)}
                  >
                    View Vehicle
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenOutreach(opp)}
                    leftIcon={<Send className="w-3 h-3" />}
                  >
                    WhatsApp Outreach ({opp.matchingBuyersCount})
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Batch & Single Outreach Modal */}
      {selectedVehicleForOutreach && outreachRequirements.length > 0 && (
        <WhatsAppOutreachModal
          isOpen={!!selectedVehicleForOutreach}
          onClose={() => {
            setSelectedVehicleForOutreach(null);
            setOutreachRequirements([]);
          }}
          vehicle={selectedVehicleForOutreach}
          requirements={outreachRequirements}
          onOutreachCompleted={() => {
            setSelectedVehicleForOutreach(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

