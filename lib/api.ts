/**
 * Legacy utility file — use lib/api-client.ts for all API calls.
 *
 * This file previously contained mock data and placeholder API functions.
 * All mock data has been removed. Only utility functions that are still
 * imported by existing pages are kept here.
 */

// Format currency in KES
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format large numbers with abbreviations
export function formatCompactNumber(amount: number): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(0)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}
