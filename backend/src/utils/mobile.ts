/**
 * Normalizes mobile numbers by stripping spaces, hyphens, parenthesis,
 * leading +91 / 91 / 0 to produce clean standard 10-digit number.
 */
export function normalizeMobile(input: string): string {
  if (!input) return '';
  let cleaned = input.replace(/[\s\-\(\)\.]/g, '');
  
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

export function isValidMobile(input: string): boolean {
  const normalized = normalizeMobile(input);
  return /^[6-9]\d{9}$/.test(normalized);
}
