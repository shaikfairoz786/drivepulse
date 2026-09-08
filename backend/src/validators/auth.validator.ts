import { z } from 'zod';
import { Role } from '../types';
import { normalizeMobile } from '../utils/mobile';

export const loginSchema = z.object({
  identifier: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().min(1, 'Email or mobile number is required')),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val), z.string().email('Invalid email address format')),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().min(2, 'Full name must be at least 2 characters')),
  mobile: z.preprocess(
    (val) => (typeof val === 'string' ? normalizeMobile(val) : val),
    z.string().min(10, 'Mobile number must be a valid 10-digit number')
  ),
  role: z.nativeEnum(Role).default(Role.SALES_EXECUTIVE),
});

export const updateUserSchema = z.object({
  fullName: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().min(2, 'Full name must be at least 2 characters').optional()),
  email: z.preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toLowerCase() : undefined), z.string().email('Invalid email address').optional()),
  mobile: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? normalizeMobile(val) : undefined),
    z.string().min(10, 'Mobile number must be a valid 10-digit number').optional()
  ),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  password: z.preprocess((val) => (typeof val === 'string' && val.trim().length >= 6 ? val.trim() : undefined), z.string().min(6).optional()),
});
