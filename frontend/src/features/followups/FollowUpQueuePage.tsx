import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  Check,
  Plus,
  User,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { FollowUp, FollowUpStatus, FollowUpType } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const FollowUpQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as any) || 'TODAY';
  const [page, setPage] = useState(1);
  const [staffFilter, setStaffFilter] = useState<string>(isManager ? 'ALL' : 'MY');

  // Fetch staff users for Manager/Admin oversight
  const { data: staffList = [] } = useQuery({
    queryKey: ['staffUsers'],
    queryFn: async () => {
      const res: any = await api.get('/auth/users');
      return res.data || [];
    },
    enabled: isManager,
  });

  const effectiveAssignedToId = isManager
    ? (staffFilter === 'MY' ? user?.id : (staffFilter === 'ALL' ? undefined : staffFilter))
    : user?.id;

  // Complete Follow-up Modal State
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextType, setNextType] = useState('CALL');
  const [nextNotes, setNextNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['followups', activeTab, page, effectiveAssignedToId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      params.set('page', String(page));
      params.set('limit', '25');
      if (effectiveAssignedToId) {
        params.set('assignedToId', effectiveAssignedToId);
      }
      const res: any = await api.get(`/followups?${params.toString()}`);
      return res.data;
    },
  });

  const followUps: FollowUp[] = data?.followUps || [];
  const counts = data?.counts || { overdue: 0, today: 0, upcoming: 0 };
  const meta = data?.meta;

  const handleTabChange = (tab: string) => {
    setPage(1);
    setSearchParams({ tab });
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp || !outcomeNotes.trim()) return;

    setIsCompleting(true);
    try {
      await api.patch(`/followups/${selectedFollowUp.id}/complete`, {
        outcome: outcomeNotes,
        status: FollowUpStatus.COMPLETED,
        nextFollowUpDate: scheduleNext && nextDate ? new Date(nextDate).toISOString() : undefined,
        nextFollowUpType: scheduleNext ? nextType : undefined,
        nextFollowUpNotes: scheduleNext ? nextNotes : undefined,
      });
      setSelectedFollowUp(null);
      setOutcomeNotes('');
      setScheduleNext(false);
      setNextDate('');
      setNextNotes('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to complete follow-up');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Follow-up Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track overdue tasks, today's call schedule, and upcoming sales touchpoints.
          </p>
        </div>

        {isManager ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setStaffFilter('ALL'); setPage(1); }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  staffFilter === 'ALL' ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Team
              </button>
              <button
                type="button"
                onClick={() => { setStaffFilter('MY'); setPage(1); }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  staffFilter === 'MY' ? 'bg-white text-slate-900 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Tasks
              </button>
            </div>

            <select
              value={staffFilter === 'ALL' || staffFilter === 'MY' ? '' : staffFilter}
              onChange={(e) => {
                if (e.target.value) {
                  setStaffFilter(e.target.value);
                  setPage(1);
                }
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Specific Staff Member...</option>
              {staffList.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-brand-700">
            <User className="w-3.5 h-3.5 text-brand-600" />
            <span>My Personal Schedule ({user?.fullName})</span>
          </div>
        )}
      </div>

      {/* Tabs with Badge Counters */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('OVERDUE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'OVERDUE'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Overdue</span>
          {counts.overdue > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-[10px] text-white">
              {counts.overdue}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('TODAY')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'TODAY'
              ? 'bg-blue-50 text-brand-700 border border-blue-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-brand-600" />
          <span>Today</span>
          {counts.today > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-brand-600 text-[10px] text-white">
              {counts.today}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('UPCOMING')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'UPCOMING'
              ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5 text-purple-600" />
          <span>Upcoming</span>
          {counts.upcoming > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-[10px] text-white">
              {counts.upcoming}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('COMPLETED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-subtle'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Completed</span>
        </button>
      </div>

      {/* Follow-up Queue List */}
      {isLoading ? (
        <LoadingSpinner message="Loading follow-up queue..." />
      ) : followUps.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} follow-ups`}
          description="All customer follow-up actions in this category are up-to-date."
        />
      ) : (
        <div className="space-y-2.5">
          {followUps.map((f) => {
            const cust = f.requirement?.customer;
            const canComplete = isManager || !f.assignedToId || (user?.id && f.assignedToId === user.id);
            return (
              <div
                key={f.id}
                className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        activeTab === 'OVERDUE'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-brand-700 border border-blue-200'
                      }`}
                    >
                      {f.followUpType}
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {formatDateTime(f.followUpDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h4
                      onClick={() => cust && navigate(`/customers/${cust.id}`)}
                      className="text-xs font-bold text-slate-900 hover:text-brand-600 cursor-pointer"
                    >
                      {cust?.fullName}
                    </h4>
                    <span className="text-xs text-slate-400">·</span>
                    <a
                      href={`tel:${cust?.primaryMobile}`}
                      className="text-xs font-mono text-slate-600 hover:text-brand-600 flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{cust?.primaryMobile}</span>
                    </a>
                  </div>

                  {f.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      📝 {f.notes}
                    </p>
                  )}

                  {f.outcome && (
                    <p className="text-xs text-emerald-700 font-medium">
                      Outcome: {f.outcome}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-500 pt-0.5">
                    Assigned: <span className="font-medium text-slate-700">{f.assignedTo?.fullName || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => f.requirementId && navigate(`/requirements/${f.requirementId}`)}
                  >
                    View Lead
                  </Button>

                  {f.status === FollowUpStatus.PENDING && (
                    canComplete ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedFollowUp(f)}
                        leftIcon={<Check className="w-3 h-3" />}
                      >
                        Complete
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded border border-slate-200" title="Assigned to another staff">
                        🔒 Read-Only
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Follow-up Modal */}
      {selectedFollowUp && (
        <Modal
          isOpen={!!selectedFollowUp}
          onClose={() => setSelectedFollowUp(null)}
          title="Complete Follow-up & Record Outcome"
          subtitle={`Customer: ${selectedFollowUp.requirement?.customer?.fullName}`}
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Follow-up Outcome Notes *
              </label>
              <textarea
                rows={3}
                required
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="e.g. Spoke with customer. He agreed to visit this Saturday for test drive..."
                className="w-full bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Next Follow-up Trigger Checkbox */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleNext}
                  onChange={(e) => setScheduleNext(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-0 w-4 h-4"
                />
                <span>Schedule Next Follow-up for this customer</span>
              </label>

              {scheduleNext && (
                <div className="space-y-2.5 pt-1.5">
                  <Input
                    label="Next Follow-up Date & Time"
                    type="datetime-local"
                    required={scheduleNext}
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                  />

                  <Select
                    label="Method"
                    value={nextType}
                    onChange={(e) => setNextType(e.target.value)}
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp Message</option>
                    <option value="VISIT">Showroom Visit</option>
                    <option value="TEST_DRIVE">Test Drive</option>
                  </Select>

                  <Input
                    label="Agenda for next follow-up"
                    placeholder="e.g. Confirm arrival time for test drive"
                    value={nextNotes}
                    onChange={(e) => setNextNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFollowUp(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isCompleting}>
                Save & Complete
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
