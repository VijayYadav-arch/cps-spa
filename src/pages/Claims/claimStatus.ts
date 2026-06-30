// Biller-facing claim lifecycle (mirrors CPS.Application.Claims.ClaimStatusFlow on the backend):
//   draft → submitting → submitted → acknowledged → accepted/rejected → paid/denied
//   appealed / written-off / superseded are side/terminal states.

/** Status options for the claims-list filter dropdown, in lifecycle order. */
export const CLAIM_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitting', label: 'Submitting' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
  { value: 'denied', label: 'Denied' },
  { value: 'appealed', label: 'Appealed' },
];

/** Tailwind badge classes (bg + text) for a claim status. */
export function claimStatusBadgeClass(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'rejected':
    case 'denied':
      return 'bg-red-100 text-red-800';
    case 'submitting':
      return 'bg-amber-100 text-amber-800';
    case 'submitted':
    case 'acknowledged':
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    case 'appealed':
      return 'bg-purple-100 text-purple-800';
    case 'draft':
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/** Hex tone for inline-styled badges (claim lifecycle page). */
export function claimStatusTone(status: string): string {
  switch (status) {
    case 'paid':
      return '#15803d';
    case 'rejected':
    case 'denied':
      return '#b91c1c';
    case 'submitting':
      return '#b45309';
    case 'submitted':
    case 'acknowledged':
    case 'accepted':
      return '#0369a1';
    case 'appealed':
      return '#7e22ce';
    default:
      return '#64748b';
  }
}

/** A claim is actionable for (re)submission only from draft or a rejected transmission. */
export function isClaimSubmittable(status: string): boolean {
  return status === 'draft' || status === 'rejected';
}
