export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES_EXECUTIVE = 'SALES_EXECUTIVE',
  FIELD_AGENT = 'FIELD_AGENT',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  REQUIREMENT_CONFIRMED = 'REQUIREMENT_CONFIRMED',
  VEHICLE_SEARCHING = 'VEHICLE_SEARCHING',
  VEHICLE_MATCHED = 'VEHICLE_MATCHED',
  VEHICLE_SHARED = 'VEHICLE_SHARED',
  INTERESTED = 'INTERESTED',
  VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  VEHICLE_VIEWED = 'VEHICLE_VIEWED',
  TEST_DRIVE = 'TEST_DRIVE',
  NEGOTIATION = 'NEGOTIATION',
  BOOKING = 'BOOKING',
  WON = 'WON',
  LOST = 'LOST',
  FOLLOW_UP_LATER = 'FOLLOW_UP_LATER',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum VehicleCategory {
  PASSENGER = 'PASSENGER',
  COMMERCIAL = 'COMMERCIAL',
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ON_HOLD = 'ON_HOLD',
  SOLD = 'SOLD',
  INACTIVE = 'INACTIVE',
  UNDER_INSPECTION = 'UNDER_INSPECTION',
}

export enum FollowUpType {
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
  VISIT = 'VISIT',
  TEST_DRIVE = 'TEST_DRIVE',
  MEETING = 'MEETING',
  OTHER = 'OTHER',
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  MISSED = 'MISSED',
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  primaryMobile: string;
  alternateMobile?: string | null;
  email?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  preferredContact?: string | null;
  customerType?: string | null;
  source: string;
  notes?: string | null;
  createdAt: string;
  requirements?: CustomerRequirement[];
  communications?: CommunicationLog[];
  _count?: {
    requirements: number;
    communications: number;
  };
}

export interface MatchReason {
  factor: string;
  status: 'MATCH' | 'STRONG_MATCH' | 'PARTIAL' | 'NOT_SPECIFIED' | 'MISMATCH';
  detail: string;
}

export interface CustomerRequirement {
  id: string;
  customerId: string;
  customer?: Customer;
  category: VehicleCategory;
  status: LeadStatus;
  priority: Priority;
  source: string;
  assignedToId?: string | null;
  assignedTo?: User | null;

  brand?: string | null;
  model?: string | null;
  variant?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  minYear?: number | null;
  maxYear?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  maxKm?: number | null;
  preferredColor?: string | null;
  ownershipPreference?: string | null;
  locationPreference?: string | null;
  usagePurpose?: string | null;
  generalNotes?: string | null;

  commercialType?: string | null;
  bodyType?: string | null;
  payloadCapacityKg?: number | null;
  numberOfWheels?: number | null;
  axleConfiguration?: string | null;
  loadRequirement?: string | null;
  routePermit?: string | null;

  lostReason?: string | null;
  wonDealAmount?: number | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  matches?: VehicleMatch[];
  followUps?: FollowUp[];
  activities?: LeadActivity[];
  communications?: CommunicationLog[];
  _count?: {
    activities: number;
    matches: number;
    followUps: number;
  };
}

export interface VehicleImage {
  id: string;
  vehicleId: string;
  url: string;
  isPrimary: boolean;
  caption?: string | null;
  sortOrder: number;
}

export interface Vehicle {
  id: string;
  externalVehicleId?: string | null;
  registrationNumber?: string | null;
  make: string;
  model: string;
  variant?: string | null;
  category: VehicleCategory;
  vehicleType?: string | null;
  manufacturingYear: number;
  registrationYear?: number | null;
  fuelType: string;
  transmission?: string | null;
  kmDriven: number;
  numberOfOwners: number;
  color?: string | null;
  price: number;
  location: string;
  description?: string | null;
  status: VehicleStatus;

  bodyType?: string | null;
  payloadCapacityKg?: number | null;
  numberOfWheels?: number | null;
  axleConfiguration?: string | null;
  permitType?: string | null;

  publicVehicleUrl?: string | null;
  externalMarketplaceUrl?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;

  images: VehicleImage[];
  matches?: VehicleMatch[];
  _count?: {
    matches: number;
    communications: number;
  };
}

export interface VehicleMatch {
  id: string;
  requirementId: string;
  requirement?: CustomerRequirement;
  vehicleId: string;
  vehicle?: Vehicle;
  matchScore: number;
  matchReasons: string; // JSON
  isIgnored: boolean;
  isShared: boolean;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  requirementId: string;
  requirement?: CustomerRequirement;
  assignedToId: string;
  assignedTo?: User;
  followUpDate: string;
  followUpType: FollowUpType;
  status: FollowUpStatus;
  notes?: string | null;
  outcome?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  requirementId: string;
  performedById?: string | null;
  performedBy?: User | null;
  activityType: string;
  title: string;
  description: string;
  metadata?: string | null;
  createdAt: string;
}

export interface CommunicationLog {
  id: string;
  customerId: string;
  customer?: Customer;
  requirementId?: string | null;
  requirement?: CustomerRequirement | null;
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
  channel: string;
  templateType: string;
  messageContent: string;
  recipientMobile: string;
  mediaUrl?: string | null;
  status: string;
  preparedById: string;
  preparedBy?: User;
  sentAt?: string | null;
  createdAt: string;
  whatsAppDeepLink?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}
