import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiReviewLogPage } from '@/pages/Quality/QapiReviewLogPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

function makeReview(overrides: Partial<qapiApi.HospiceQapiReview> = {}): qapiApi.HospiceQapiReview {
  return {
    id: 1,
    organizationId: 1,
    reviewDate: '2026-03-01',
    attendeeNames: 'Dr. Smith, Nurse Jones',
    topicsReviewed: 'Fall prevention, medication safety',
    decisionsMade: 'Implement new fall protocol',
    nextReviewTargetDate: '2026-06-01',
    recordedByUserId: 4,
    createdAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('QapiReviewLogPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders review rows from listReviews mock', async () => {
    vi.mocked(qapiApi.listReviews).mockResolvedValueOnce([
      makeReview({ id: 1, reviewDate: '2026-03-01', attendeeNames: 'Dr. Smith, Nurse Jones' }),
      makeReview({ id: 2, reviewDate: '2026-01-15', attendeeNames: 'Dr. Lee, Admin Brown', decisionsMade: 'Approve new PIP', nextReviewTargetDate: '2026-04-15' }),
    ]);

    render(<MemoryRouter><QapiReviewLogPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('2026-03-01')).toBeInTheDocument());
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith, Nurse Jones')).toBeInTheDocument();
    expect(screen.getByText('Dr. Lee, Admin Brown')).toBeInTheDocument();
    expect(screen.getByText('Approve new PIP')).toBeInTheDocument();
  });
});
