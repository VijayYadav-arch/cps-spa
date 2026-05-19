import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DenialQueuePage } from '@/pages/Billing/DenialQueuePage';
import type {
  DenialQueueItem,
  DenialQueueResponse,
  DenialSummaryResponse,
} from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getDenialQueue: vi.fn(),
  getDenialSummary: vi.fn(),
  getAppealLetterDraft: vi.fn(),
  startDenialAppeal: vi.fn(),
  submitDenialAppeal: vi.fn(),
  resolveDenial: vi.fn(),
}));

import {
  getAppealLetterDraft,
  getDenialQueue,
  getDenialSummary,
  resolveDenial,
  startDenialAppeal,
} from '@/api/billing';

function queueItem(over: Partial<DenialQueueItem> = {}): DenialQueueItem {
  return {
    id: 1,
    claimId: 100,
    claimNumber: 'HSP-1',
    denialCode: 'CO-50',
    denialReason: 'Non-covered service',
    category: 'non-covered',
    status: 'new',
    payerName: 'MEDICARE',
    appealDeadline: null,
    assignedTo: null,
    claimAmount: 720,
    createdAt: '2026-05-16T00:00:00Z',
    daysOutstanding: 3,
    agingBucket: '0-7',
    ...over,
  };
}

function queueResp(items: DenialQueueItem[] = [queueItem()]): DenialQueueResponse {
  return {
    asOfUtc: '2026-05-19T00:00:00Z',
    totalOpen: items.length,
    bucket0To7: items.filter((i) => i.agingBucket === '0-7').length,
    bucket8To30: items.filter((i) => i.agingBucket === '8-30').length,
    bucket31To60: items.filter((i) => i.agingBucket === '31-60').length,
    bucket61Plus: items.filter((i) => i.agingBucket === '61+').length,
    totalAmountAtRisk: items.reduce((s, i) => s + i.claimAmount, 0),
    items,
  };
}

function summary(over: Partial<DenialSummaryResponse> = {}): DenialSummaryResponse {
  return {
    totalOpen: 1,
    new: 1,
    inReview: 0,
    appealing: 0,
    correcting: 0,
    resolved: 0,
    writtenOff: 0,
    overdueAppealDeadline: 0,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DenialQueuePage />
    </MemoryRouter>,
  );
}

describe('DenialQueuePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders metric cards + queue table', async () => {
    vi.mocked(getDenialQueue).mockResolvedValueOnce(queueResp());
    vi.mocked(getDenialSummary).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('HSP-1')).toBeInTheDocument();
    });
    expect(screen.getByText('MEDICARE')).toBeInTheDocument();
    expect(screen.getByText(/Open Total/i)).toBeInTheDocument();
  });

  it('filters by aging bucket', async () => {
    const user = userEvent.setup();
    vi.mocked(getDenialQueue).mockResolvedValueOnce(queueResp([
      queueItem({ id: 1, claimNumber: 'YOUNG', daysOutstanding: 3, agingBucket: '0-7' }),
      queueItem({ id: 2, claimNumber: 'OLD', daysOutstanding: 90, agingBucket: '61+' }),
    ]));
    vi.mocked(getDenialSummary).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('YOUNG')).toBeInTheDocument();
    });
    // Click 61+ bucket
    await user.click(screen.getByRole('button', { name: /^61\+\s/ }));
    expect(screen.queryByText('YOUNG')).not.toBeInTheDocument();
    expect(screen.getByText('OLD')).toBeInTheDocument();
  });

  it('drafts an appeal letter', async () => {
    const user = userEvent.setup();
    vi.mocked(getDenialQueue).mockResolvedValueOnce(queueResp());
    vi.mocked(getDenialSummary).mockResolvedValueOnce(summary());
    vi.mocked(getAppealLetterDraft).mockResolvedValueOnce({
      denialWorkItemId: 1,
      claimNumber: 'HSP-1',
      payerName: 'MEDICARE',
      subjectLine: 'Appeal of Denial — Claim HSP-1 (CO-50)',
      body: 'To Whom It May Concern...',
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Letter' }));

    await waitFor(() => {
      expect(getAppealLetterDraft).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText(/Appeal of Denial/i)).toBeInTheDocument();
    expect(screen.getByText(/To Whom It May Concern/i)).toBeInTheDocument();
  });

  it('starts an appeal with notes prompt', async () => {
    const user = userEvent.setup();
    vi.mocked(getDenialQueue).mockResolvedValue(queueResp());
    vi.mocked(getDenialSummary).mockResolvedValue(summary());
    vi.mocked(startDenialAppeal).mockResolvedValueOnce({ data: {} });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('drafting');
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(startDenialAppeal).toHaveBeenCalledWith(1, 'drafting');
    });
    promptSpy.mockRestore();
  });

  it('resolves a denial with required resolution', async () => {
    const user = userEvent.setup();
    vi.mocked(getDenialQueue).mockResolvedValue(queueResp([
      queueItem({ status: 'appealing' }),
    ]));
    vi.mocked(getDenialSummary).mockResolvedValue(summary({ appealing: 1, new: 0 }));
    vi.mocked(resolveDenial).mockResolvedValueOnce({ data: {} });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('Paid in full');
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Resolve' }));
    await waitFor(() => {
      expect(resolveDenial).toHaveBeenCalledWith(1, 'Paid in full');
    });
    promptSpy.mockRestore();
  });

  it('skips resolve when resolution prompt is empty', async () => {
    const user = userEvent.setup();
    vi.mocked(getDenialQueue).mockResolvedValue(queueResp([queueItem({ status: 'appealing' })]));
    vi.mocked(getDenialSummary).mockResolvedValue(summary({ appealing: 1, new: 0 }));

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce(null);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Resolve' }));
    expect(resolveDenial).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });
});
