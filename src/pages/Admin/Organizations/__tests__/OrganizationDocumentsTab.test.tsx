import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationDocumentsTab } from '@/pages/Admin/Organizations/OrganizationDocumentsTab';
import type {
  DocumentSummary,
  OrganizationDetail,
  PaginationMeta,
} from '@/pages/Admin/Organizations/orgsTypes';

vi.mock('@/pages/Admin/Organizations/orgsApi', () => ({
  orgsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    getClaims: vi.fn(),
    getPatients: vi.fn(),
    getEncounters: vi.fn(),
    getDocuments: vi.fn(),
    getReports: vi.fn(),
  },
}));

import { orgsApi } from '@/pages/Admin/Organizations/orgsApi';

function makeOrg(overrides: Partial<OrganizationDetail> = {}): OrganizationDetail {
  return {
    id: 42,
    name: 'Acme Hospice',
    slug: 'acme-hospice',
    email: null,
    phone: null,
    address: null,
    taxId: null,
    active: true,
    isDeleted: false,
    parentOrganizationId: null,
    claimsCount: 0,
    patientsCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeDocsResponse(
  overrides: Partial<{ data: DocumentSummary[]; pagination: PaginationMeta }> = {},
): { data: DocumentSummary[]; pagination: PaginationMeta } {
  return {
    data: [
      {
        id: 11,
        organizationId: 42,
        uploadedById: 5,
        fileName: 'contract-2026.pdf',
        filePath: '/storage/42/contract-2026.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        category: 'contract',
        notes: null,
        createdAt: '2026-04-15T00:00:00Z',
        updatedAt: '2026-04-15T00:00:00Z',
        isDeleted: false,
      },
      {
        id: 12,
        organizationId: 42,
        uploadedById: 5,
        fileName: 'eob-april.pdf',
        filePath: '/storage/42/eob-april.pdf',
        fileSize: 53248,
        mimeType: 'application/pdf',
        category: 'eob',
        notes: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        isDeleted: false,
      },
    ],
    pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    ...overrides,
  };
}

function renderTab(orgId: string = '42') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/documents`]}>
      <Routes>
        <Route
          path="/admin/organizations/:id/documents"
          element={<OrganizationDocumentsTab />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationDocumentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orgsApi.getById).mockResolvedValue(makeOrg());
    vi.mocked(orgsApi.getDocuments).mockResolvedValue(makeDocsResponse());
  });

  it('renders org header + document rows from mocked APIs', async () => {
    renderTab();

    expect(
      await screen.findByRole('heading', {
        name: /Acme Hospice — Documents/i,
      }),
    ).toBeInTheDocument();

    // Each filename renders twice (mobile cards + desktop table mount in jsdom).
    expect((await screen.findAllByText('contract-2026.pdf')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('eob-april.pdf').length).toBeGreaterThanOrEqual(1);
  });

  it('calls orgsApi.getDocuments(42, ...) on mount with the URL param org id', async () => {
    renderTab();

    await waitFor(() => {
      expect(orgsApi.getById).toHaveBeenCalledWith(42);
      expect(orgsApi.getDocuments).toHaveBeenCalledWith(42, {
        page: 1,
        pageSize: 50,
      });
    });
  });

  it('Next button advances the page param', async () => {
    const items: DocumentSummary[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      organizationId: 42,
      uploadedById: 1,
      fileName: `doc-${i + 1}.pdf`,
      filePath: `/storage/42/doc-${i + 1}.pdf`,
      fileSize: 1024,
      mimeType: 'application/pdf',
      category: 'other',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      isDeleted: false,
    }));
    vi.mocked(orgsApi.getDocuments).mockResolvedValue({
      data: items,
      pagination: { total: 100, page: 1, pageSize: 50, totalPages: 2 },
    });

    renderTab();
    await screen.findByRole('heading', { name: /Acme Hospice — Documents/i });
    const callsBefore = vi.mocked(orgsApi.getDocuments).mock.calls.length;

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.getDocuments).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][1]).toMatchObject({ page: 2 });
    });
  });

  it('renders empty state when no documents', async () => {
    vi.mocked(orgsApi.getDocuments).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
    });

    renderTab();

    expect(await screen.findByText(/no documents found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 total/i)).toBeInTheDocument();
  });

  it('back link points to /admin/organizations/42', async () => {
    renderTab();

    const backLink = await screen.findByRole('link', {
      name: /Back to Acme Hospice/i,
    });
    expect(backLink).toHaveAttribute('href', '/admin/organizations/42');
  });
});
