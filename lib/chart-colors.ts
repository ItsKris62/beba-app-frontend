import type { ChartConfig } from '@/components/ui/chart';

// Colors validated for CVD-safe adjacent separation and surface contrast via
// the data-viz palette validator, run against this app's actual chart
// surfaces (light #f6f9fb, dark #050c13). Keys are fixed to loan status
// values and must stay in this order if extended — the order is the CVD
// mechanism (see dataviz skill's color-formula.md), not a display preference.
export const LOAN_STATUS_CHART_CONFIG: ChartConfig = {
  PENDING: { label: 'Pending', theme: { light: '#eda100', dark: '#c98500' } },
  DISBURSED: { label: 'Disbursed', theme: { light: '#2a78d6', dark: '#3987e5' } },
  ACTIVE: { label: 'Active', theme: { light: '#008300', dark: '#008300' } },
  PAID_OFF: { label: 'Paid Off', theme: { light: '#4a3aa7', dark: '#9085e9' } },
  DEFAULTED: { label: 'Defaulted', theme: { light: '#e34948', dark: '#e66767' } },
  WRITTEN_OFF: { label: 'Written Off', theme: { light: '#eb6834', dark: '#d95926' } },
};

// Fallback for any status the backend adds later without a color assigned above.
export const UNKNOWN_STATUS_COLOR = { light: '#898781', dark: '#898781' };

export const MEMBERSHIP_CHART_CONFIG: ChartConfig = {
  active: { label: 'Active Accounts', theme: { light: '#008300', dark: '#008300' } },
  pending: { label: 'Pending KYC', theme: { light: '#eda100', dark: '#c98500' } },
  other: { label: 'Other', theme: { light: '#898781', dark: '#898781' } },
};

export const SAVINGS_CHART_CONFIG: ChartConfig = {
  amount: { label: 'Savings', theme: { light: '#2a78d6', dark: '#3987e5' } },
};

export const FOSA_BOSA_CHART_CONFIG: ChartConfig = {
  fosa: { label: 'FOSA', theme: { light: '#2a78d6', dark: '#3987e5' } },
  bosa: { label: 'BOSA', theme: { light: '#008300', dark: '#008300' } },
};

// 8-hue categorical set (fixed order — see LOAN_STATUS_CHART_CONFIG note above)
// for the dynamic, per-tenant loan product list. Products are assigned a color
// by their position in a stable (name-sorted) order, not by rank/value, so a
// product never changes color when another product's total changes.
export const PRODUCT_MIX_PALETTE: Array<{ light: string; dark: string }> = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#008300', dark: '#008300' }, // green
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#eb6834', dark: '#d95926' }, // orange
];

// Severity-ordered (not identity-categorical) — current/1-30/31-60/61-90/90+
// read as escalating risk, matching the green→red convention already used by
// the PAR30 gauge (riskColor below). Validated for CVD separation + contrast
// as a 5-slot categorical set; the two sub-3:1 contrast slots (1-30, and the
// borderline red/orange adjacency) rely on the direct % labels this chart
// always renders, same relief pattern as LOAN_STATUS_CHART_CONFIG.
export const AGING_BUCKET_CHART_CONFIG: ChartConfig = {
  current: { label: 'Current', theme: { light: '#16a34a', dark: '#22a35e' } },
  days1to30: { label: '1-30 days', theme: { light: '#eda100', dark: '#c98500' } },
  days31to60: { label: '31-60 days', theme: { light: '#eb6834', dark: '#d95926' } },
  days61to90: { label: '61-90 days', theme: { light: '#dc2626', dark: '#ef4444' } },
  days90Plus: { label: '90+ days', theme: { light: '#991b1b', dark: '#c23a3a' } },
};

// Matches the existing red-600/amber-600/green-600 risk-color convention
// already used by the KpiCard tiles on the admin dashboard.
export function riskColor(percent: number): string {
  if (percent > 20) return '#dc2626';
  if (percent > 10) return '#d97706';
  return '#16a34a';
}

export function riskLabel(percent: number): string {
  if (percent > 20) return 'High risk';
  if (percent > 10) return 'Elevated';
  return 'Healthy';
}

// Inverse of riskColor — for metrics where LOW is bad and HIGH is good
// (e.g. guarantor coverage %), not the other way round.
export function coverageColor(percent: number): string {
  if (percent < 50) return '#dc2626';
  if (percent < 80) return '#d97706';
  return '#16a34a';
}

// Revenue/disbursements share a KES-amount axis (blue/green, reused from
// FOSA_BOSA_CHART_CONFIG — same hues, different chart context). New members
// is a count on its own axis/chart — never combined with the KES lines on
// one axis (mixing amount + count on one scale flattens one of them).
export const EXECUTIVE_OVERVIEW_CHART_CONFIG: ChartConfig = {
  revenue: { label: 'Revenue', theme: { light: '#2a78d6', dark: '#3987e5' } },
  disbursements: { label: 'Disbursements', theme: { light: '#008300', dark: '#008300' } },
};
export const NEW_MEMBERS_CHART_CONFIG: ChartConfig = {
  newMembers: { label: 'New Members', theme: { light: '#4a3aa7', dark: '#9085e9' } },
};

export const DELINQUENCY_TRENDS_CHART_CONFIG: ChartConfig = {
  delinquentLoans: { label: 'In Arrears', theme: { light: '#d97706', dark: '#f59e0b' } },
  watchlistLoans: { label: 'Watchlist', theme: { light: '#eb6834', dark: '#d95926' } },
  nplLoans: { label: 'NPL', theme: { light: '#dc2626', dark: '#ef4444' } },
};

export const GUARANTOR_HEALTH_CHART_CONFIG: ChartConfig = {
  full: { label: 'Full Coverage', theme: { light: '#16a34a', dark: '#22a35e' } },
  partial: { label: 'Partial Coverage', theme: { light: '#eda100', dark: '#c98500' } },
  none: { label: 'No Guarantors', theme: { light: '#dc2626', dark: '#ef4444' } },
};

// Sequential "heat" ramp (pale yellow -> dark red) for the M-Pesa hourly
// deposit heatmap — the conventional idiom for a heatmap specifically, not
// the app's default single-hue sequential blue (this is magnitude encoding,
// same job, different accepted convention for this exact chart type).
// Steps are monotonically darker/more saturated so intensity still reads
// correctly without color (paired with numeric values in every cell).
const HEATMAP_STEPS_LIGHT = ['#fef9e7', '#fde68a', '#fbbf24', '#f97316', '#dc2626', '#7f1d1d'];
const HEATMAP_STEPS_DARK = ['#3a3220', '#78350f', '#b45309', '#c2410c', '#dc2626', '#f87171'];

export function heatmapColor(value: number, max: number, isDark: boolean): string {
  const steps = isDark ? HEATMAP_STEPS_DARK : HEATMAP_STEPS_LIGHT;
  if (max <= 0 || value <= 0) return isDark ? 'transparent' : steps[0];
  const idx = Math.min(steps.length - 1, Math.floor((value / max) * (steps.length - 1)));
  return steps[idx];
}
