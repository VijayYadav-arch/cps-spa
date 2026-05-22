import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiKeysPage } from '@/pages/Platform/ApiKeysPage';
import type { ApiKey } from '@/api/platform';

vi.mock('@/api/platform', () => ({
  getApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

import { getApiKeys, createApiKey, revokeApiKey } from '@/api/platform';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  // navigator.clipboard is a getter-only property in jsdom; use defineProperty
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(() => Promise.resolve()) },
  });
});

function key(over: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 1,
    prefix: 'cps_abc',
    name: 'Partner X',
    scope: 'read',
    isActive: true,
    lastUsedAt: '2026-05-20T10:00:00Z',
    expiresAt: null,
    createdAt: '2026-05-01T10:00:00Z',
    ...over,
  };
}

function renderPage() {
  return render(<MemoryRouter><ApiKeysPage /></MemoryRouter>);
}

describe('ApiKeysPage', () => {
  it('renders the list', async () => {
    vi.mocked(getApiKeys).mockResolvedValue({
      data: [key(), key({ id: 2, name: 'Partner Y', isActive: false })],
      pagination: { total: 2, page: 1, pageSize: 25, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText('Partner X')).toBeInTheDocument();
    expect(screen.getByText('Partner Y')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('revoked')).toBeInTheDocument();
  });

  it('creates a key and surfaces the one-time secret', async () => {
    const user = userEvent.setup();
    vi.mocked(getApiKeys).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(createApiKey).mockResolvedValue({
      ...key(), id: 42, name: 'New Partner',
      fullKey: 'cps_abc.full-secret-here',
    });

    renderPage();
    await waitFor(() => expect(getApiKeys).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /New API key/i }));
    await user.type(screen.getByLabelText(/^Name$/i), 'New Partner');
    await user.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() => {
      expect(createApiKey).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Partner', scope: 'read',
      }));
    });
    expect(await screen.findByText(/API key "New Partner" created/i)).toBeInTheDocument();
    expect(screen.getByText('cps_abc.full-secret-here')).toBeInTheDocument();
  });

  it('copies the secret to clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(getApiKeys).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(createApiKey).mockResolvedValue({
      ...key(), fullKey: 'cps_abc.secret-XYZ',
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: /New API key/i }));
    await user.type(screen.getByLabelText(/^Name$/i), 'X');
    await user.click(screen.getByRole('button', { name: /^Create$/ }));

    await screen.findByText('cps_abc.secret-XYZ');
    await user.click(screen.getByRole('button', { name: /^Copy$/ }));

    expect(writeText).toHaveBeenCalledWith('cps_abc.secret-XYZ');
    expect(await screen.findByText(/Copied — paste into your partner/i))
      .toBeInTheDocument();
  });

  it('revokes a key after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(getApiKeys).mockResolvedValue({
      data: [key()],
      pagination: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(revokeApiKey).mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Partner X');
    await user.click(screen.getByRole('button', { name: /Revoke/i }));

    await waitFor(() => expect(revokeApiKey).toHaveBeenCalledWith(1));
  });

  it('shows empty state when no keys', async () => {
    vi.mocked(getApiKeys).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText(/No API keys yet/i)).toBeInTheDocument();
  });

  it('shows error when load fails', async () => {
    vi.mocked(getApiKeys).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });
});
