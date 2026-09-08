import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Plus, User, Phone, Mail, CheckCircle2, XCircle, Edit, KeyRound, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Role } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const UsersPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form states for create
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<Role>(Role.SALES_EXECUTIVE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for edit
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.SALES_EXECUTIVE);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res: any = await api.get('/auth/users');
      return res.data || [];
    },
  });

  const users = data || [];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/users', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password,
        role,
      });
      setIsCreateOpen(false);
      setFullName('');
      setEmail('');
      setMobile('');
      refetch();
    } catch (err: any) {
      const msg = err.errors?.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ') || err.message || 'Failed to create user';
      setCreateError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setEditFullName(u.fullName || '');
    setEditEmail(u.email || '');
    setEditMobile(u.mobile || '');
    setEditRole(u.role || Role.SALES_EXECUTIVE);
    setEditIsActive(u.isActive ?? true);
    setEditPassword('');
    setEditError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setIsEditSubmitting(true);
    try {
      const payload: any = {
        fullName: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        mobile: editMobile.trim(),
        role: editRole,
        isActive: editIsActive,
      };
      if (editPassword && editPassword.trim().length >= 6) {
        payload.password = editPassword.trim();
      }

      await api.put(`/auth/users/${editingUser.id}`, payload);
      setEditingUser(null);
      refetch();
    } catch (err: any) {
      const msg = err.errors?.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ') || err.message || 'Failed to update staff user';
      setEditError(msg);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Staff & Roles Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage employee access, role permissions, and active sales accounts.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading user directory..." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Contact Info</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Active Leads</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u: any) => (
                  <tr key={u.id} className="table-row">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs">
                          {u.fullName.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{u.fullName}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="font-mono text-slate-900">{u.mobile}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      {u.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-medium">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Deactivated
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                      {u._count?.assignedRequirements || 0}
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(u)}
                        leftIcon={<Edit className="w-3 h-3" />}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision New Staff Member"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          {createError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Vikram Sharma"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. vikram@autolms.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Mobile Number"
              placeholder="e.g. 9800000006"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="System Role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="SALES_EXECUTIVE">Sales Executive</option>
              <option value="FIELD_AGENT">Field Agent</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">System Administrator</option>
            </Select>

            <Input
              label="Temporary Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="Edit Staff Member"
          subtitle={`Editing: ${editingUser.fullName}`}
        >
          <form onSubmit={handleUpdateUser} className="space-y-3.5">
            {editError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <Input
              label="Full Name"
              placeholder="e.g. Vikram Sharma"
              required
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email Address"
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <Input
                label="Mobile Number"
                required
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="System Role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
              >
                <option value="SALES_EXECUTIVE">Sales Executive</option>
                <option value="FIELD_AGENT">Field Agent</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">System Administrator</option>
              </Select>

              <Select
                label="Account Status"
                value={editIsActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setEditIsActive(e.target.value === 'ACTIVE')}
              >
                <option value="ACTIVE">Active (Allowed Login)</option>
                <option value="INACTIVE">Deactivated (Blocked)</option>
              </Select>
            </div>

            <Input
              label="Reset Password (Optional)"
              type="password"
              placeholder="Leave blank to keep current password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isEditSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
