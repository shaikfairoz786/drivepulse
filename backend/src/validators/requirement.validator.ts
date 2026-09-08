import { z } from 'zod';
import { LeadStatus, Priority, VehicleCategory } from '../types';

const optionalNumber = (schema: z.ZodNumber = z.number()) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, schema.optional().nullable());

const optionalYear = () =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || val === 0 || val === '0') return null;
    const num = Number(val);
    if (isNaN(num) || num <= 0) return null;
    return num;
  }, z.number().int().min(1900).max(2050).optional().nullable());

const optionalString = (schema: z.ZodString = z.string()) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    return typeof val === 'string' ? val.trim() : val;
  }, schema.optional().nullable());

export const createRequirementSchema = z.object({
  customerId: z.string().min(1, 'Invalid customer ID'),
  category: z.nativeEnum(VehicleCategory).default(VehicleCategory.PASSENGER),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  source: z.string().optional().default('WALK_IN'),
  assignedToId: optionalString(z.string().min(1, 'Invalid assigned staff ID')),

  // Passenger & General attributes
  brand: optionalString(),
  model: optionalString(),
  variant: optionalString(),
  minBudget: optionalNumber(z.number().nonnegative()),
  maxBudget: optionalNumber(z.number().nonnegative()),
  minYear: optionalYear(),
  maxYear: optionalYear(),
  fuelType: optionalString(),
  transmission: optionalString(),
  maxKm: optionalNumber(z.number().int().nonnegative()),
  preferredColor: optionalString(),
  ownershipPreference: optionalString(),
  locationPreference: optionalString(),
  usagePurpose: optionalString(),
  generalNotes: optionalString(),

  // Commercial attributes
  commercialType: optionalString(),
  bodyType: optionalString(),
  payloadCapacityKg: optionalNumber(z.number().nonnegative()),
  numberOfWheels: optionalNumber(z.number().int().nonnegative()),
  axleConfiguration: optionalString(),
  loadRequirement: optionalString(),
  routePermit: optionalString(),
});

export const updateRequirementSchema = createRequirementSchema.partial().extend({
  lostReason: optionalString(),
  wonDealAmount: optionalNumber(z.number().nonnegative()),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  notes: optionalString(),
  lostReason: optionalString(),
  wonDealAmount: optionalNumber(z.number().nonnegative()),
  vehicleId: optionalString(z.string().min(1, 'Invalid vehicle ID')),
});

export const assignRequirementSchema = z.object({
  assignedToId: z.string().min(1, 'Invalid staff user ID'),
});
