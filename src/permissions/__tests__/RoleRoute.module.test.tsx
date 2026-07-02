import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleRoute } from '@/permissions/RoleRoute';
import { PERMISSIONS } from '@/permissions/permissions';
import { MODULES } from '@/permissions/modules';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));
import { apiClient } from '@/api/client';

const me = (permissions: string[], modules?: string[]) => ({
  data: {
    userId: 1,
    email: 'x@example.com',
    organizationId: 1,
    organizationName: 'X',
    roles: [],
    permissions,
    serverTime: new Date().toISOString(),
    modules,
  },
});

const renderRoute = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/hospice']}>
        <Routes>
          <Route
            path="/hospice"
            element={
              <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY} module={MODULES.HOSPICE}>
                <div>Hospice Content</div>
              </RoleRoute>
            }
          />
          <Route path="/unauthorized" element={<div>Not Authorized</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => vi.clearAllMocks());

describe('RoleRoute module gating', () => {
  it('renders content when permitted AND entitled to the module', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me(['clinical:quality'], [MODULES.HOSPICE]));
    renderRoute();
    await waitFor(() => expect(screen.queryByText('Hospice Content')).toBeInTheDocument());
  });

  it('redirects to /unauthorized when permitted but NOT entitled to the module', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me(['clinical:quality'], [MODULES.BILLING]));
    renderRoute();
    await waitFor(() => expect(screen.queryByText('Not Authorized')).toBeInTheDocument());
    expect(screen.queryByText('Hospice Content')).not.toBeInTheDocument();
  });

  it('redirects to /unauthorized when entitled but lacking the permission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me([], [MODULES.HOSPICE]));
    renderRoute();
    await waitFor(() => expect(screen.queryByText('Not Authorized')).toBeInTheDocument());
  });

  it('fails open on the module when the API predates the modules field', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me(['clinical:quality'], undefined));
    renderRoute();
    await waitFor(() => expect(screen.queryByText('Hospice Content')).toBeInTheDocument());
  });
});
