import type { HospiceLevelOfCare } from '@/api/hospice';

const LOC_META: Record<HospiceLevelOfCare, { label: string; color: string }> = {
  RoutineHomeCare: { label: 'Routine', color: '#15803d' },
  ContinuousHomeCare: { label: 'Continuous', color: '#2563eb' },
  InpatientRespiteCare: { label: 'Respite', color: '#d97706' },
  GeneralInpatient: { label: 'Inpatient', color: '#b91c1c' },
};

export function HospiceLevelOfCareBadge({ loc }: { loc: HospiceLevelOfCare }) {
  const meta = LOC_META[loc];
  return (
    <span
      data-loc={loc}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        background: meta.color,
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {meta.label}
    </span>
  );
}
