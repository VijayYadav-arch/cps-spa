import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionGuard } from '@/permissions/PermissionGuard';
import { PERMISSIONS } from '@/permissions/permissions';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));
import { apiClient } from '@/api/client';

const renderWithQuery = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PermissionGuard', () => {
  it('renders children when user has the permission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        userId: 1,
        email: 'x@example.com',
        organizationId: 1,
        organizationName: 'X',
        roles: [],
        permissions: ['claims:view'],
        serverTime: new Date().toISOString(),
      },
    });
    renderWithQuery(
      <PermissionGuard required={PERMISSIONS.CLAIMS_VIEW}>
        <button>Visible</button>
      </PermissionGuard>
    );
    await waitFor(() => expect(screen.queryByText('Visible')).toBeInTheDocument());
  });

  it('renders fallback when user lacks the permission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        userId: 1,
        email: 'x@example.com',
        organizationId: 1,
        organizationName: 'X',
        roles: [],
        permissions: [],
        serverTime: new Date().toISOString(),
      },
    });
    renderWithQuery(
      <PermissionGuard required={PERMISSIONS.CLAIMS_VIEW} fallback={<span>Hidden</span>}>
        <button>Visible</button>
      </PermissionGuard>
    );
    await waitFor(() => expect(screen.queryByText('Hidden')).toBeInTheDocument());
    expect(screen.queryByText('Visible')).not.toBeInTheDocument();
  });
});
