import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AiOptInPage } from '@/pages/Admin/AiOptIn/AiOptInPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '@/api/client';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AiOptInPage />
    </MemoryRouter>
  );
}

function org(id: number, name: string) {
  return { id, name };
}

function optIn(orgId: number, enabled: boolean, notes: string | null = null) {
  return {
    id: orgId * 10,
    organizationId: orgId,
    enabled,
    enabledByUserId: 1,
    enabledAtUtc: '2026-06-01T00:00:00Z',
    disabledByUserId: enabled ? null : 2,
    disabledAtUtc: enabled ? null : '2026-06-05T00:00:00Z',
    notes,
  };
}

describe('AiOptInPage', () => {
  it('renders status pills for orgs with row, orgs without row, and revoked orgs', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(1, 'Alpha'), org(2, 'Beta'), org(3, 'Gamma')] } } as never)
      .mockResolvedValueOnce({ data: { data: [optIn(1, true, 'BAA-123'), optIn(2, false)] } } as never);

    renderPage();

    await waitFor(() => expect(screen.getByTestId('opt-in-row-1')).toBeInTheDocument());

    const pills = screen.getAllByTestId('status-pill');
    const byOrg = (id: number) =>
      screen.getByTestId(`opt-in-row-${id}`).querySelector('[data-testid="status-pill"]') as HTMLElement;
    expect(byOrg(1).getAttribute('data-status')).toBe('enabled');
    expect(byOrg(2).getAttribute('data-status')).toBe('disabled');
    expect(byOrg(3).getAttribute('data-status')).toBe('no-row');
    expect(pills.length).toBe(3);
  });

  it('shows enable button for revoked + no-row orgs and disable button for enabled orgs', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(1, 'Alpha'), org(2, 'Beta')] } } as never)
      .mockResolvedValueOnce({ data: { data: [optIn(1, true)] } } as never);

    renderPage();

    await waitFor(() => expect(screen.getByTestId('opt-in-row-1')).toBeInTheDocument());
    expect(screen.getByTestId('disable-1')).toBeInTheDocument();
    expect(screen.queryByTestId('enable-1')).toBeNull();
    expect(screen.getByTestId('enable-2')).toBeInTheDocument();
    expect(screen.queryByTestId('disable-2')).toBeNull();
  });

  it('enable click PUTs to the endpoint with notes and updates the row', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(2, 'Beta')] } } as never)
      .mockResolvedValueOnce({ data: { data: [] } } as never);
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { data: optIn(2, true, 'BAA-2026-06') },
    } as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('enable-2')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('enable-2'));
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('editor-notes'), 'BAA-2026-06');
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() =>
      expect(vi.mocked(apiClient.put)).toHaveBeenCalledWith(
        '/admin/ai/opt-in/2',
        { notes: 'BAA-2026-06' },
      ),
    );
    await waitFor(() => expect(screen.queryByTestId('editor-modal')).toBeNull());
    // Row now shows the enabled pill.
    expect(
      screen.getByTestId('opt-in-row-2').querySelector('[data-testid="status-pill"]')!.getAttribute('data-status'),
    ).toBe('enabled');
  });

  it('disable click DELETEs with body and updates the row', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(1, 'Alpha')] } } as never)
      .mockResolvedValueOnce({ data: { data: [optIn(1, true)] } } as never);
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: { data: optIn(1, false, 'compliance-cleanup') },
    } as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('disable-1')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('disable-1'));
    await userEvent.type(screen.getByTestId('editor-notes'), 'compliance-cleanup');
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() =>
      expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith(
        '/admin/ai/opt-in/1',
        { data: { notes: 'compliance-cleanup' } },
      ),
    );
    expect(
      screen.getByTestId('opt-in-row-1').querySelector('[data-testid="status-pill"]')!.getAttribute('data-status'),
    ).toBe('disabled');
  });

  it('omits notes from the body when the textarea is empty/whitespace', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(7, 'Seven')] } } as never)
      .mockResolvedValueOnce({ data: { data: [] } } as never);
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { data: optIn(7, true) },
    } as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('enable-7')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('enable-7'));
    // No notes typed.
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() => expect(vi.mocked(apiClient.put)).toHaveBeenCalled());
    expect(vi.mocked(apiClient.put).mock.calls[0][1]).toEqual({ notes: null });
  });

  it('shows the editor error when the request fails and keeps the modal open', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(3, 'Gamma')] } } as never)
      .mockResolvedValueOnce({ data: { data: [] } } as never);
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { status: 500 } });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('enable-3')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('enable-3'));
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() => expect(screen.getByTestId('editor-error')).toBeInTheDocument());
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument();
  });

  it('cancel closes the modal without an API call', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [org(1, 'Alpha')] } } as never)
      .mockResolvedValueOnce({ data: { data: [] } } as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('enable-1')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('enable-1'));
    await userEvent.click(screen.getByTestId('editor-cancel'));

    expect(screen.queryByTestId('editor-modal')).toBeNull();
    expect(vi.mocked(apiClient.put)).not.toHaveBeenCalled();
  });

  it('renders an alert when the initial fetch fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('boom'));

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/Failed to load/i),
    );
  });

  it('renders empty state when there are no organizations', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [] } } as never)
      .mockResolvedValueOnce({ data: { data: [] } } as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
  });
});
