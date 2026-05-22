import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SessionsPage } from '@/pages/Me/SessionsPage';
import type { SessionRow } from '@/api/me';

vi.mock('@/api/me', () => ({
  getMySessions: vi.fn(),
  revokeMySession: vi.fn(),
  revokeAllOtherSessions: vi.fn(),
}));

import {
  getMySessions,
  revokeMySession,
  revokeAllOtherSessions,
} from '@/api/me';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

function row(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 1,
    createdAt: '2026-05-20T10:00:00Z',
    expiresAt: '2026-06-20T10:00:00Z',
    revokedAt: null,
    isActive: true,
    ...over,
  };
}

function renderPage() {
  return render(<MemoryRouter><SessionsPage /></MemoryRouter>);
}

describe('SessionsPage', () => {
  it('lists active and revoked sessions in separate sections', async () => {
    vi.mocked(getMySessions).mockResolvedValueOnce({
      data: [
        row({ id: 1, isActive: true }),
        row({ id: 2, isActive: false, revokedAt: '2026-05-21T10:00:00Z' }),
      ],
    });
    renderPage();
    expect(await screen.findByText(/Active \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Revoked \/ expired \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Revoked.*5\/2[01]/)).toBeInTheDocument();
  });

  it('renders empty state when no sessions exist', async () => {
    vi.mocked(getMySessions).mockResolvedValueOnce({ data: [] });
    renderPage();
    expect(await screen.findByText(/No sessions on record/i)).toBeInTheDocument();
  });

  it('revokes a session with confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(getMySessions).mockResolvedValue({ data: [row()] });
    vi.mocked(revokeMySession).mockResolvedValueOnce(undefined);

    renderPage();
    await screen.findByText(/Active \(1\)/);
    await user.click(screen.getByRole('button', { name: /^Revoke$/ }));

    await waitFor(() => expect(revokeMySession).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/Session #1 revoked/i)).toBeInTheDocument();
  });

  it('does not call revoke when the confirm prompt is cancelled', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('confirm', vi.fn(() => false));
    vi.mocked(getMySessions).mockResolvedValue({ data: [row()] });

    renderPage();
    await screen.findByText(/Active \(1\)/);
    await user.click(screen.getByRole('button', { name: /^Revoke$/ }));

    expect(revokeMySession).not.toHaveBeenCalled();
  });

  it('signs out everywhere via the modal', async () => {
    const user = userEvent.setup();
    vi.mocked(getMySessions).mockResolvedValue({ data: [row(), row({ id: 2 })] });
    vi.mocked(revokeAllOtherSessions).mockResolvedValueOnce({ data: { revoked: 2 } });

    renderPage();
    await screen.findByText(/Active \(2\)/);
    await user.click(screen.getByRole('button', { name: /Sign out everywhere/i }));
    // Modal opens
    expect(await screen.findByRole('dialog', { name: /Sign out everywhere/i }))
      .toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^Sign out everywhere$/ })[1]);

    await waitFor(() => expect(revokeAllOtherSessions).toHaveBeenCalled());
    expect(await screen.findByText(/2 session\(s\) revoked/)).toBeInTheDocument();
  });

  it('error banner when the list fails', async () => {
    vi.mocked(getMySessions).mockRejectedValueOnce({
      response: { data: { error: 'unauthenticated' } },
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('unauthenticated');
  });
});
