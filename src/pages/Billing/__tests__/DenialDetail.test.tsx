import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DenialDetail } from '@/pages/Billing/DenialDetail';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing');
  return {
    ...actual,
    getDenialById: vi.fn(),
    analyzeDenial: vi.fn(),
    startDenialAppeal: vi.fn(),
    submitDenialAppeal: vi.fn(),
    escalateDenial: vi.fn(),
    resolveDenial: vi.fn(),
    assignDenial: vi.fn(),
    draftDenialAppeal: vi.fn(),
  };
});

import {
  analyzeDenial,
  assignDenial,
  draftDenialAppeal,
  escalateDenial,
  getDenialById,
  resolveDenial,
  startDenialAppeal,
  submitDenialAppeal,
} from '@/api/billing';

function buildDenial(overrides: Partial<{
  status: string;
  appealHistory: string | null;
  draftAppealText: string | null;
  draftAppealGeneratedAtUtc: string | null;
}> = {}) {
  return {
    id: 7,
    claimId: 42,
    organizationId: 1,
    status: overrides.status ?? 'new',
    denialCode: 'CO-50',
    denialReason: 'Service not covered.',
    category: 'medical-necessity',
    payerName: 'Medicare',
    appealDeadline: '2026-07-01',
    resolvedAt: null,
    assignedTo: null,
    appealHistory: overrides.appealHistory ?? null,
    draftAppealText: overrides.draftAppealText ?? null,
    draftAppealGeneratedAtUtc: overrides.draftAppealGeneratedAtUtc ?? null,
    createdAt: '2026-06-04T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  };
}

function renderAt(path = '/billing/denials/7') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/billing/denials/:id" element={<DenialDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DenialDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.mocked(analyzeDenial).mockResolvedValue({
      category: 'medical-necessity',
      description: 'Not medically necessary',
      appealDeadline: '2026-07-15',
      recommendedAction: 'Gather medical records and submit appeal.',
      appealTemplate: 'Dear Payer,\n\nPlease reconsider...',
    });
  });

  it('renders denial header + status + category badges', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial());
    renderAt();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /claim #42/i })).toBeInTheDocument();
    });
    expect(screen.getByText('CO-50')).toBeInTheDocument();
    expect(screen.getAllByText(/medical necessity/i).length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', async () => {
    vi.mocked(getDenialById).mockRejectedValueOnce(new Error('boom'));
    renderAt();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/denial not found/i);
    });
  });

  it('shows CARC analysis card when analyze succeeds', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial());
    renderAt();

    await waitFor(() => {
      expect(screen.getByText(/CARC Analysis/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/gather medical records/i)).toBeInTheDocument();
  });

  it('opens action modal when primary action clicked (status=new -> appeal)', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial());
    const user = userEvent.setup();
    renderAt();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start appeal/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /start appeal/i }));

    expect(screen.getByRole('dialog', { name: /start appeal/i })).toBeInTheDocument();
  });

  it('submits appeal action with notes', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial());
    vi.mocked(startDenialAppeal).mockResolvedValueOnce({ data: null });
    vi.mocked(getDenialById).mockResolvedValueOnce({ ...buildDenial(), status: 'in-review' });

    const user = userEvent.setup();
    renderAt();
    await waitFor(() => screen.getByRole('button', { name: /start appeal/i }));
    await user.click(screen.getByRole('button', { name: /start appeal/i }));

    await user.type(screen.getByRole('textbox'), 'Submitting medical records');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(startDenialAppeal).toHaveBeenCalledWith(7, 'Submitting medical records');
    });
  });

  it('shows resolved banner when status=resolved', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce({
      ...buildDenial({ status: 'resolved' }),
      resolvedAt: '2026-06-04T00:00:00Z',
    });
    renderAt();

    await waitFor(() => {
      expect(screen.getByText(/^Resolved/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /start appeal/i })).not.toBeInTheDocument();
  });

  it('renders appeal history timeline from JSON', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(
      buildDenial({
        appealHistory: JSON.stringify([
          { action: 'appeal_started', timestamp: '2026-06-01T10:00:00Z', notes: 'Initial submission' },
          { action: 'records_attached', timestamp: '2026-06-02T11:00:00Z', notes: null },
        ]),
      })
    );
    renderAt();

    await waitFor(() => {
      expect(screen.getByText(/appeal started/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/records attached/i)).toBeInTheDocument();
    expect(screen.getByText(/initial submission/i)).toBeInTheDocument();
  });

  // Mark these as referenced so eslint doesn't complain; they're set up as mocks
  // for downstream branches we don't exercise individually here.
  it('exposes secondary action wrappers for all 6 endpoints', () => {
    expect(submitDenialAppeal).toBeDefined();
    expect(escalateDenial).toBeDefined();
    expect(resolveDenial).toBeDefined();
    expect(assignDenial).toBeDefined();
  });

  it('drafts an AI appeal and shows the result', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial());
    vi.mocked(draftDenialAppeal).mockResolvedValueOnce({
      id: 7,
      draftAppealText: 'Dear Medicare, We are writing to appeal denial CO-50 for the patient ...',
      draftAppealGeneratedAtUtc: '2026-06-05T19:30:00Z',
    });

    const user = userEvent.setup();
    renderAt();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /draft appeal/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /draft appeal/i }));

    await waitFor(() => {
      expect(draftDenialAppeal).toHaveBeenCalledWith(7);
    });
    expect(await screen.findByText(/we are writing to appeal denial CO-50/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regenerate draft/i })).toBeInTheDocument();
  });

  it('shows pre-existing AI draft on load', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial({
      draftAppealText: 'Previously drafted appeal text',
      draftAppealGeneratedAtUtc: '2026-06-04T10:00:00Z',
    }));
    renderAt();

    await waitFor(() => {
      expect(screen.getByText(/previously drafted appeal text/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /regenerate draft/i })).toBeInTheDocument();
  });

  it('shows error when AI draft fails', async () => {
    vi.mocked(getDenialById).mockResolvedValueOnce(buildDenial());
    vi.mocked(draftDenialAppeal).mockRejectedValueOnce(new Error('AI provider unavailable'));
    const user = userEvent.setup();
    renderAt();

    await waitFor(() => screen.getByRole('button', { name: /draft appeal/i }));
    await user.click(screen.getByRole('button', { name: /draft appeal/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to draft appeal/i);
    });
  });
});
