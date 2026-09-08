import React, { useState } from 'react';
import { Send, Copy, Check, ExternalLink, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Vehicle, CustomerRequirement } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  requirements: CustomerRequirement[];
  onOutreachCompleted?: () => void;
}

export const WhatsAppOutreachModal: React.FC<WhatsAppOutreachModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  requirements,
  onOutreachCompleted,
}) => {
  const { user, isManager } = useAuth();
  const [customNote, setCustomNote] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedResult, setPreparedResult] = useState<any | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Enforce Lead Ownership: non-managers can only outreach to unassigned leads or their own leads
  const allowedRequirements = React.useMemo(() => {
    if (isManager) return requirements;
    return requirements.filter(
      (r) => !r.assignedToId || (user?.id && r.assignedToId === user.id)
    );
  }, [requirements, isManager, user?.id]);

  const blockedRequirements = React.useMemo(() => {
    if (isManager) return [];
    return requirements.filter(
      (r) => r.assignedToId && (!user?.id || r.assignedToId !== user.id)
    );
  }, [requirements, isManager, user?.id]);

  const handlePrepare = async () => {
    if (allowedRequirements.length === 0) {
      setServerError('None of the selected leads are assigned to you. Only the assigned executive or a manager can send outreach.');
      return;
    }
    setServerError(null);
    setIsPreparing(true);
    try {
      const res: any = await api.post('/communications/prepare', {
        vehicleId: vehicle.id,
        requirementIds: allowedRequirements.map((r) => r.id),
        customNote: customNote || undefined,
      });
      if (res.success && res.data) {
        setPreparedResult(res.data);
      }
    } catch (err: any) {
      const detailedError =
        (Array.isArray(err.errors) && err.errors.length > 0
          ? err.errors.map((e: any) => `${e.field || e.path?.join('.') || 'Error'}: ${e.message}`).join('; ')
          : null) ||
        err.message ||
        'Failed to prepare outreach';
      setServerError(detailedError);
    } finally {
      setIsPreparing(false);
    }
  };

  const handleMarkSent = async (commLogId: string) => {
    try {
      await api.patch(`/communications/${commLogId}/status`, {
        status: 'MANUALLY_SENT',
      });
      setSentMap((prev) => ({ ...prev, [commLogId]: true }));
      if (onOutreachCompleted) onOutreachCompleted();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prepare WhatsApp Vehicle Outreach"
      subtitle={`Outreach for: ${vehicle.make} ${vehicle.model} (${vehicle.manufacturingYear})`}
      maxWidth="2xl"
    >
      <div className="space-y-3.5">
        {serverError && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Selected Targets Header */}
        <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div>
            <span className="text-slate-500">Target Recipients: </span>
            <span className="font-semibold text-slate-900">
              {allowedRequirements.length} Customer{allowedRequirements.length > 1 ? 's' : ''} Ready
              {blockedRequirements.length > 0 && ` (${blockedRequirements.length} Protected / Excluded)`}
            </span>
          </div>
          <span className="font-mono text-slate-900 font-semibold">
            Vehicle Price: ₹{(vehicle.price / 100000).toFixed(2)} Lakh
          </span>
        </div>

        {/* Lead Ownership Notice */}
        {blockedRequirements.length > 0 && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <span className="text-sm">🔒</span>
            <div>
              <strong className="text-amber-900">Lead Ownership Protection: </strong>
              <span>
                {blockedRequirements.length} customer enquiry{blockedRequirements.length > 1 ? ' is' : ''} assigned to other sales executives ({blockedRequirements.map(b => b.assignedTo?.fullName || 'Colleague').filter((v, i, a) => a.indexOf(v) === i).join(', ')}). Peer sales staff cannot cross-outreach to colleagues' assigned leads.
              </span>
            </div>
          </div>
        )}

        {/* Custom Note input before preparing */}
        {!preparedResult && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Personalized Salesperson Note (Optional)
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Single owner vehicle in mint condition, special discount available this week..."
                className="w-full bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-0.5">
              <span className="font-semibold">ℹ️ Prepared vs Sent:</span>
              <p className="text-blue-700">
                The system compiles vehicle specs, price, and photo link into a clean WhatsApp template and gives you direct 1-click links to send via WhatsApp Web / App.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrepare}
                isLoading={isPreparing}
                disabled={allowedRequirements.length === 0}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                {allowedRequirements.length === 0 ? 'No Eligible Leads' : 'Generate WhatsApp Messages'}
              </Button>
            </div>
          </div>
        )}

        {/* Prepared Messages Preview & Dispatcher */}
        {preparedResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">
                ✅ {preparedResult.totalPrepared} Messages Prepared (Ready to Dispatch)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreparedResult(null)}
              >
                Edit Note
              </Button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {preparedResult.messages?.map((msg: any, idx: number) => {
                const isSent = sentMap[msg.id] || msg.status === 'SENT' || msg.status === 'MANUALLY_SENT';

                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-subtle space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{msg.customer?.fullName}</h5>
                        <span className="text-[11px] text-slate-500 font-mono">📱 {msg.recipientMobile}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isSent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isSent ? 'Dispatched / Sent' : 'Prepared'}
                      </span>
                    </div>

                    {/* Formatted Message Box */}
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {msg.messageContent}
                    </div>

                    {/* Actions: Launch WhatsApp & Copy */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        onClick={() => copyToClipboard(msg.messageContent, idx)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Message</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        {!isSent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkSent(msg.id)}
                          >
                            Mark Sent
                          </Button>
                        )}

                        <a
                          href={msg.whatsAppDeepLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => handleMarkSent(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-subtle transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Open WhatsApp</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="primary" size="sm" onClick={onClose}>
                Done / Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
