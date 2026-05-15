import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock all API calls to prevent network requests in routing tests
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } } }),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// Stub all page components to keep tests fast
vi.mock('@/pages/Login', () => ({ Login: () => <div>Login Page</div> }));
vi.mock('@/pages/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('@/pages/Claims/ClaimsList', () => ({ ClaimsList: () => <div>Claims List</div> }));
vi.mock('@/pages/Claims/ClaimDetail', () => ({ ClaimDetail: () => <div>Claim Detail</div> }));
vi.mock('@/pages/Patients/PatientsList', () => ({ PatientsList: () => <div>Patients</div> }));
vi.mock('@/pages/Patients/PatientDetail', () => ({ PatientDetail: () => <div>Patient Detail</div> }));
vi.mock('@/pages/Billing/BillingDashboard', () => ({ BillingDashboard: () => <div>Billing</div> }));
vi.mock('@/pages/Clinical/ClinicalOverview', () => ({ ClinicalOverview: () => <div>Clinical</div> }));
vi.mock('@/pages/Documents/DocumentsList', () => ({ DocumentsList: () => <div>Documents</div> }));
vi.mock('@/pages/Platform/PlatformDashboard', () => ({ PlatformDashboard: () => <div>Platform</div> }));
vi.mock('@/pages/Admin/AdminDashboard', () => ({ AdminDashboard: () => <div>Admin</div> }));

import App from '@/App';

describe('App routing', () => {
  beforeEach(() => {
    // Reset location to root before each test so BrowserRouter starts at /
    window.history.pushState({}, '', '/');
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('renders Login page for unauthenticated users visiting /login', () => {
    render(<App />);
    // Unauthenticated user at / → ProtectedRoute redirects to /login
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders Dashboard for authenticated users at /', () => {
    const makeToken = (payload: object) => {
      const body = btoa(JSON.stringify(payload));
      return `header.${body}.sig`;
    };
    sessionStorage.setItem('cps_token', makeToken({ userId: 1, organizationId: 5, rbac_role: 'billing_admin' }));
    render(<App />);
    // Layout sidebar nav has a "Dashboard" link + the stub page renders <div>Dashboard</div>
    const dashboardEls = screen.getAllByText('Dashboard');
    expect(dashboardEls.length).toBeGreaterThanOrEqual(1);
  });
});
