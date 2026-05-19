import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PhiAccessReviewDashboard } from '@/pages/Compliance/PhiAccessReviewDashboard';
import type {
  AnomalyReport,
  PatientAccessReport,
  RetentionStatus,
  UserAccessReport,
} from '@/api/compliance';

vi.mock('@/api/compliance', () => ({
  getPhiAnomalies: vi.fn(),
  getPhiPatientAccess: vi.fn(),
  getPhiUserAccess: vi.fn(),
  getPhiRetentionStatus: vi.fn(),
  recordPhiReview: vi.fn(),
}));

import {
  getPhiAnomalies,
  getPhiPatientAccess,
  getPhiRetentionStatus,
  getPhiUserAccess,
  recordPhiReview,
} from '@/api/compliance';

function renderPage() {
  return render(
    <MemoryRouter>
      <PhiAccessReviewDashboard />
    </MemoryRouter>,
  );
}

function emptyAnomalies(over: Partial<AnomalyReport> = {}): AnomalyReport {
  return {
    fromUtc: '2026-05-01T00:00:00Z',
    toUtc: '2026-05-31T00:00:00Z',
    totalAnomalies: 0,
    bulkReadCount: 0,
    offHoursCount: 0,
    crossOrgCount: 0,
    events: [],
    ...over,
  };
}

function emptyPatient(): PatientAccessReport {
  return {
    patientId: 100,
    fromUtc: '2026-05-01T00:00:00Z',
    toUtc: '2026-05-31T00:00:00Z',
    totalEvents: 3,
    distinctUserCount: 2,
    modificationCount: 1,
    anomalyCount: 0,
    lastReviewedAtUtc: null,
    lastReviewResult: null,
    events: [
      {
        id: 1,
        createdAt: '2026-05-10T14:00:00Z',
        eventType: 'phi-access',
        result: 'success',
        userId: 1,
        userEmail: 'nurse@x',
        resourceType: 'Patient',
        resourceId: 100,
        patientId: 100,
        ipAddress: '10.0.0.1',
        description: 'view',
        anomalyFlags: [],
      },
    ],
  };
}

function emptyUser(): UserAccessReport {
  return {
    userId: 7,
    userEmail: 'nurse@x',
    fromUtc: '2026-05-01T00:00:00Z',
    toUtc: '2026-05-31T00:00:00Z',
    totalEvents: 5,
    distinctPatientCount: 4,
    offHoursCount: 1,
    anomalyCount: 1,
    lastReviewedAtUtc: '2026-04-30T10:00:00Z',
    lastReviewResult: 'ok',
    events: [],
  };
}

function emptyRetention(): RetentionStatus {
  return {
    totalEvents: 100,
    under1YearCount: 60,
    between1And3YearsCount: 30,
    between3And6YearsCount: 8,
    over6YearsCount: 2,
    oldestEventAtUtc: '2019-01-01T00:00:00Z',
    minimumRequiredYears: 6,
  };
}

describe('PhiAccessReviewDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads anomalies tab by default', async () => {
    vi.mocked(getPhiAnomalies).mockResolvedValueOnce(emptyAnomalies());
    renderPage();
    await waitFor(() => {
      expect(getPhiAnomalies).toHaveBeenCalled();
    });
    expect(screen.getByText(/Total Anomalies/i)).toBeInTheDocument();
  });

  it('shows anomaly counts and event flags', async () => {
    vi.mocked(getPhiAnomalies).mockResolvedValueOnce(
      emptyAnomalies({
        totalAnomalies: 51,
        bulkReadCount: 50,
        offHoursCount: 1,
        events: [
          {
            id: 1,
            createdAt: '2026-05-10T02:30:00Z',
            eventType: 'phi-access',
            result: 'success',
            userId: 1,
            userEmail: 'evil@x',
            resourceType: 'Patient',
            resourceId: 99,
            patientId: 99,
            ipAddress: '10.0.0.1',
            description: '',
            anomalyFlags: ['OffHours', 'BulkRead'],
          },
        ],
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('51')).toBeInTheDocument();
    });
    expect(screen.getByText('OffHours')).toBeInTheDocument();
    expect(screen.getByText('BulkRead')).toBeInTheDocument();
  });

  it('loads patient report on Apply', async () => {
    const user = userEvent.setup();
    vi.mocked(getPhiAnomalies).mockResolvedValueOnce(emptyAnomalies());
    vi.mocked(getPhiPatientAccess).mockResolvedValueOnce(emptyPatient());
    renderPage();
    await user.click(await screen.findByRole('tab', { name: /By Patient/i }));
    await user.type(screen.getByLabelText('Patient ID'), '100');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => {
      expect(getPhiPatientAccess).toHaveBeenCalledWith(
        100,
        expect.any(String),
        expect.any(String),
      );
    });
    expect(screen.getByText(/Distinct Users/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Never reviewed/i),
    ).toBeInTheDocument();
  });

  it('shows last-review banner when user report has prior review', async () => {
    const user = userEvent.setup();
    vi.mocked(getPhiAnomalies).mockResolvedValueOnce(emptyAnomalies());
    vi.mocked(getPhiUserAccess).mockResolvedValueOnce(emptyUser());
    renderPage();
    await user.click(await screen.findByRole('tab', { name: /By User/i }));
    await user.type(screen.getByLabelText('User ID'), '7');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => {
      expect(getPhiUserAccess).toHaveBeenCalled();
    });
    expect(screen.getByText(/Last reviewed/i)).toBeInTheDocument();
  });

  it('attests a patient review', async () => {
    const user = userEvent.setup();
    vi.mocked(getPhiAnomalies).mockResolvedValueOnce(emptyAnomalies());
    vi.mocked(getPhiPatientAccess).mockResolvedValue(emptyPatient());
    vi.mocked(recordPhiReview).mockResolvedValueOnce({} as never);

    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('ok')          // result
      .mockReturnValueOnce('all clean');   // notes

    renderPage();
    await user.click(await screen.findByRole('tab', { name: /By Patient/i }));
    await user.type(screen.getByLabelText('Patient ID'), '100');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByRole('button', { name: /Attest Review/i });
    await user.click(screen.getByRole('button', { name: /Attest Review/i }));

    await waitFor(() => {
      expect(recordPhiReview).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectType: 'patient',
          subjectId: 100,
          result: 'ok',
          notes: 'all clean',
        }),
      );
    });
    promptSpy.mockRestore();
  });

  it('renders retention buckets', async () => {
    const user = userEvent.setup();
    vi.mocked(getPhiAnomalies).mockResolvedValueOnce(emptyAnomalies());
    vi.mocked(getPhiRetentionStatus).mockResolvedValueOnce(emptyRetention());
    renderPage();
    await user.click(await screen.findByRole('tab', { name: /Retention/i }));
    await waitFor(() => {
      expect(getPhiRetentionStatus).toHaveBeenCalled();
    });
    expect(screen.getByText(/§164\.530\(j\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Oldest event/i)).toBeInTheDocument();
  });
});
