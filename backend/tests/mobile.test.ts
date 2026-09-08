import { describe, it, expect } from 'vitest';
import { normalizeMobile, isValidMobile } from '../src/utils/mobile';

describe('Mobile Normalizer & Validation', () => {
  it('should normalize mobile numbers with +91, 0, spaces, and hyphens', () => {
    expect(normalizeMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeMobile('098765-43210')).toBe('9876543210');
    expect(normalizeMobile('919876543210')).toBe('9876543210');
    expect(normalizeMobile('9876543210')).toBe('9876543210');
  });

  it('should validate valid Indian mobile numbers starting with 6-9', () => {
    expect(isValidMobile('9876543210')).toBe(true);
    expect(isValidMobile('8888888888')).toBe(true);
    expect(isValidMobile('7000000000')).toBe(true);
    expect(isValidMobile('6123456789')).toBe(true);
    expect(isValidMobile('5123456789')).toBe(false);
    expect(isValidMobile('12345')).toBe(false);
  });
});
