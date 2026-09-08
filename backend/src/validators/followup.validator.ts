import { z } from 'zod';
import { FollowUpType, FollowUpStatus } from '../types';

export const createFollowUpSchema = z.object({
  requirementId: z.string().min(1, 'Invalid requirement ID'),
  assignedToId: z.string().min(1, 'Invalid assigned staff user ID'),
  followUpDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?)?(Z|[+-]\d{2}:\d{2})?$/)),
  followUpType: z.nativeEnum(FollowUpType).default(FollowUpType.CALL),
  notes: z.string().optional().nullable(),
});

export const completeFollowUpSchema = z.object({
  outcome: z.string().min(1, 'Follow-up outcome/notes are required'),
  status: z.nativeEnum(FollowUpStatus).default(FollowUpStatus.COMPLETED),
  nextFollowUpDate: z.string().optional().nullable(),
  nextFollowUpType: z.nativeEnum(FollowUpType).optional().nullable(),
  nextFollowUpNotes: z.string().optional().nullable(),
});

export const logActivitySchema = z.object({
  requirementId: z.string().min(1, 'Invalid requirement ID'),
  activityType: z.string().min(1, 'Activity type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  metadata: z.record(z.any()).optional().nullable(),
});
