import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from '@/pages/Admin/Onboarding/OnboardingPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock('@/api/onboardingStatus', () => ({
  getOrgsStatus: vi.fn(),
  listOnboardingManagers: vi.fn(),
  listOrgUsers: vi.fn(),
  assignOnboardingManager: vi.fn(),
  sendOnboardingEmail: vi.fn(),
}));

import { apiClient } from '@/api/client';
import {
  assignOnboardingManager,
  getOrgsStatus,
  listOnboardingManagers,
  listOrgUsers,
  sendOnboardingEmail,
} from '@/api/onboardingStatus';

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
      <OnboardingPage />
    </MemoryRouter>
  );
}

const HOSPICE_FLOW = {
  data: {
    careType: 'hospice',
    totalSteps: 2,
    steps: [
      { number: 1, title: 'Add patient', description: 'Onboard first patient.', required: true },
      { number: 2, title: 'Submit claim', description: 'Submit first claim.', required: false },
    ],
  },
};

const STATUS_RESPONSE = {
  data: [
    {
      orgId: 1,
      orgName: 'Acme Hospice',
      slug: 'acme',
      signupDate: '2026-04-01T00:00:00Z',
      onboardingPercent: 100,
      currentStep: 6,
      totalSteps: 6,
      completedSteps: [1, 2, 3, 4, 5, 6],
      completedAt: '2026-05-15T00:00:00Z',
      status: 'completed',
      claimsCount: 42,
      patientsCount: 18,
      assignedManagerUserId: null,
      assignedManagerName: null,
      assignedManagerAt: null,
    },
    {
      orgId: 2,
      orgName: 'Bravo Home Health',
      slug: 'bravo',
      signupDate: '2026-05-01T00:00:00Z',
      onboardingPercent: 33,
      currentStep: 3,
      totalSteps: 6,
      completedSteps: [1, 2],
      completedAt: null,
      status: 'in-progress',
      claimsCount: 4,
      patientsCount: 7,
      assignedManagerUserId: 101,
      assignedManagerName: 'Maya Manager',
      assignedManagerAt: '2026-06-01T00:00:00Z',
    },
  ],
  rollup: {
    totalOrgs: 2,
    completed: 1,
    inProgress: 1,
    atRisk: 0,
    notStarted: 0,
    activationRate: 50,
  },
};

const MANAGERS = [
  { userId: 101, name: 'Maya Manager', email: 'maya@cps.test' },
  { userId: 102, name: 'Owen Onboarding', email: 'owen@cps.test' },
];

