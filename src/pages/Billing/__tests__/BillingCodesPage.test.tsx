import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BillingCodesPage } from '@/pages/Billing/BillingCodesPage';

vi.mock('@/api/claims', async () => {
  const actual = await vi.importActual<typeof import('@/api/claims')>('@/api/claims');
  return {
    ...actual,
    searchBillingCodes: vi.fn(),
  };
});

import { searchBillingCodes } from '@/api/claims';

function code(c: string, type = 'icd10', category = 'general') {
  return { code: c, description: `Desc for ${c}`, type, category };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BillingCodesPage />
    </MemoryRouter>
  );
}

describe('BillingCodesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchBillingCodes).mockResolvedValue({
      data: [code('I50.9'), code('I10', 'icd10', 'hospice')],
      count: 2,
    });
  });

  it('renders heading + back link + initial result set', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /billing code lookup/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to billing/i })).toHaveAttribute('href', '/billing');
    await waitFor(() => {
      expect(screen.getByText('I50.9')).toBeInTheDocument();
      expect(screen.getByText('I10')).toBeInTheDocument();
    });
  });

  it('filters by type and refetches', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(searchBillingCodes).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByRole('combobox', { name: /code type/i }), 'cpt');

    await waitFor(() => {
      expect(searchBillingCodes).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'cpt' }));
    });
  });

  it('shows empty state when no results', async () => {
    vi.mocked(searchBillingCodes).mockResolvedValueOnce({ data: [], count: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no codes match/i)).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(searchBillingCodes).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
