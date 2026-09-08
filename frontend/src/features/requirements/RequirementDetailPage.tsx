import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Phone,
  MessageCircle,
  User,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit2,
  UserCheck,
  Plus,
  ArrowLeft,
  ChevronRight,
  Send,
  HelpCircle,
} from 'lucide-react';
import api from '../../services/api';
import { CustomerRequirement, LeadStatus, Role } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { EmptyState } from '../../components/common/EmptyState';
import { MatchCriteriaCard } from '../../components/common/MatchCriteriaCard';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { RequirementFormModal } from './RequirementFormModal';
import { WhatsAppOutreachModal } from '../communications/WhatsAppOutreachModal';
import { formatBudgetRange, formatDate, formatDateTime, formatRelativeTime, parseRupeesOrLakhs, formatCurrencyPreview, formatLakhs } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const RequirementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();

  const [activeTab, setActiveTab] = useState<'matches' | 'timeline' | 'followups' | 'communications'>('matches');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [selectedVehicleForWhatsApp, setSelectedVehicleForWhatsApp] = useState<any | null>(null);

  // Status Change Form State
  const [newStatus, setNewStatus] = useState<LeadStatus>(LeadStatus.CONTACTED);
  const [statusNotes, setStatusNotes] = useState('');
  const [wonAmountLakhs, setWonAmountLakhs] = useState('');
  const [soldVehicleId, setSoldVehicleId] = useState('');
  const [lostReason, setLostReason] = useState('');

  // Assign Form State
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Follow-up Form State
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('CALL');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [autoAdvanceFollowUp, setAutoAdvanceFollowUp] = useState(true);

  // Log Call Form State
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState('Customer interested in visiting showroom');
  const [advanceStageFromCall, setAdvanceStageFromCall] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['requirement', id],
    queryFn: async () => {
      const res: any = await api.get(`/requirements/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: availableVehiclesData } = useQuery({
    queryKey: ['available-vehicles-for-win'],
    queryFn: async () => {
      const res: any = await api.get('/vehicles?status=AVAILABLE&limit=100');
      return res.data || [];
    },
    enabled: isStatusModalOpen && newStatus === LeadStatus.WON,
  });

  const availableVehicles = availableVehiclesData || [];

  const { data: staffList } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const res: any = await api.get('/auth/users');
      return res.data || [];
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading requirement details & inventory matches..." />;
  }

  const requirement: CustomerRequirement = data;
  if (!requirement) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-lg">
        <p className="text-slate-500 text-sm">Requirement not found.</p>
        <Button onClick={() => navigate('/requirements')} className="mt-3" variant="outline" size="sm">
          Back to Requirements
        </Button>
      </div>
    );
  }

  const matches = (requirement.matches || []).filter((m) => (m.matchScore || 0) >= 50);
  const activities = requirement.activities || [];
  const followUps = requirement.followUps || [];
  const communications = requirement.communications || [];

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedWonAmount = parseRupeesOrLakhs(wonAmountLakhs);
      await api.patch(`/requirements/${requirement.id}/status`, {
        status: newStatus,
        notes: statusNotes || undefined,
        wonDealAmount: parsedWonAmount || undefined,
        vehicleId: soldVehicleId || undefined,
        lostReason: newStatus === LeadStatus.LOST ? (lostReason || 'Price too high') : undefined,
      });
      setIsStatusModalOpen(false);
      setStatusNotes('');
      setWonAmountLakhs('');
      setSoldVehicleId('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    try {
      await api.patch(`/requirements/${requirement.id}/assign`, {
        assignedToId: selectedStaffId,
      });
      setIsAssignModalOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to assign requirement');
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;
    try {
      await api.post('/followups', {
        requirementId: requirement.id,
        assignedToId: requirement.assignedToId || user?.id,
        followUpDate: new Date(followUpDate).toISOString(),
        followUpType,
        notes: followUpNotes,
      });

      if (autoAdvanceFollowUp && (followUpType === 'TEST_DRIVE' || followUpType === 'VISIT') && requirement.status !== LeadStatus.WON) {
        await api.patch(`/requirements/${requirement.id}/status`, {
          status: followUpType === 'TEST_DRIVE' ? LeadStatus.TEST_DRIVE : LeadStatus.VISIT_SCHEDULED,
          notes: `Auto-advanced pipeline stage from scheduling ${followUpType}.`,
        });
      }

      setIsFollowUpModalOpen(false);
      setFollowUpNotes('');
      setFollowUpDate('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule follow-up');
    }
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callNotes) return;
    try {
      await api.post('/activities', {
        requirementId: requirement.id,
        activityType: 'CALL_LOGGED',
        title: `Phone Call Logged (${callOutcome})`,
        description: callNotes,
      });

      if (advanceStageFromCall && requirement.status !== LeadStatus.WON) {
        await api.patch(`/requirements/${requirement.id}/status`, {
          status: LeadStatus.INTERESTED,
          notes: `Auto-advanced pipeline stage from customer call: ${callOutcome}`,
        });
      }

      setIsLogCallModalOpen(false);
      setCallNotes('');
      setAdvanceStageFromCall(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to log call');
    }
  };

  const pipelineStages: { label: string; status: LeadStatus }[] = [
    { label: 'New', status: LeadStatus.NEW },
    { label: 'Contacted', status: LeadStatus.CONTACTED },
    { label: 'Req Confirmed', status: LeadStatus.REQUIREMENT_CONFIRMED },
    { label: 'Searching', status: LeadStatus.VEHICLE_SEARCHING },
    { label: 'Matched', status: LeadStatus.VEHICLE_MATCHED },
    { label: 'Shared', status: LeadStatus.VEHICLE_SHARED },
    { label: 'Interested', status: LeadStatus.INTERESTED },
    { label: 'Test Drive', status: LeadStatus.TEST_DRIVE },
    { label: 'Negotiation', status: LeadStatus.NEGOTIATION },
    { label: 'Booking', status: LeadStatus.BOOKING },
    { label: 'Won', status: LeadStatus.WON },
  ];

  const currentStageIndex = pipelineStages.findIndex((s) => s.status === requirement.status);

  // Populated fields for 2-column info grid
  const populatedFields: { label: string; value: string }[] = [];
  if (requirement.category) populatedFields.push({ label: 'Category', value: requirement.category === 'COMMERCIAL' ? 'Commercial Vehicle' : 'Passenger Car' });
  if (requirement.brand) populatedFields.push({ label: 'Make / Brand', value: requirement.brand });
  if (requirement.model) populatedFields.push({ label: 'Model', value: requirement.model });
  if (requirement.variant) populatedFields.push({ label: 'Variant / Trim', value: requirement.variant });
  if (requirement.minBudget || requirement.maxBudget) populatedFields.push({ label: 'Budget Range', value: formatBudgetRange(requirement.minBudget, requirement.maxBudget) });
  if (requirement.fuelType && requirement.fuelType !== 'ANY') populatedFields.push({ label: 'Fuel Type', value: requirement.fuelType });
  if (requirement.transmission && requirement.transmission !== 'ANY') populatedFields.push({ label: 'Transmission', value: requirement.transmission });
  if (requirement.minYear) populatedFields.push({ label: 'Min Model Year', value: `${requirement.minYear}+` });
  if (requirement.maxKm) populatedFields.push({ label: 'Max KM Driven', value: `${requirement.maxKm.toLocaleString()} KM` });
  if (requirement.preferredColor) populatedFields.push({ label: 'Color Preference', value: requirement.preferredColor });
  if (requirement.assignedTo) populatedFields.push({ label: 'Assigned Staff', value: requirement.assignedTo.fullName });
  populatedFields.push({ label: 'Lead Created', value: formatDate(requirement.createdAt) });

  const canEditLead = isManager || !requirement.assignedToId || (user?.id && requirement.assignedToId === user.id);

  return (
    <div className="space-y-4">
      {/* Read-Only Banner for Peer Staff */}
      {!canEditLead && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800 shadow-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔒</span>
            <span>
              <strong>Read-Only Lead:</strong> Assigned to <strong className="text-amber-900">{requirement.assignedTo?.fullName || 'another sales executive'}</strong>. Only the assigned owner or dealership management can advance pipeline stages, log calls, or edit details.
            </span>
          </div>
          <span className="text-[10px] font-bold bg-amber-100/90 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0 uppercase tracking-wider">
            Protected
          </span>
        </div>
      )}

      {/* Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Breadcrumb
          items={[
            { label: 'Leads', href: '/requirements' },
            { label: `${requirement.customer?.fullName || 'Lead'} · ${requirement.brand || ''} ${requirement.model || ''}` },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {requirement.customer?.primaryMobile && (
            canEditLead ? (
              <a
                href={`tel:${requirement.customer.primaryMobile}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium shadow-subtle"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Call</span>
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-400 bg-slate-100 text-xs font-medium cursor-not-allowed"
                title={`Lead assigned to ${requirement.assignedTo?.fullName || 'another executive'}. Call action restricted to owner.`}
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>🔒 Call Restricted</span>
              </span>
            )
          )}

          {canEditLead && (
            <>
              <Button
                onClick={() => setIsLogCallModalOpen(true)}
                variant="outline"
                size="sm"
                leftIcon={<Phone className="w-3.5 h-3.5 text-brand-600" />}
              >
                Log Call
              </Button>

              <Button
                onClick={() => setIsFollowUpModalOpen(true)}
                variant="outline"
                size="sm"
                leftIcon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
              >
                Follow-up
              </Button>
            </>
          )}

          {isManager && (
            <Button
              onClick={() => {
                setSelectedStaffId(requirement.assignedToId || '');
                setIsAssignModalOpen(true);
              }}
              variant="outline"
              size="sm"
              leftIcon={<UserCheck className="w-3.5 h-3.5 text-slate-600" />}
            >
              Assign Staff
            </Button>
          )}

          {canEditLead && (
            <>
              <Button
                onClick={() => setIsEditModalOpen(true)}
                variant="outline"
                size="sm"
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>

              <Button
                onClick={() => {
                  setNewStatus(requirement.status);
                  setIsStatusModalOpen(true);
                }}
                variant="primary"
                size="sm"
              >
                Update Status
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Requirement Profile Card */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-subtle">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          {/* Left: Spec Summary */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <CategoryBadge category={requirement.category} />
              <PriorityBadge priority={requirement.priority} />
              <StatusBadge status={requirement.status} />
            </div>

            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              {requirement.brand || ''} {requirement.model || 'Lead Requirement'}{' '}
              {requirement.variant || ''}
            </h1>

            {/* 2-Column Populated Fields Only Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-slate-100 text-xs">
              {populatedFields.map((field) => (
                <div key={field.label} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">{field.label}:</span>
                  <span className="text-slate-900 font-semibold">{field.value}</span>
                </div>
              ))}
            </div>

            {requirement.generalNotes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                <span className="font-semibold text-slate-800">Notes:</span> {requirement.generalNotes}
              </div>
            )}
          </div>

          {/* Right: Customer Profile Box */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl sm:w-72 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-slate-500">
                Customer Details
              </span>
              <button
                onClick={() => navigate(`/customers/${requirement.customerId}`)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                View Profile →
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs">
                {requirement.customer?.fullName.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">{requirement.customer?.fullName}</div>
                <div className="text-[11px] text-slate-500">{requirement.customer?.city || 'Location N/A'}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
              <a
                href={`tel:${requirement.customer?.primaryMobile}`}
                className="flex-1 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-medium text-slate-800 flex items-center justify-center gap-1 transition-colors"
              >
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{requirement.customer?.primaryMobile}</span>
              </a>

              <a
                href={`https://wa.me/91${requirement.customer?.primaryMobile}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>

            <div className="text-[11px] text-slate-500 pt-0.5">
              Owner: <strong className="text-slate-800 font-medium">{requirement.assignedTo?.fullName || 'Unassigned'}</strong>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Stepper */}
        <div className="mt-5 pt-4 border-t border-slate-100 overflow-x-auto pb-1">
          <div className="flex items-center justify-between min-w-[680px]">
            {pipelineStages.map((stage, idx) => {
              const isPassed = currentStageIndex >= idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div
                  key={stage.status}
                  onClick={() => {
                    if (!canEditLead) return;
                    setNewStatus(stage.status);
                    setIsStatusModalOpen(true);
                  }}
                  className={`flex flex-col items-center gap-1 flex-1 group ${canEditLead ? 'cursor-pointer' : 'cursor-default'}`}
                  title={!canEditLead ? 'Read-only: Lead assigned to another staff' : `Advance to ${stage.label}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCurrent
                        ? 'bg-brand-600 text-white shadow-subtle ring-2 ring-brand-100'
                        : isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPassed && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] whitespace-nowrap font-medium ${
                      isCurrent
                        ? 'font-bold text-brand-700'
                        : isPassed
                        ? 'text-slate-800 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
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
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Matching Vehicles ({matches.length})</span>
          </span>
          {activeTab === 'matches' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'timeline' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Activity Timeline ({activities.length})</span>
          {activeTab === 'timeline' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'followups' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Follow-ups ({followUps.length})</span>
          {activeTab === 'followups' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`pb-2.5 relative transition-colors ${
            activeTab === 'communications' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>WhatsApp Outreaches ({communications.length})</span>
          {activeTab === 'communications' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
          )}
        </button>
      </div>

      {/* Tab 1: Matching Vehicles Engine Cards */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <EmptyState
              title="No matching inventory found"
              description="When matching vehicle inventory is added matching this budget and specification, matches will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matches.map((m) => {
                const reasons = m.matchReasons ? JSON.parse(m.matchReasons) : [];
                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-subtle space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-14 rounded bg-slate-100 overflow-hidden shrink-0">
                          <img
                            src={
                              m.vehicle?.images?.[0]?.url ||
                              'https://images.unsplash.com/photo-1590362891988-349f7e5239e3?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={m.vehicle?.model}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {m.matchScore}% Match
                            </span>
                            {m.isShared && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                Proposal Sent
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold text-slate-900 mt-1">
                            {m.vehicle?.make} {m.vehicle?.model} ({m.vehicle?.manufacturingYear})
                          </h4>
                          <div className="text-xs font-medium text-slate-900">
                            ₹{((m.vehicle?.price || 0) / 100000).toFixed(1)} Lakh
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Factor Match Criteria (Matches in Green, Mismatches in Red) */}
                    <div className="pt-1">
                      <MatchCriteriaCard
                        reasons={reasons}
                        score={m.matchScore}
                        vehicle={m.vehicle}
                        requirement={requirement}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/inventory/${m.vehicle?.id}`)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Vehicle Details →
                      </button>

                      {canEditLead ? (
                        <Button
                          onClick={() => setSelectedVehicleForWhatsApp(m.vehicle)}
                          variant="primary"
                          size="sm"
                          leftIcon={<Send className="w-3 h-3" />}
                        >
                          Prepare WhatsApp
                        </Button>
                      ) : (
                        <span
                          className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 cursor-not-allowed flex items-center gap-1 font-medium"
                          title={`Assigned to ${requirement.assignedTo?.fullName || 'another executive'}. WhatsApp outreach restricted to owner.`}
                        >
                          🔒 Owner Outreach Only
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Activity Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase text-slate-700">Chronological Activity Log</span>
            <Button
              onClick={() => setIsLogCallModalOpen(true)}
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Log Activity
            </Button>
          </div>

          <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {activities.map((act) => (
              <div key={act.id} className="relative pl-7">
                <div className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{act.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(act.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">{act.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    By {act.performedBy?.fullName || 'System'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase text-slate-700">Scheduled Follow-ups</span>
            <Button
              onClick={() => setIsFollowUpModalOpen(true)}
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Schedule Follow-up
            </Button>
          </div>

          {followUps.length === 0 ? (
            <EmptyState
              title="No follow-ups scheduled"
              description="Schedule a reminder call or showroom visit."
              actionLabel="Schedule Follow-up"
              onAction={() => setIsFollowUpModalOpen(true)}
            />
          ) : (
            <div className="space-y-2">
              {followUps.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-subtle"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {f.followUpType}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {formatDateTime(f.followUpDate)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Status: <strong className="text-slate-800">{f.status}</strong>
                      </span>
                    </div>
                    {f.notes && <p className="text-xs text-slate-600 mt-1">{f.notes}</p>}
                    {f.outcome && (
                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                        Outcome: {f.outcome}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    Assigned: {f.assignedTo?.fullName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Communication Records */}
      {activeTab === 'communications' && (
        <div className="space-y-3">
          {communications.length === 0 ? (
            <EmptyState
              title="No WhatsApp messages recorded"
              description="Use the 'Prepare WhatsApp' action from matching vehicles to generate proposals."
            />
          ) : (
            communications.map((comm) => (
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
              </div>
            ))
          )}
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Lead Lifecycle Status"
        subtitle={`Current status: ${requirement.status}`}
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <Select
            label="Select New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
          >
            {pipelineStages.map((s) => (
              <option key={s.status} value={s.status}>
                {s.label} ({s.status})
              </option>
            ))}
            <option value="LOST">Lost Lead</option>
            <option value="FOLLOW_UP_LATER">Follow-up Later</option>
          </Select>

          {newStatus === LeadStatus.WON && (
            <div className="space-y-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Closing Deal & Delivering Vehicle</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purchased Vehicle (Stock will be marked as SOLD)
                </label>
                <select
                  value={soldVehicleId}
                  onChange={(e) => setSoldVehicleId(e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Select Sold Vehicle from Showroom Stock --</option>
                  {/* Matched vehicles first */}
                  {matches.length > 0 && (
                    <optgroup label="Matched Vehicles for this Requirement">
                      {matches.map((m: any) => (
                        <option key={m.vehicle?.id} value={m.vehicle?.id}>
                          🎯 {m.vehicle?.make} {m.vehicle?.model} {m.vehicle?.variant || ''} ({m.vehicle?.manufacturingYear}) · {formatLakhs(m.vehicle?.price)} · {m.matchScore}% Match
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {/* Other showroom stock */}
                  {availableVehicles.length > 0 && (
                    <optgroup label="Other Available Showroom Stock">
                      {availableVehicles
                        .filter((v: any) => !matches.some((m: any) => m.vehicle?.id === v.id))
                        .map((v: any) => (
                          <option key={v.id} value={v.id}>
                            🚗 {v.make} {v.model} {v.variant || ''} ({v.manufacturingYear}) · {formatLakhs(v.price)} · {v.location || 'Showroom'}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-emerald-800 mt-1">
                  ℹ️ Selecting a vehicle will automatically transition its inventory status to <strong>SOLD</strong> and archive duplicate buyer matches.
                </p>
              </div>

              <div>
                <Input
                  label="Final Closed Deal Amount"
                  type="text"
                  placeholder="e.g. 17.5 for 17.5 Lakhs or 1750000"
                  value={wonAmountLakhs}
                  onChange={(e) => setWonAmountLakhs(e.target.value)}
                />
                {wonAmountLakhs && formatCurrencyPreview(wonAmountLakhs) && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Interpreted: <strong>{formatCurrencyPreview(wonAmountLakhs)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {newStatus === LeadStatus.LOST && (
            <Select
              label="Reason for Lost Deal"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            >
              <option value="Price too high">Price too high</option>
              <option value="Bought competitor vehicle">Bought competitor vehicle</option>
              <option value="Finance rejected">Finance rejected</option>
              <option value="Customer dropped requirement">Customer dropped requirement</option>
              <option value="Inventory unavailable">Inventory unavailable</option>
            </Select>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transition Notes
            </label>
            <textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Customer took test drive and agreed on token advance..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Status Change
            </Button>
          </div>
        </form>
      </Modal>

      {/* Staff Reassign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Reassign Lead to Staff"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <Select
            label="Assign Sales Executive / Field Agent"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          >
            <option value="">Select Staff</option>
            {(staffList || []).map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        title="Schedule Customer Follow-up"
      >
        <form onSubmit={handleCreateFollowUp} className="space-y-4">
          <Input
            label="Follow-up Date & Time"
            type="datetime-local"
            required
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />

          <Select
            label="Follow-up Method"
            value={followUpType}
            onChange={(e) => setFollowUpType(e.target.value)}
          >
            <option value="CALL">Phone Call</option>
            <option value="WHATSAPP">WhatsApp Message</option>
            <option value="VISIT">Showroom / Yard Visit</option>
            <option value="TEST_DRIVE">Test Drive</option>
            <option value="MEETING">Meeting</option>
          </Select>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agenda / Notes
            </label>
            <textarea
              rows={2}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Call to discuss pricing for 2022 Innova..."
            />
          </div>

          {(followUpType === 'TEST_DRIVE' || followUpType === 'VISIT') && (
            <label className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdvanceFollowUp}
                onChange={(e) => setAutoAdvanceFollowUp(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              />
              <span className="font-medium">
                Auto-advance lead stage to <strong>{followUpType === 'TEST_DRIVE' ? 'Test Drive' : 'Showroom Visit'}</strong>
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsFollowUpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Reminder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Call Modal */}
      <Modal
        isOpen={isLogCallModalOpen}
        onClose={() => setIsLogCallModalOpen(false)}
        title="Log Customer Call Activity"
      >
        <form onSubmit={handleLogCall} className="space-y-4">
          <Select
            label="Call Outcome"
            value={callOutcome}
            onChange={(e) => setCallOutcome(e.target.value)}
          >
            <option value="Customer interested in visiting showroom">Customer interested in visiting showroom</option>
            <option value="Customer requested vehicle photos on WhatsApp">Customer requested vehicle photos on WhatsApp</option>
            <option value="Negotiating price">Negotiating price</option>
            <option value="Customer not reachable / Busy">Customer not reachable / Busy</option>
            <option value="Customer postponed decision">Customer postponed decision</option>
          </Select>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Call Discussion Notes
            </label>
            <textarea
              rows={3}
              required
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Talked with Ravi. He liked the Innova Crysta photos and wants to visit this Saturday for test drive..."
            />
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={advanceStageFromCall}
              onChange={(e) => setAdvanceStageFromCall(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
            <span>Move stage forward to <strong>Interested (Lead Engaged)</strong></span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsLogCallModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Call Activity
            </Button>
          </div>
        </form>
      </Modal>

      {/* Requirement Edit Modal */}
      <RequirementFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerId={requirement.customerId}
        customerName={requirement.customer?.fullName}
        initialData={requirement}
        onSuccess={() => refetch()}
      />

      {/* WhatsApp Outreach Preview & Dispatch Modal */}
      {selectedVehicleForWhatsApp && (
        <WhatsAppOutreachModal
          isOpen={!!selectedVehicleForWhatsApp}
          onClose={() => setSelectedVehicleForWhatsApp(null)}
          vehicle={selectedVehicleForWhatsApp}
          requirements={[requirement]}
          onOutreachCompleted={() => {
            setSelectedVehicleForWhatsApp(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};
