import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intakeApi } from '../intakeApi';
import { initialForm } from '../intakeTypes';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);

describe('intakeApi.submitFinal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: { data: { id: 1 } } } as never);
  });

  it('renames secondaryDiagnosesText → secondaryDiagnoses so it binds to CreatePatientRequest (H8)', async () => {
    await intakeApi.submitFinal({
      ...initialForm,
      firstName: 'Jane',
      lastName: 'Doe',
      secondaryDiagnosesText: 'I10; E11.9',
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [, payload] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.secondaryDiagnoses).toBe('I10; E11.9');
    expect(payload).not.toHaveProperty('secondaryDiagnosesText');
  });

  it('coerces empty strings to null', async () => {
    await intakeApi.submitFinal({ ...initialForm, firstName: 'Jane', lastName: 'Doe' });

    const [, payload] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
    // middleName starts as '' in the form → must be sent as null
    expect(payload.middleName).toBeNull();
    // blank secondary diagnoses becomes null, not ''
    expect(payload.secondaryDiagnoses).toBeNull();
  });
});
