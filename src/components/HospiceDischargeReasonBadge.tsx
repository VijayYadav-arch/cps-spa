import type { HospiceDischargeReason } from '@/api/hospice';

const LABELS: Record<HospiceDischargeReason, string> = {
  Transfer: 'Transfer',
  OutOfServiceArea: 'Out of Area',
  NoLongerTerminal: 'No Longer Terminal',
  ForCause: 'For Cause',
  AgencyClosure: 'Agency Closure',
};

const CLASSNAMES: Record<HospiceDischargeReason, string> = {
  Transfer: 'badge badge-info',
  OutOfServiceArea: 'badge badge-info',
  NoLongerTerminal: 'badge badge-neutral',
  ForCause: 'badge badge-warning',
  AgencyClosure: 'badge badge-neutral',
};

export function HospiceDischargeReasonBadge({ reason }: { reason: HospiceDischargeReason }) {
  return <span className={CLASSNAMES[reason]}>{LABELS[reason]}</span>;
}
