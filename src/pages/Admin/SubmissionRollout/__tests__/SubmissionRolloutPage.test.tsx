import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SubmissionRolloutPage } from '@/pages/Admin/SubmissionRollout/SubmissionRolloutPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));
import { apiClient } from '@/api/client';

vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setPermissions(['admin:system_config']);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SubmissionRolloutPage />
    </MemoryRouter>,
  );
}

function readiness(ready: boolean, enabled: boolean, failing: string[] = []) {
  const checks = [
    { name: 'clearinghouse-config', passed: true, detail: '' },
    { name: 'clearinghouse-credentials', passed: true, detail: '' },
    { name: 'payer-enrollment', passed: true, detail: '' },
  ].map((c) => (failing.includes(c.name) ? { ...c, passed: false, detail: 'missing' } : c));
  return { data: { data: { ready, realSubmissionEnabled: enabled, checks } } };
}

/** orgs list then one readiness GET per org, in order. */
function mockLoad(orgs: { id: number; name: string }[], readinessByOrg: Record<number, unknown>) {
  const get = vi.mocked(apiClient.get);
  get.mockResolvedValueOnce({ data: { data: orgs } } as never);
  for (const org of orgs) {
    get.mockResolvedValueOnce(readinessByOrg[org.id] as never);
  }
}

describe('SubmissionRolloutPage', () => {
  it('shows Live/Off submission pills and Ready/Not-ready readiness', async () => {
    mockLoad(
      [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }],
      { 1: readiness(true, true), 2: readiness(false, false, ['payer-enrollment']) },
    );

    renderPage();
    await waitFor(() => expect(screen.getByTestId('rollout-row-1')).toBeInTheDocument());

    const sub = (id: number) =>
      screen.getByTestId(`rollout-row-${id}`).querySelector('[data-testid="submission-pill"]') as HTMLElement;
    const rdy = (id: number) =>
      screen.getByTestId(`rollout-row-${id}`).querySelector('[data-testid="readiness-pill"]') as HTMLElement;

    expect(sub(1).getAttribute('data-enabled')).toBe('true');
    expect(rdy(1).getAttribute('data-ready')).toBe('true');
    expect(sub(2).getAttribute('data-enabled')).toBe('false');
    expect(rdy(2).getAttribute('data-ready')).toBe('false');
    // Failing check is surfaced in the row.
    expect(screen.getByTestId('rollout-row-2').textContent).toMatch(/payer-enrollment/);
  });

  it('disables Enable for a not-ready org (with tooltip) and offers Disable for a live org', async () => {
    mockLoad(
      [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }],
      { 1: readiness(true, true), 2: readiness(false, false, ['payer-enrollment']) },
    );

    renderPage();
    await waitFor(() => expect(screen.getByTestId('rollout-row-1')).toBeInTheDocument());

    // org 1 is live → Disable offered
    expect(screen.getByTestId('disable-1')).toBeInTheDocument();
    expect(screen.queryByTestId('enable-1')).toBeNull();
    // org 2 is off + not ready → Enable present but disabled with a tooltip
    const enable2 = screen.getByTestId('enable-2');
    expect(enable2).toBeDisabled();
    expect(enable2).toHaveAttribute('title', expect.stringMatching(/not ready/i));
  });

  it('enables Enable for a ready off org and PUTs {enabled:true}, then reflects Live', async () => {
    mockLoad([{ id: 3, name: 'Gamma' }], { 3: readiness(true, false) });
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { orgId: 3, realClaimSubmissionEnabled: true } } } as never);
    // refresh readiness after toggle → now enabled
    vi.mocked(apiClient.get).mockResolvedValueOnce(readiness(true, true) as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('enable-3')).toBeEnabled());

    await userEvent.click(screen.getByTestId('enable-3'));
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('editor-notes'), 'go-live-5120');
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() =>
      expect(vi.mocked(apiClient.put)).toHaveBeenCalledWith(
        '/billing/submission-rollout/3',
        { enabled: true, notes: 'go-live-5120' },
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('rollout-row-3').querySelector('[data-testid="submission-pill"]')!.getAttribute('data-enabled'),
      ).toBe('true'),
    );
  });

  it('surfaces a 409 NOT_READY error and keeps the modal open', async () => {
    mockLoad([{ id: 1, name: 'Alpha' }], { 1: readiness(true, false) });
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { status: 409 } });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('enable-1')).toBeEnabled());
    await userEvent.click(screen.getByTestId('enable-1'));
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() => expect(screen.getByTestId('editor-error').textContent).toMatch(/not ready/i));
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument();
  });

  it('disable PUTs {enabled:false} with omitted notes as null', async () => {
    mockLoad([{ id: 1, name: 'Alpha' }], { 1: readiness(true, true) });
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { orgId: 1, realClaimSubmissionEnabled: false } } } as never);
    vi.mocked(apiClient.get).mockResolvedValueOnce(readiness(true, false) as never);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('disable-1')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('disable-1'));
    await userEvent.click(screen.getByTestId('editor-confirm'));

    await waitFor(() => expect(vi.mocked(apiClient.put)).toHaveBeenCalled());
    expect(vi.mocked(apiClient.put).mock.calls[0][1]).toEqual({ enabled: false, notes: null });
  });

  it('gates the editor confirm behind admin:system_config', async () => {
    setPermissions([]); // lacks admin:system_config
    mockLoad([{ id: 1, name: 'Alpha' }], { 1: readiness(true, true) });

    renderPage();
    // Disable button itself is disabled without the permission; open via direct state is not
    // possible, so assert the row button carries the no-permission tooltip.
    await waitFor(() => expect(screen.getByTestId('disable-1')).toBeInTheDocument());
    const disable = screen.getByTestId('disable-1');
    expect(disable).toBeDisabled();
    expect(disable).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('renders an alert when the orgs fetch fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Failed to load/i));
  });

  it('renders empty state when there are no organizations', async () => {
    mockLoad([], {});
    renderPage();
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
  });
});
