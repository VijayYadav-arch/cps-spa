import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiPipDetailPage } from '@/pages/Quality/QapiPipDetailPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

function makePip(overrides: Partial<qapiApi.HospiceQapiPip> = {}): qapiApi.HospiceQapiPip {
  return {
    id: 7,
    organizationId: 1,
    title: 'Medication Safety PIP',
    description: 'Reduce medication errors across all patients',
    category: 'PatientSafety',
    status: 'Active',
    baselineMeasurement: 10,
    baselineMeasurementDate: '2026-01-01',
    targetMeasurement: 4,
    targetDate: '2026-07-01',
    currentMeasurement: 7,
    currentMeasurementDate: '2026-03-01',
    interventionPlan: 'Dual-pharmacist review',
    outcomeSummary: null,
    ownerUserId: 3,
    leadingHqrpMetric: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function renderDetail(pipId = '7') {
  return render(
    <MemoryRouter initialEntries={[`/quality/qapi/pips/${pipId}`]}>
      <Routes>
        <Route path="/quality/qapi/pips/:pipId" element={<QapiPipDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QapiPipDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows PipScorecard title for the given pipId', async () => {
    vi.mocked(qapiApi.listPips).mockResolvedValueOnce([makePip()]);

    renderDetail('7');

    await waitFor(() =>
      expect(screen.getByText('Medication Safety PIP')).toBeInTheDocument(),
    );
  });

  it('shows description and status', async () => {
    vi.mocked(qapiApi.listPips).mockResolvedValueOnce([makePip()]);

    renderDetail('7');

    await waitFor(() =>
      expect(screen.getByText(/Reduce medication errors across all patients/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Status: Active/i)).toBeInTheDocument();
  });
});
