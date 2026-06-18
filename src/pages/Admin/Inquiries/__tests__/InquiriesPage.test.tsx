import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { InquiriesPage } from '@/pages/Admin/Inquiries/InquiriesPage';

vi.mock('@/api/client', () => {
  return {
    apiClient: {
      get: vi.fn(),
      put: vi.fn(),
    },
  };
});

import { apiClient } from '@/api/client';

function inquiry(id: number, status = 'new') {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    email: `inq${id}@example.com`,
    phone: null,
    organization: null,
    serviceType: 'hospice-billing',
    message: `Message ${id}`,
    status,
    createdAt: '2026-06-01T00:00:00Z',
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InquiriesPage />
    </MemoryRouter>
  );
}

describe('InquiriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and inquiry list', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [inquiry(1), inquiry(2, 'closed')],
        pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
      },
    } as never);
    renderPage();

    expect(screen.getByRole('heading', { name: /inquiries/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('First1 Last1')).toBeInTheDocument();
      expect(screen.getByText('First2 Last2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no inquiries', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } },
    } as never);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no inquiries yet/i)).toBeInTheDocument();
    });
  });

  it('selects inquiry on click and shows details panel', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [{ ...inquiry(7), organization: 'Acme Co.', phone: '555-0100' }],
        pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
      },
    } as never);

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('First7 Last7'));

    expect(screen.getByText(/select an inquiry/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /First7 Last7/i }));

    expect(await screen.findByRole('heading', { name: /inquiry details/i })).toBeInTheDocument();
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
  });

  it('surfaces a load error instead of silently swallowing it (M14)', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('500'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load inquiries/i);
    });
  });

  it('triages an inquiry status via the dropdown (M14)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [inquiry(7)],
        pagination: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
      },
    } as never);
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { data: inquiry(7, 'contacted') },
    } as never);

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('First7 Last7'));
    await user.click(screen.getByRole('button', { name: /First7 Last7/i }));

    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'contacted');

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith('/inquiries/7', { status: 'contacted' }),
    );
  });
});
