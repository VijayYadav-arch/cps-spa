import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ImportPage } from '@/pages/Admin/Import/ImportPage';

vi.mock('@/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from '@/api/client';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>
  );
}

const CSV_SAMPLE = 'firstName,lastName,email\nJane,Doe,jane@example.com\nJohn,Smith,john@example.com\n';

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds admin:import so existing behaviour tests see an
    // enabled Import button. Permission-gating tests override.
    setPermissions(['admin:import']);
  });

  it('renders heading + type tabs', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /data import/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Patients' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Claims' })).toBeInTheDocument();
  });

  it('switches type tab and resets state', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Claims' }));
    expect(screen.getByRole('tab', { name: 'Claims' })).toHaveAttribute('aria-selected', 'true');
  });

  it('processes CSV upload and shows preview + mapping', async () => {
    renderPage();
    const file = new File([CSV_SAMPLE], 'patients.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/preview/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('calls import endpoint and shows results', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { imported: 2, skipped: 0, errors: [] },
    } as never);
    renderPage();

    const file = new File([CSV_SAMPLE], 'patients.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => expect(screen.getByRole('button', { name: /import patients/i })).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /import patients/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/import/patients',
        expect.objectContaining({ csvData: expect.stringContaining('Jane') })
      );
      expect(screen.getByText('2', { selector: '.text-2xl' })).toBeInTheDocument();
    });
  });

  describe('permission gating', () => {
    function loadCsv() {
      const file = new File([CSV_SAMPLE], 'patients.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    it('disables Import with a permission tooltip when the user lacks admin:import', async () => {
      setPermissions([]); // no admin:import
      renderPage();
      loadCsv();

      const btn = await screen.findByRole('button', { name: /import patients/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Import when the user has admin:import', async () => {
      setPermissions(['admin:import']);
      renderPage();
      loadCsv();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import patients/i })).toBeEnabled();
      });
    });
  });
});
