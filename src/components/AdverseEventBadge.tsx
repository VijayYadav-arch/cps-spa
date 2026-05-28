import type { HospiceAdverseEventSeverity } from '@/api/qapi';

const LABELS: Record<HospiceAdverseEventSeverity, string> = {
  Minor: 'Minor',
  Moderate: 'Moderate',
  Major: 'Major',
  Critical: 'Critical',
};

const CLASSES: Record<HospiceAdverseEventSeverity, string> = {
  Minor: 'badge badge-neutral',
  Moderate: 'badge badge-info',
  Major: 'badge badge-warning',
  Critical: 'badge badge-danger',
};

export function AdverseEventBadge({ severity }: { severity: HospiceAdverseEventSeverity }) {
  return <span className={CLASSES[severity]}>{LABELS[severity]}</span>;
}
