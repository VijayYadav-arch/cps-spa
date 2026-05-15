import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientHistory } from '@/pages/Patients/PatientHistory';

vi.mock('@/api/patients', () => ({
  getPatientHistory: vi.fn(),
}));

import { getPatientHistory } from '@/api/patients';

describe('PatientHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  function renderWithRoute(patientId = '1') {
    return render(
      <MemoryRouter initialEntries={[`/patients/${patientId}/history`]}>
        <Routes>
          <Route path="/patients/:id/history" element={<PatientHistory />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('shows loading state initially', () => {
    vi.mocked(getPatientHistory).mockReturnValue(new Promise(() => {}));
    renderWithRoute();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders events table after data loads', async () => {
    vi.mocked(getPatientHistory).mockResolvedValueOnce({
      data: [
        {
          id: 1, type: 'encounter', date: '2024-03-15T00:00:00Z',
          summary: 'Encounter with Dr. Smith',
          provider: 'Dr. Smith', diagnosisCodes: '[]', procedureCodes: '[]', notes: null,
          visitType: null, status: null, clinicianId: null, signedAt: null,
          medicationName: null, dosage: null, route: null, frequency: null,
          prescribedBy: null, isActive: null,
          admissionType: null, admissionStatus: null, levelOfCare: null, dischargedAt: null,
        },
      ],
      pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      filters: { type: null },
    });
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Encounter with Dr. Smith')).toBeInTheDocument();
    });
  });

  it('shows error state when API rejects', async () => {
    vi.mocked(getPatientHistory).mockRejectedValueOnce(new Error('network error'));
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows empty state when no events returned', async () => {
    vi.mocked(getPatientHistory).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      filters: { type: null },
    });
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('No history events found.')).toBeInTheDocument();
    });
  });
});
