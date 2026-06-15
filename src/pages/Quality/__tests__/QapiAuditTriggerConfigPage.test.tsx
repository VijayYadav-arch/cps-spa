import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiAuditTriggerConfigPage } from '@/pages/Quality/QapiAuditTriggerConfigPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function makeTrigger(overrides: Partial<qapiApi.HospiceQapiAuditTrigger> = {}): qapiApi.HospiceQapiAuditTrigger {
  return {
    id: 1,
    organizationId: 1,
    auditEventCode: 'bulk-read',
    category: 'PatientFall',
    severity: 'Moderate',
    isEnabled: true,
    ...overrides,
  };
}

describe('QapiAuditTriggerConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['hospice:qapi_audit_trigger_manage']);
  });

  it('RendersTriggerRows — shows both audit event codes', async () => {
    vi.mocked(qapiApi.listAuditTriggers).mockResolvedValueOnce([
      makeTrigger({ id: 1, auditEventCode: 'bulk-read' }),
      makeTrigger({ id: 2, auditEventCode: 'mass-export' }),
    ]);

    render(<MemoryRouter><QapiAuditTriggerConfigPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('bulk-read')).toBeInTheDocument());
    expect(screen.getByText('mass-export')).toBeInTheDocument();
  });

  it('ToggleCallsUpsert — clicking checkbox calls upsertAuditTrigger with isEnabled=false', async () => {
    vi.mocked(qapiApi.listAuditTriggers)
      .mockResolvedValueOnce([makeTrigger({ id: 1, auditEventCode: 'bulk-read', isEnabled: true })])
      .mockResolvedValueOnce([makeTrigger({ id: 1, auditEventCode: 'bulk-read', isEnabled: false })]);

    vi.mocked(qapiApi.upsertAuditTrigger).mockResolvedValueOnce(
      makeTrigger({ id: 1, auditEventCode: 'bulk-read', isEnabled: false }),
    );

    render(<MemoryRouter><QapiAuditTriggerConfigPage /></MemoryRouter>);

    const checkbox = await screen.findByRole('checkbox');
    await userEvent.click(checkbox);

    expect(qapiApi.upsertAuditTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ auditEventCode: 'bulk-read', isEnabled: false }),
    );
  });

  describe('permission gating', () => {
    it('disables Add Trigger with a permission tooltip when the user lacks audit-trigger-manage', async () => {
      setPermissions([]); // no manage
      vi.mocked(qapiApi.listAuditTriggers).mockResolvedValueOnce([]);

      render(<MemoryRouter><QapiAuditTriggerConfigPage /></MemoryRouter>);

      await waitFor(() => expect(qapiApi.listAuditTriggers).toHaveBeenCalled());
      const btn = screen.getByRole('button', { name: /Add Trigger/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables the per-row enabled checkbox when the user lacks audit-trigger-manage', async () => {
      setPermissions([]); // no manage
      vi.mocked(qapiApi.listAuditTriggers).mockResolvedValueOnce([makeTrigger({ id: 1, auditEventCode: 'bulk-read' })]);

      render(<MemoryRouter><QapiAuditTriggerConfigPage /></MemoryRouter>);

      expect(await screen.findByRole('checkbox')).toBeDisabled();
    });

    it('enables Add Trigger when the user has audit-trigger-manage', async () => {
      setPermissions(['hospice:qapi_audit_trigger_manage']);
      vi.mocked(qapiApi.listAuditTriggers).mockResolvedValueOnce([]);

      render(<MemoryRouter><QapiAuditTriggerConfigPage /></MemoryRouter>);

      await waitFor(() => expect(qapiApi.listAuditTriggers).toHaveBeenCalled());
      expect(screen.getByRole('button', { name: /Add Trigger/i })).toBeEnabled();
    });
  });
});
