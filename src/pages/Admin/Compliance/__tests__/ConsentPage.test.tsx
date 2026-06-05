import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConsentPage } from '@/pages/Admin/Compliance/ConsentPage';

vi.mock('@/api/consentForms', () => ({
  listConsentForms: vi.fn(),
  signConsentForm: vi.fn(),
}));

// Replace the canvas-backed SignaturePad with a deterministic stub for tests.
vi.mock('@/components/SignaturePad', () => ({
  SignaturePad: React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      toDataUrl: () => 'data:image/png;base64,STUB',
      clear: () => {},
      isEmpty: () => false,
    }));
    return React.createElement('div', { 'data-testid': 'stub-pad' });
  }),
}));

import { listConsentForms, signConsentForm } from '@/api/consentForms';

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

  it('shows a Sign button only for pending rows', async () => {
    vi.mocked(listConsentForms).mockResolvedValueOnce({
      data: [form(1, 'pending'), form(2, 'signed')],
      pagination: { total: 2, page: 1, pageSize: 100 },
    });
    renderPage();
    await waitFor(() => {
      const signButtons = screen.queryAllByRole('button', { name: /^sign$/i });
      expect(signButtons).toHaveLength(1);
    });
  });

  it('opens the sign modal + submits with captured signature', async () => {
    vi.mocked(listConsentForms).mockResolvedValueOnce({
      data: [form(1, 'pending')],
      pagination: { total: 1, page: 1, pageSize: 100 },
    });
    vi.mocked(signConsentForm).mockResolvedValueOnce({
      ...form(1, 'signed'),
      signedBy: 'Patient One',
      signatureImageDataUrl: 'data:image/png;base64,STUB',
    } as never);

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /^sign$/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^sign$/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/signer's name/i), 'Patient One');
    await user.click(screen.getByRole('button', { name: /record signature/i }));

    await waitFor(() => {
      expect(signConsentForm).toHaveBeenCalled();
    });
    const [formId, payload] = vi.mocked(signConsentForm).mock.calls[0];
    expect(formId).toBe(1);
    expect(payload.signedBy).toBe('Patient One');
    expect(payload.signatureImageDataUrl).toBe('data:image/png;base64,STUB');
    expect(payload.relationship).toBe('self');
  });

  it('blocks submit when signer name is missing', async () => {
    vi.mocked(listConsentForms).mockResolvedValueOnce({
      data: [form(1, 'pending')],
      pagination: { total: 1, page: 1, pageSize: 100 },
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /^sign$/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^sign$/i }));
    // Submit with the name input untouched -> empty -> validation error.
    await user.click(screen.getByRole('button', { name: /record signature/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/name is required/i);
    expect(signConsentForm).not.toHaveBeenCalled();
  });
});
