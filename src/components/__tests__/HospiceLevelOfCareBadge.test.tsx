import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HospiceLevelOfCareBadge } from '@/components/HospiceLevelOfCareBadge';
import type { HospiceLevelOfCare } from '@/api/hospice';

describe('HospiceLevelOfCareBadge', () => {
  const cases: Array<[HospiceLevelOfCare, string]> = [
    ['RoutineHomeCare', 'Routine'],
    ['ContinuousHomeCare', 'Continuous'],
    ['InpatientRespiteCare', 'Respite'],
    ['GeneralInpatient', 'Inpatient'],
  ];

  it.each(cases)('renders %s as label "%s"', (loc, label) => {
    render(<HospiceLevelOfCareBadge loc={loc} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('exposes the LOC via data-loc attribute for downstream selectors', () => {
    render(<HospiceLevelOfCareBadge loc="GeneralInpatient" />);
    expect(screen.getByText('Inpatient')).toHaveAttribute('data-loc', 'GeneralInpatient');
  });
});
