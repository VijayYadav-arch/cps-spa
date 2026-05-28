import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiPipListPage } from '@/pages/Quality/QapiPipListPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

function makePip(overrides: Partial<qapiApi.HospiceQapiPip> = {}): qapiApi.HospiceQapiPip {
  return {
    id: 1,
    organizationId: 1,
    title: 'Reduce Fall Rate',
    description: 'Improve fall prevention protocols',
    category: 'PatientSafety',
    status: 'Active',
    baselineMeasurement: 5.2,
    baselineMeasurementDate: '2026-01-01',
    targetMeasurement: 2.0,
    targetDate: '2026-06-30',
    currentMeasurement: 3.8,
    currentMeasurementDate: '2026-03-01',
    interventionPlan: 'Weekly rounds',
    outcomeSummary: null,
    ownerUserId: 5,
    leadingHqrpMetric: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('QapiPipListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders pip rows from listPips mock', async () => {
    vi.mocked(qapiApi.listPips).mockResolvedValueOnce([
      makePip({ id: 1, title: 'Reduce Fall Rate', category: 'PatientSafety', status: 'Active', updatedAt: '2026-03-01T00:00:00Z' }),
      makePip({ id: 2, title: 'Improve Pain Scores', category: 'ClinicalOutcome', status: 'Planning', updatedAt: '2026-02-15T00:00:00Z' }),
    ]);

    render(<MemoryRouter><QapiPipListPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Reduce Fall Rate')).toBeInTheDocument());
    expect(screen.getByText('Improve Pain Scores')).toBeInTheDocument();
    // category values also appear in the filter <select> options, so use getAllByText
    expect(screen.getAllByText('PatientSafety').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ClinicalOutcome').length).toBeGreaterThan(0);
  });
});
