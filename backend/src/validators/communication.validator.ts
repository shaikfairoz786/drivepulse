import { z } from 'zod';
import { CommunicationStatus } from '../types';

export const prepareOutreachSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  requirementIds: z.array(z.string().min(1, 'Requirement ID is required')).min(1, 'Select at least one requirement'),
  customNote: z.string().optional().nullable(),
});

export const updateCommunicationStatusSchema = z.object({
  status: z.nativeEnum(CommunicationStatus),
  notes: z.string().optional().nullable(),
});
