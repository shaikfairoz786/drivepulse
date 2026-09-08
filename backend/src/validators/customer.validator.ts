import { z } from 'zod';
import { isValidMobile, normalizeMobile } from '../utils/mobile';

export const createCustomerSchema = z.object({
  fullName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(2, 'Customer full name must be at least 2 characters')
  ),
  primaryMobile: z.preprocess(
    (val) => (typeof val === 'string' ? normalizeMobile(val) : val),
    z.string().refine((val) => isValidMobile(val), {
      message: 'Please provide a valid 10-digit mobile number (e.g. 9876543210)',
    })
  ),
  alternateMobile: z.preprocess((val) => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    const clean = normalizeMobile(val);
    return clean || null;
  }, z.string().refine((val) => !val || isValidMobile(val), {
    message: 'Alternate mobile number must be a valid 10-digit number',
  }).nullable().optional()),
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toLowerCase() : null),
    z.string().email('Invalid email address format').nullable().optional()
  ),
  location: z.preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : null), z.string().nullable().optional()),
  city: z.preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : null), z.string().nullable().optional()),
  state: z.preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : null), z.string().nullable().optional()),
  address: z.preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : null), z.string().nullable().optional()),
  preferredContact: z.string().optional().default('WHATSAPP'),
  customerType: z.string().optional().default('INDIVIDUAL'),
  source: z.string().optional().default('WALK_IN'),
  notes: z.preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : null), z.string().nullable().optional()),
});

export const updateCustomerSchema = createCustomerSchema.partial();
