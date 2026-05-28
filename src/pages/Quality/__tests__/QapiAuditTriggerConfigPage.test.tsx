import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiAuditTriggerConfigPage } from '@/pages/Quality/QapiAuditTriggerConfigPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

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
  beforeEach(() => vi.clearAllMocks());

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
});
