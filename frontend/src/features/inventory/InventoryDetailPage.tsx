import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Car,
  Phone,
  Sparkles,
  MapPin,
  Calendar,
  Fuel,
  Gauge,
  ExternalLink,
  Edit2,
  Upload,
  Trash2,
  Star,
  Send,
  ArrowLeft,
  CheckSquare,
  Square,
  ChevronRight,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Layers,
  Settings,
  Info,
} from 'lucide-react';
import api from '../../services/api';
import { Vehicle, CustomerRequirement } from '../../types';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { EmptyState } from '../../components/common/EmptyState';
import { VehicleStatusBadge, CategoryBadge, PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { VehicleFormModal } from './VehicleFormModal';
import { MatchCriteriaCard } from '../../components/common/MatchCriteriaCard';
import { WhatsAppOutreachModal } from '../communications/WhatsAppOutreachModal';
import { formatLakhs, formatNumber, formatBudgetRange, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const InventoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isManager } = useAuth();

  const tabParam = searchParams.get('tab');
  const justAdded = searchParams.get('justAdded') === 'true';
  const [activeTab, setActiveTab] = useState<'matches' | 'gallery'>(
    tabParam === 'gallery' ? 'gallery' : 'matches'
  );
  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const res: any = await api.get(`/vehicles/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading vehicle details..." />;
  }

  const vehicle: Vehicle = data;
  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-lg">
        <p className="text-slate-500 text-sm">Vehicle not found in inventory.</p>
        <Button onClick={() => navigate('/inventory')} className="mt-3" variant="outline" size="sm">
          Back to Inventory
        </Button>
      </div>
    );
  }

  const matches = (vehicle.matches || []).filter((m) => (m.matchScore || 0) >= 50);
  const images = vehicle.images || [];
  const primaryImage =
    images.find((img) => img.isPrimary)?.url ||
    images[0]?.url ||
    'https://images.unsplash.com/photo-1590362891988-349f7e5239e3?auto=format&fit=crop&w=800&q=80';

  const toggleSelectReq = (reqId: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((i) => i !== reqId) : [...prev, reqId]
    );
  };

  const selectAllReqs = () => {
    if (selectedReqIds.length === matches.length) {
      setSelectedReqIds([]);
    } else {
      setSelectedReqIds(matches.map((m) => m.requirementId));
    }
  };

  const selectedRequirementsList: CustomerRequirement[] = matches
    .filter((m) => selectedReqIds.includes(m.requirementId))
    .map((m) => m.requirement!)
    .filter(Boolean);

  const handleAddImageUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    setIsAddingImage(true);
    try {
      await api.post(`/vehicles/${vehicle.id}/image-url`, { url: newImageUrl.trim() });
      setNewImageUrl('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to add image');
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await api.patch(`/vehicles/images/${imageId}/primary`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to set primary image');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await api.delete(`/vehicles/images/${imageId}`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Breadcrumb
          items={[
            { label: 'Inventory', href: '/inventory' },
            { label: `${vehicle.make} ${vehicle.model} (${vehicle.manufacturingYear})` },
          ]}
        />

        <div className="flex items-center gap-2">
          {vehicle.publicVehicleUrl && (
            <a
              href={vehicle.publicVehicleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-subtle"
            >
              <span>Public Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {isManager && (
            <Button
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* High Demand / Instant Stock Match Banner */}
      {matches.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-brand-500/10 border border-emerald-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-slate-900">
                  {justAdded ? '🎉 Instant Stock Match Detected!' : '⚡ High Buyer Demand Detected'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  {matches.length} Waiting Buyer{matches.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Prospective customer{matches.length > 1 ? 's have' : ' has'} active requirements matching this vehicle specification. Dispatch WhatsApp proposals immediately!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                setActiveTab('matches');
                setSelectedReqIds(matches.map((m) => m.requirementId));
                setIsWhatsAppModalOpen(true);
              }}
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm w-full sm:w-auto"
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              1-Click WhatsApp All ({matches.length})
            </Button>
          </div>
        </div>
      )}

      {/* Hero Showcase Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 rounded-lg bg-white border border-slate-200 shadow-subtle">
        {/* Left: Primary Photo */}
        <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[220px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
          <img
            src={primaryImage}
            alt={vehicle.model}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <VehicleStatusBadge status={vehicle.status} />
            <CategoryBadge category={vehicle.category} />
          </div>
        </div>

        {/* Right: Specifications & Details */}
        <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-slate-500">
                {vehicle.manufacturingYear} Model · {vehicle.category === 'COMMERCIAL' ? 'Commercial' : 'Passenger'}
              </span>
              {vehicle.registrationNumber && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {vehicle.registrationNumber}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {vehicle.make} {vehicle.model} {vehicle.variant || ''}
            </h1>

            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatLakhs(vehicle.price)}
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
              {vehicle.description || 'Verified stock condition. Available for showroom inspection.'}
            </p>
          </div>

          {/* Quick Spec Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">KM Driven</span>
              <span className="font-semibold text-slate-900">{formatNumber(vehicle.kmDriven)} km</span>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Fuel / Trans</span>
              <span className="font-semibold text-slate-900 truncate block">
                {vehicle.fuelType} · {vehicle.transmission || 'Manual'}
              </span>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Ownership</span>
              <span className="font-semibold text-slate-900">{vehicle.numberOfOwners} Owner</span>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Location</span>
              <span className="font-semibold text-slate-900 truncate block">{vehicle.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'matches' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Matching Buyer Leads ({matches.length})</span>
          </span>
          {activeTab === 'matches' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'gallery' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Photo Gallery ({images.length})</span>
          {activeTab === 'gallery' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>
      </div>

      {/* Tab 2: Matching Leads & Bulk WhatsApp */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {/* Filters Toolbar */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Threshold Tabs */}
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
                placeholder="Search buyer name or phone..."
                value={buyerSearchTerm}
                onChange={(e) => setBuyerSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-700">
                Prospective Buyers Matching This Inventory Spec ({
                  matches.filter((m) => {
                    const score = m.matchScore || 0;
                    if (score < minScoreFilter) return false;
                    if (!buyerSearchTerm.trim()) return true;
                    const term = buyerSearchTerm.toLowerCase();
                    const req = m.requirement;
                    return (
                      req?.customer?.fullName?.toLowerCase().includes(term) ||
                      req?.customer?.primaryMobile?.includes(term) ||
                      `${req?.brand || ''} ${req?.model || ''}`.toLowerCase().includes(term)
                    );
                  }).length
                })
              </span>
            </div>

            {matches.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllReqs}
                  leftIcon={
                    selectedReqIds.length === matches.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )
                  }
                >
                  {selectedReqIds.length === matches.length ? 'Deselect All' : 'Select All'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedReqIds.length === 0}
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  leftIcon={<Send className="w-3 h-3" />}
                >
                  Prepare WhatsApp ({selectedReqIds.length})
                </Button>
              </div>
            )}
          </div>

          {matches.filter((m) => {
            const score = m.matchScore || 0;
            if (score < minScoreFilter) return false;
            if (!buyerSearchTerm.trim()) return true;
            const term = buyerSearchTerm.toLowerCase();
            const req = m.requirement;
            return (
              req?.customer?.fullName?.toLowerCase().includes(term) ||
              req?.customer?.primaryMobile?.includes(term) ||
              `${req?.brand || ''} ${req?.model || ''}`.toLowerCase().includes(term)
            );
          }).length === 0 ? (
            <EmptyState
              title="No matching leads for current threshold"
              description="Adjust the match strength filter to 50%+ or clear search criteria to view matching buyer leads."
            />
          ) : (
            <div className="space-y-2.5">
              {matches
                .filter((m) => {
                  const score = m.matchScore || 0;
                  if (score < minScoreFilter) return false;
                  if (!buyerSearchTerm.trim()) return true;
                  const term = buyerSearchTerm.toLowerCase();
                  const req = m.requirement;
                  return (
                    req?.customer?.fullName?.toLowerCase().includes(term) ||
                    req?.customer?.primaryMobile?.includes(term) ||
                    `${req?.brand || ''} ${req?.model || ''}`.toLowerCase().includes(term)
                  );
                })
                .map((m) => {
                  const req = m.requirement;
                  if (!req) return null;
                  const isSelected = selectedReqIds.includes(m.requirementId);
                  const reasons = m.matchReasons ? JSON.parse(m.matchReasons) : [];

                const canContact = isManager || !req.assignedToId || (user?.id && req.assignedToId === user.id);
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-lg border transition-colors shadow-subtle ${
                      isSelected
                        ? 'bg-blue-50/40 border-brand-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {canContact ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectReq(m.requirementId)}
                            className="mt-0.5 text-slate-400 hover:text-brand-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-brand-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span
                            className="mt-0.5 text-xs text-slate-400 cursor-not-allowed"
                            title={`Assigned to ${req.assignedTo?.fullName || 'another executive'}. Outreach restricted.`}
                          >
                            🔒
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              onClick={() => navigate(`/customers/${req.customerId}`)}
                              className="text-xs font-bold text-slate-900 hover:text-brand-600 cursor-pointer"
                            >
                              {req.customer?.fullName}
                            </h4>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {m.matchScore}% Match
                            </span>
                            <StatusBadge status={req.status} />
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
                            <span className="font-mono text-slate-700">
                              {req.customer?.primaryMobile}
                            </span>
                            <span>· Req: {req.brand || ''} {req.model || 'Lead'}</span>
                            <span>· Budget: <strong className="text-slate-900 font-mono">{formatBudgetRange(req.minBudget, req.maxBudget)}</strong></span>
                            <span>· Owner: <strong className="text-slate-800">{req.assignedTo?.fullName || 'Unassigned'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/requirements/${req.id}`)}
                        >
                          View Lead
                        </Button>
                        {canContact ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedReqIds([req.id]);
                              setIsWhatsAppModalOpen(true);
                            }}
                            leftIcon={<Send className="w-3 h-3" />}
                          >
                            WhatsApp
                          </Button>
                        ) : (
                          <span
                            className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 cursor-not-allowed flex items-center gap-1 font-medium"
                            title={`Assigned to ${req.assignedTo?.fullName || 'another executive'}. WhatsApp outreach restricted to owner.`}
                          >
                            🔒 Assigned to {req.assignedTo?.fullName?.split(' ')[0] || 'Peer'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comprehensive Multi-Factor Match Criteria */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <MatchCriteriaCard
                        reasons={reasons}
                        score={m.matchScore}
                        vehicle={vehicle}
                        requirement={req}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Gallery Management */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <form onSubmit={handleAddImageUrl} className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2 shadow-subtle">
            <input
              type="url"
              placeholder="Paste new image URL (e.g. https://...)..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button type="submit" isLoading={isAddingImage} size="sm">
              Add Photo
            </Button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200 aspect-video shadow-subtle"
              >
                <img src={img.url} alt="Vehicle photo" className="w-full h-full object-cover" />
                {img.isPrimary && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-semibold text-white shadow-subtle">
                    ★ Primary
                  </span>
                )}

                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(img.id)}
                      className="p-1.5 rounded bg-white hover:bg-brand-600 hover:text-white text-slate-900 transition-colors"
                      title="Set as primary image"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    className="p-1.5 rounded bg-white hover:bg-rose-600 hover:text-white text-slate-900 transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      <VehicleFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={vehicle}
        onSuccess={() => refetch()}
      />

      {/* WhatsApp Outreach Modal */}
      {isWhatsAppModalOpen && selectedRequirementsList.length > 0 && (
        <WhatsAppOutreachModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedReqIds([]);
          }}
          vehicle={vehicle}
          requirements={selectedRequirementsList}
          onOutreachCompleted={() => refetch()}
        />
      )}
    </div>
  );
};
