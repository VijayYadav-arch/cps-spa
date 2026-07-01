import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClinicianPatientDetail } from '@/pages/Clinician/ClinicianPatientDetail';

vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn() } }));
import { apiClient } from '@/api/client';

vi.mock('@/api/clinical', () => ({
  getCarePlans: vi.fn(),
  getMedications: vi.fn(),
  getOrders: vi.fn(),
  getPatientVitals: vi.fn(),
  getPatientVisits: vi.fn(),
}));
import { getMedications, getPatientVitals, getPatientVisits, getOrders, getCarePlans } from '@/api/clinical';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({
    data: { data: { id: 5, firstName: 'Jo', lastName: 'Doe', dateOfBirth: '1955-01-01', mrn: 'M-5', primaryDiagnosis: 'I50.9', primaryDiagnosisDesc: 'CHF', phone: null, address: null, active: true, admittedAt: null } },
  } as never);
  vi.mocked(getMedications).mockResolvedValue({ data: [{ id: 1, patientId: 5, organizationId: 1, name: 'Furosemide', genericName: null, dosage: '40mg', route: 'PO', frequency: 'daily', prescribedBy: null, purpose: null, isHospiceRelated: null, isActive: true, notes: null }] } as never);
  vi.mocked(getPatientVitals).mockResolvedValue([{ id: 9, patientId: 5, visitDate: '2026-06-20', vitals: 'BP 120/80, HR 72', clinicianId: 7 }] as never);
  vi.mocked(getPatientVisits).mockResolvedValue([{ id: 3, visitDate: '2026-06-20', status: 'signed', visitType: 'Nursing' }] as never);
  vi.mocked(getOrders).mockResolvedValue({ data: [] } as never);
  vi.mocked(getCarePlans).mockResolvedValue({ data: [] } as never);
});

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/clinician/patients/5']}>
      <Routes><Route path="/clinician/patients/:id" element={<ClinicianPatientDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe('ClinicianPatientDetail (clinical chart)', () => {
  it('shows the overview + New Visit Note action', async () => {
    renderAt();
    await waitFor(() => expect(screen.getByTestId('patient-name')).toHaveTextContent('Doe, Jo'));
    expect(screen.getByTestId('chart-overview')).toBeInTheDocument();
    expect(screen.getByTestId('action-new-visit-note')).toHaveAttribute('href', '/clinician/visits/new?patientId=5');
  });

  it('loads the Medications tab on demand', async () => {
    renderAt();
    await waitFor(() => expect(screen.getByTestId('chart-tab-medications')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('chart-tab-medications'));
    await waitFor(() => expect(vi.mocked(getMedications)).toHaveBeenCalledWith({ patientId: 5 }));
    expect(screen.getByTestId('chart-medications').textContent).toMatch(/Furosemide 40mg/);
  });

  it('loads Vitals and Visits tabs', async () => {
    renderAt();
    await waitFor(() => expect(screen.getByTestId('chart-tab-vitals')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('chart-tab-vitals'));
    await waitFor(() => expect(screen.getByTestId('chart-vitals').textContent).toMatch(/BP 120\/80/));
    await userEvent.click(screen.getByTestId('chart-tab-visits'));
    await waitFor(() => expect(vi.mocked(getPatientVisits)).toHaveBeenCalledWith(5));
  });

  it('shows an empty state for a section with no data', async () => {
    renderAt();
    await waitFor(() => expect(screen.getByTestId('chart-tab-orders')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('chart-tab-orders'));
    await waitFor(() => expect(screen.getByTestId('chart-orders-empty')).toBeInTheDocument());
  });
});
