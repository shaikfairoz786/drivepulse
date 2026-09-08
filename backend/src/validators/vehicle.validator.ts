import { z } from 'zod';
import { VehicleCategory, VehicleStatus } from '../types';

const optionalNumber = (schema: z.ZodNumber = z.number()) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, schema.optional().nullable());

const optionalString = (schema: z.ZodString = z.string()) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    return typeof val === 'string' ? val.trim() : val;
  }, schema.optional().nullable());

const optionalUrl = () =>
  z.preprocess((val) => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  }, z.string().url().optional().nullable().or(z.literal('')));

export const createVehicleSchema = z.object({
  externalVehicleId: optionalString(),
  registrationNumber: optionalString(),
  make: z.string().min(1, 'Make/Brand is required'),
  model: z.string().min(1, 'Model is required'),
  variant: optionalString(),
  category: z.nativeEnum(VehicleCategory).default(VehicleCategory.PASSENGER),
  vehicleType: optionalString(),
  manufacturingYear: z.preprocess((val) => Number(val), z.number().int().min(1990).max(2035, 'Invalid manufacturing year')),
  registrationYear: optionalNumber(z.number().int().min(1990).max(2035)),
  fuelType: z.string().min(1, 'Fuel type is required'),
  transmission: optionalString(),
  kmDriven: z.preprocess((val) => Number(val), z.number().int().nonnegative('KM driven must be a positive number')),
  numberOfOwners: z.preprocess((val) => Number(val) || 1, z.number().int().positive().default(1)),
  color: optionalString(),
  price: z.preprocess((val) => Number(val), z.number().positive('Price must be greater than 0')),
  location: z.string().min(1, 'Location is required'),
  description: optionalString(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),

  // Commercial attributes
  bodyType: optionalString(),
  payloadCapacityKg: optionalNumber(z.number().nonnegative()),
  numberOfWheels: optionalNumber(z.number().int().nonnegative()),
  axleConfiguration: optionalString(),
  permitType: optionalString(),

  // External / Marketplace Links
  publicVehicleUrl: optionalUrl(),
  externalMarketplaceUrl: optionalUrl(),
  source: z.string().optional().default('DIRECT_INVENTORY'),
});

export const updateVehicleSchema = createVehicleSchema.partial().strip();
