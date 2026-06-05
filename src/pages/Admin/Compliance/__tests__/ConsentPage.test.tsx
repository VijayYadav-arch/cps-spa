import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsentPage } from '@/pages/Admin/Compliance/ConsentPage';

vi.mock('@/api/consentForms', () => ({
  listConsentForms: vi.fn(),
}));

import { listConsentForms } from '@/api/consentForms';

function form(id: number, status = 'pending', formType = 'hipaa-auth') {
  return {
    id,
    patientId: 100 + id,
    organizationId: 1,
    formType,
    status,
    signedBy: status === 'signed' ? 'Jane Doe' : null,
    signedAt: status === 'signed' ? '2026-06-05T00:00:00Z' : null,
    relationship: null,
    witnessName: null,
    witnessAt: null,
    documentUrl: null,
    expirationDate: null,
    notes: null,
    createdAt: '2026-06-05T00:00:00Z',
    updatedAt: '2026-06-05T00:00:00Z',
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ConsentPage />
    </MemoryRouter>
  );
}

describe('ConsentPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders heading + rows when backend returns data', async () => {
    vi.mocked(listConsentForms).mockResolvedValueOnce({
      data: [form(1, 'pending'), form(2, 'signed', 'consent-to-treat')],
      pagination: { total: 2, page: 1, pageSize: 100 },
    });
    renderPage();
    expect(screen.getByRole('heading', { name: /consent forms/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText('HIPAA Auth')).toBeInTheDocument();
      expect(screen.getByText('Consent to Treat')).toBeInTheDocument();
    });
  });

  it('shows pending-banner when any form is pending', async () => {
    vi.mocked(listConsentForms).mockResolvedValueOnce({
      data: [form(1, 'pending'), form(2, 'pending')],
      pagination: { total: 2, page: 1, pageSize: 100 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/2 consent form\(s\) pending signature/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when API returns no forms', async () => {
    vi.mocked(listConsentForms).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 100 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no consent forms yet/i)).toBeInTheDocument();
    });
  });

  it('renders error alert on fetch failure', async () => {
    vi.mocked(listConsentForms).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500/);
    });
  });
});