const BRAVO_USERS = [
  { userId: 201, name: 'Brian Bravo', email: 'brian@bravo.test', role: 'client' },
];

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds platform:onboarding so existing behaviour tests see
    // enabled assign-manager + send controls. Permission-gating tests override.
    setPermissions(['platform:onboarding']);
    vi.mocked(getOrgsStatus).mockResolvedValue(STATUS_RESPONSE as never);
    vi.mocked(listOnboardingManagers).mockResolvedValue(MANAGERS as never);
    vi.mocked(listOrgUsers).mockResolvedValue(BRAVO_USERS as never);
    vi.mocked(assignOnboardingManager).mockResolvedValue({
      orgId: 1,
      assignedManagerUserId: 102,
      assignedManagerAt: '2026-06-05T00:00:00Z',
    } as never);
    vi.mocked(sendOnboardingEmail).mockResolvedValue({
      success: true,
      recipientEmail: 'brian@bravo.test',
    } as never);
  });

  it('renders heading + emails link', () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    expect(screen.getByRole('heading', { name: /^onboarding$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email-template sequence/i })).toHaveAttribute(
      'href',
      '/admin/onboarding/emails'
    );
  });

  it('renders KPI rollup from /orgs-status', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument(); // activation rate
      expect(screen.getByText('Acme Hospice')).toBeInTheDocument();
      expect(screen.getByText('Bravo Home Health')).toBeInTheDocument();
    });
  });

  it('filters per-org rows by status', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
    vi.mocked(getOrgsStatus).mockResolvedValueOnce(STATUS_RESPONSE as never).mockResolvedValueOnce({
      data: [STATUS_RESPONSE.data[0]],
      rollup: STATUS_RESPONSE.rollup,
    } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Acme Hospice')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /^completed$/i }));

    await waitFor(() => {
      expect(getOrgsStatus).toHaveBeenLastCalledWith({ statusFilter: 'completed' });
    });
  });

  it('loads + renders hospice flow steps', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Add patient')).toBeInTheDocument();
      expect(screen.getByText('Submit claim')).toBeInTheDocument();
    });
  });

  it('switches care type and refetches', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: { ...HOSPICE_FLOW.data, careType: 'palliative' } },
    } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('tab', { name: /palliative/i }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith('/onboarding/flow/palliative');
    });
  });

  it('shows error when /orgs-status fetch fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    vi.mocked(getOrgsStatus).mockRejectedValueOnce(new Error('500 onboarding'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500 onboarding/);
    });
  });

  it('assigns a manager via the per-row dropdown', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Acme Hospice')).toBeInTheDocument());
    await waitFor(() => expect(listOnboardingManagers).toHaveBeenCalled());

    await user.selectOptions(
      screen.getByLabelText('Manager for Acme Hospice'),
      '102'
    );

    await waitFor(() => {
      expect(assignOnboardingManager).toHaveBeenCalledWith(1, 102);
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Manager assigned for org 1/);
    });
  });

  it('clears a manager by selecting Unassigned', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
    vi.mocked(assignOnboardingManager).mockResolvedValueOnce({
      orgId: 2,
      assignedManagerUserId: null,
      assignedManagerAt: null,
    } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Bravo Home Health')).toBeInTheDocument());

    const dropdown = screen.getByLabelText('Manager for Bravo Home Health') as HTMLSelectElement;
    await waitFor(() => expect(dropdown.value).toBe('101'));

    await user.selectOptions(dropdown, '');
    await waitFor(() => {
      expect(assignOnboardingManager).toHaveBeenCalledWith(2, null);
    });
  });

  it('opens send-email modal and submits with rendered subject', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Bravo Home Health')).toBeInTheDocument());

    // Click the Send email button on the Bravo row -- two buttons exist; pick row 2.
    const sendButtons = screen.getAllByRole('button', { name: /send email/i });
    await user.click(sendButtons[1]); // 2nd row = Bravo

    await waitFor(() => expect(listOrgUsers).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // Default recipient = first user, default template = welcome-day-0
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(sendOnboardingEmail).toHaveBeenCalled();
    });
    const [orgId, payload] = vi.mocked(sendOnboardingEmail).mock.calls[0];
    expect(orgId).toBe(2);
    expect(payload.recipientUserId).toBe(201);
    expect(payload.templateId).toBeTruthy();
    // {{organizationName}} substituted in subject preview text
    expect(payload.subject).toContain('Welcome');
  });

  describe('permission gating', () => {
    it('disables the assign-manager dropdown with a permission tooltip when the user lacks platform:onboarding', async () => {
      setPermissions([]); // no platform:onboarding
      vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
      renderPage();
      await waitFor(() => expect(screen.getByText('Acme Hospice')).toBeInTheDocument());

      const select = screen.getByLabelText('Manager for Acme Hospice');
      expect(select).toBeDisabled();
      expect(select).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables the assign-manager dropdown when the user has platform:onboarding', async () => {
      setPermissions(['platform:onboarding']);
      vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
      renderPage();
      await waitFor(() => expect(screen.getByText('Acme Hospice')).toBeInTheDocument());

      expect(screen.getByLabelText('Manager for Acme Hospice')).toBeEnabled();
    });

    it('disables the modal Send button with a permission tooltip when the user lacks platform:onboarding', async () => {
      setPermissions([]); // no platform:onboarding
      vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText('Bravo Home Health')).toBeInTheDocument());

      const sendButtons = screen.getAllByRole('button', { name: /send email/i });
      await user.click(sendButtons[1]); // Bravo row
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      await waitFor(() => expect(listOrgUsers).toHaveBeenCalledWith(2));

      const sendBtn = screen.getByRole('button', { name: /^send$/i });
      expect(sendBtn).toBeDisabled();
      expect(sendBtn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });
  });
});
