import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PipScorecard } from '@/components/PipScorecard';
import type { HospiceQapiPip } from '@/api/qapi';

function makePip(overrides: Partial<HospiceQapiPip> = {}): HospiceQapiPip {
  return {
    id: 1,
    organizationId: 1,
    title: 'Test PIP',
    description: 'A test PIP',
    category: 'PatientSafety',
    status: 'Active',
    baselineMeasurement: null,
    baselineMeasurementDate: null,
    targetMeasurement: null,
    targetDate: null,
    currentMeasurement: null,
    currentMeasurementDate: null,
    interventionPlan: '',
    outcomeSummary: null,
    ownerUserId: 1,
    leadingHqrpMetric: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderPip(pip: HospiceQapiPip) {
  return render(
    <MemoryRouter>
      <PipScorecard pip={pip} />
    </MemoryRouter>,
  );
}

describe('PipScorecard', () => {
  it('renders title, category, and measurements', () => {
    const pip = makePip({
      title: 'Reduce Falls',
      category: 'PatientSafety',
      baselineMeasurement: 10,
      currentMeasurement: 8,
      targetMeasurement: 5,
    });
    renderPip(pip);
    expect(screen.getByText('Reduce Falls')).toBeInTheDocument();
    expect(screen.getByText('PatientSafety')).toBeInTheDocument();
    expect(screen.getByText(/Baseline: 10/)).toBeInTheDocument();
    expect(screen.getByText(/Current: 8/)).toBeInTheDocument();
    expect(screen.getByText(/Target: 5/)).toBeInTheDocument();
  });

  it('shows downward arrow with pip-delta--good when target < baseline and current moves down', () => {
    // baseline=0.5, current=0.3, target=0.1 — direction is down, same as target
    const pip = makePip({
      baselineMeasurement: 0.5,
      currentMeasurement: 0.3,
      targetMeasurement: 0.1,
    });
    renderPip(pip);
    const delta = screen.getByText(/↓/).closest('div');
    expect(delta).toHaveClass('pip-delta--good');
  });

  it('shows arrow with pip-delta--bad when moving the wrong way', () => {
    // baseline=0.5, target=0.1 (want lower), but current=0.7 (went up — bad)
    const pip = makePip({
      baselineMeasurement: 0.5,
      currentMeasurement: 0.7,
      targetMeasurement: 0.1,
    });
    renderPip(pip);
    const delta = screen.getByText(/↑/).closest('div');
    expect(delta).toHaveClass('pip-delta--bad');
  });
});
