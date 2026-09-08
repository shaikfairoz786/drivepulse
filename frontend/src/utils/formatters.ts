/**
 * Smartly parses user input whether entered in Lakhs (e.g. 14, 14.5) or full Rupees (e.g. 1400000, 14,00,000).
 * Returns the amount in full Rupees (number) or null if invalid.
 */
export function parseRupeesOrLakhs(val?: string | number | null): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).replace(/[₹,\s]/g, '').trim();
  if (!str) return null;
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return null;

  // If user entered 1000 or greater, they entered full rupees (e.g. 1400000, 550000)
  if (num >= 1000) {
    return Math.round(num);
  }
  // Otherwise, user entered in Lakhs (e.g. 14, 14.5, 5.5) -> convert to full rupees
  return Math.round(num * 100000);
}

/**
 * Generates an instant, clear live Indian currency preview for form inputs.
 * e.g. input "14" or "1400000" -> "₹14,00,000 (₹14 Lakh)"
 */
export function formatCurrencyPreview(val?: string | number | null): string | null {
  const rupees = parseRupeesOrLakhs(val);
  if (rupees === null) return null;

  const formattedRupees = `₹${rupees.toLocaleString('en-IN')}`;
  const formattedLakhsStr = formatLakhs(rupees);
  return `${formattedRupees} · ${formattedLakhsStr}`;
}

/**
 * Formats a number into Indian Rupee Lakhs (e.g. ₹14 Lakh, ₹14.5 Lakh) or Crores (e.g. ₹1.5 Cr) cleanly without trailing zeroes.
 */
export function formatLakhs(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
  if (amount === 0) return '₹0';

  if (amount >= 10000000) {
    const cr = amount / 10000000;
    const formatted = cr % 1 === 0 ? cr.toFixed(0) : parseFloat(cr.toFixed(2)).toString();
    return `₹${formatted} Cr`;
  }

  if (amount >= 100000) {
    const lakh = amount / 100000;
    const formatted = lakh % 1 === 0 ? lakh.toFixed(0) : parseFloat(lakh.toFixed(2)).toString();
    return `₹${formatted} Lakh`;
  }

  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatBudgetRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return 'Budget Flexible';
  if (min && !max) return `From ${formatLakhs(min)}`;
  if (!min && max) return `Up to ${formatLakhs(max)}`;
  return `${formatLakhs(min)} - ${formatLakhs(max)}`;
}

export function formatNumber(val?: number | null): string {
  if (val === undefined || val === null) return '0';
  return val.toLocaleString('en-IN');
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`;
  }
  return 'Just now';
}
