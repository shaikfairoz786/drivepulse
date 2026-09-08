import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Shield, Eye, Filter, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/formatters';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, searchTerm, selectedAction, selectedEntity],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (searchTerm.trim()) params.append('q', searchTerm.trim());
      if (selectedAction) params.append('action', selectedAction);
      if (selectedEntity) params.append('entity', selectedEntity);

      const res: any = await api.get(`/audit?${params.toString()}`);
      return res;
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedAction('');
    setSelectedEntity('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedAction || selectedEntity);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          System Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit record of user actions, lead status updates, vehicle edits, and staff assignment history.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-subtle space-y-2.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search author name, email, entity ID, or keyword..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Action Types</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="STATUS_CHANGE">STATUS CHANGE</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => {
              setSelectedEntity(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Entities</option>
            <option value="Vehicle">Vehicle Inventory</option>
            <option value="Customer">Customer</option>
            <option value="CustomerRequirement">Lead Requirement</option>
            <option value="User">Staff Account</option>
            <option value="FollowUp">Follow-up Task</option>
            <option value="CommunicationLog">Communication</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="w-3 h-3" />}
            >
              Reset
            </Button>
          )}
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-900">{logs.length}</strong> of <strong className="text-slate-900">{meta.total}</strong> events
          </span>
          {hasActiveFilters && (
            <span className="text-brand-600 font-medium">Filters active</span>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading audit history..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description={hasActiveFilters ? "No records match your selected filters. Try resetting filters." : "Audit log is currently empty."}
          actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
          onAction={hasActiveFilters ? handleResetFilters : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log: any) => (
                  <tr key={log.id} className="table-row">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {log.user?.fullName || 'System'}
                      </span>
                      {log.user && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {log.user.email}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{log.entity}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action === 'STATUS_CHANGE'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-50 text-brand-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Inspect change payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              <span>Page {meta.page} of {meta.totalPages}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* JSON Payload Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Payload Inspection"
          subtitle={`${selectedLog.entity} (${selectedLog.action}) on ${formatDateTime(selectedLog.createdAt)}`}
          maxWidth="2xl"
        >
          <div className="space-y-3 text-xs font-mono">
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Old State:</span>
              <pre className="p-3 rounded bg-slate-50 border border-slate-200 text-rose-700 overflow-x-auto text-[11px]">
                {selectedLog.oldValue ? JSON.stringify(typeof selectedLog.oldValue === 'string' ? JSON.parse(selectedLog.oldValue) : selectedLog.oldValue, null, 2) : 'null'}
              </pre>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">New State:</span>
              <pre className="p-3 rounded bg-slate-50 border border-slate-200 text-emerald-700 overflow-x-auto text-[11px]">
                {selectedLog.newValue ? JSON.stringify(typeof selectedLog.newValue === 'string' ? JSON.parse(selectedLog.newValue) : selectedLog.newValue, null, 2) : 'null'}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
