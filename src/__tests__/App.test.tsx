import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Routes, Route, Navigate } from 'react-router-dom';

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
vi.mock('@/pages/Patients/PatientHistory', () => ({ PatientHistory: () => <div>Patient History</div> }));
vi.mock('@/pages/Patients/PatientsRoutes', () => ({
  PatientsRoutes: () => (
    <Routes>
      <Route index element={<div>Patients</div>} />
      <Route path=":id" element={<div>Patient Detail</div>} />
      <Route path=":id/history" element={<div>Patient History</div>} />
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  ),
}));
vi.mock('@/pages/Billing/BillingDashboard', () => ({ BillingDashboard: () => <div>Billing</div> }));
vi.mock('@/pages/Clinical/ClinicalOverview', () => ({ ClinicalOverview: () => <div>Clinical</div> }));
vi.mock('@/pages/Documents/DocumentsList', () => ({ DocumentsList: () => <div>Documents</div> }));
vi.mock('@/pages/Platform/PlatformDashboard', () => ({ PlatformDashboard: () => <div>Platform</div> }));
vi.mock('@/pages/Admin/AdminDashboard', () => ({ AdminDashboard: () => <div>Admin</div> }));
vi.mock('@/pages/Hospice/HospiceWorkQueue', () => ({ HospiceWorkQueue: () => <div>Hospice Work Queue Page</div> }));

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

  it('renders PatientHistory page at /patients/1/history', () => {
    const makeToken = (payload: object) => {
      const body = btoa(JSON.stringify(payload));
      return `header.${body}.sig`;
    };
    sessionStorage.setItem('cps_token', makeToken({ userId: 1, organizationId: 5, rbac_role: 'billing_admin' }));
    window.history.pushState({}, '', '/patients/1/history');
    render(<App />);
    expect(screen.getByText('Patient History')).toBeInTheDocument();
  });

  it('renders HospiceWorkQueue at /hospice/work-queue', () => {
    const makeToken = (payload: object) => {
      const body = btoa(JSON.stringify(payload));
      return `header.${body}.sig`;
    };
    sessionStorage.setItem('cps_token', makeToken({ userId: 1, organizationId: 5, rbac_role: 'billing_manager' }));
    window.history.pushState({}, '', '/hospice/work-queue');
    render(<App />);
    expect(screen.getByText('Hospice Work Queue Page')).toBeInTheDocument();
  });
});
