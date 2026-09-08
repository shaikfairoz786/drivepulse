import React from 'react';
import { LeadStatus, Priority, VehicleCategory, VehicleStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    purple: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: LeadStatus | string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  switch (status) {
    case LeadStatus.NEW:
      return <Badge variant="info" size={size}>New Enquiry</Badge>;
    case LeadStatus.CONTACTED:
      return <Badge variant="primary" size={size}>Contacted</Badge>;
    case LeadStatus.REQUIREMENT_CONFIRMED:
      return <Badge variant="primary" size={size}>Req Confirmed</Badge>;
    case LeadStatus.VEHICLE_SEARCHING:
      return <Badge variant="warning" size={size}>Searching Inventory</Badge>;
    case LeadStatus.VEHICLE_MATCHED:
      return <Badge variant="purple" size={size}>Vehicle Matched</Badge>;
    case LeadStatus.VEHICLE_SHARED:
      return <Badge variant="info" size={size}>Vehicle Shared</Badge>;
    case LeadStatus.INTERESTED:
      return <Badge variant="success" size={size}>Interested</Badge>;
    case LeadStatus.VISIT_SCHEDULED:
      return <Badge variant="purple" size={size}>Visit Scheduled</Badge>;
    case LeadStatus.VEHICLE_VIEWED:
      return <Badge variant="info" size={size}>Vehicle Viewed</Badge>;
    case LeadStatus.TEST_DRIVE:
      return <Badge variant="purple" size={size}>Test Drive</Badge>;
    case LeadStatus.NEGOTIATION:
      return <Badge variant="warning" size={size}>Negotiation</Badge>;
    case LeadStatus.BOOKING:
      return <Badge variant="success" size={size}>Booking Made</Badge>;
    case LeadStatus.WON:
      return <Badge variant="success" size={size}>Won / Delivered</Badge>;
    case LeadStatus.LOST:
      return <Badge variant="danger" size={size}>Lost</Badge>;
    case LeadStatus.FOLLOW_UP_LATER:
      return <Badge variant="default" size={size}>Follow-up Later</Badge>;
    default:
      return <Badge variant="default" size={size}>{status}</Badge>;
  }
};

export const PriorityBadge: React.FC<{ priority: Priority | string; showDot?: boolean }> = ({ priority, showDot = true }) => {
  switch (priority) {
    case Priority.URGENT:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>}
          Urgent
        </span>
      );
    case Priority.HIGH:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
          High
        </span>
      );
    case Priority.MEDIUM:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
          Medium
        </span>
      );
    case Priority.LOW:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
          Low
        </span>
      );
    default:
      return <Badge variant="default">{priority}</Badge>;
  }
};

export const CategoryBadge: React.FC<{ category: VehicleCategory | string }> = ({ category }) => {
  return category === VehicleCategory.COMMERCIAL ? (
    <Badge variant="purple" size="sm">Commercial</Badge>
  ) : (
    <Badge variant="info" size="sm">Passenger</Badge>
  );
};

export const VehicleStatusBadge: React.FC<{ status: VehicleStatus | string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return <Badge variant="success" size={size}>Available</Badge>;
    case VehicleStatus.RESERVED:
      return <Badge variant="warning" size={size}>Reserved</Badge>;
    case VehicleStatus.ON_HOLD:
      return <Badge variant="default" size={size}>On Hold</Badge>;
    case VehicleStatus.SOLD:
      return <Badge variant="purple" size={size}>Sold</Badge>;
    case VehicleStatus.UNDER_INSPECTION:
      return <Badge variant="info" size={size}>Inspection</Badge>;
    case VehicleStatus.INACTIVE:
      return <Badge variant="danger" size={size}>Inactive</Badge>;
    default:
      return <Badge variant="default" size={size}>{status}</Badge>;
  }
};
