import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewEncounterForm } from '@/pages/Admin/Encounters/NewEncounterForm';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/pages/Admin/Encounters/encountersApi', () => ({
  encountersApi: {
    list: vi.fn(),
    create: vi.fn(),
    searchPatients: vi.fn(),
  },
}));

import { encountersApi } from '@/pages/Admin/Encounters/encountersApi';

function renderForm() {
  return render(
    <MemoryRouter>
      <NewEncounterForm />
    </MemoryRouter>
  );
}

describe('NewEncounterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.mocked(encountersApi.searchPatients).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks submit when no patient is selected and shows an error', async () => {
    const user = userEvent.setup();
    renderForm();

    // Fill the other required fields but skip patient selection.
    await user.type(screen.getByLabelText(/^provider \*$/i), 'Dr. Strange');
    await user.type(screen.getByLabelText(/^diagnosis codes \*$/i), 'A1.2');
    await user.type(screen.getByLabelText(/^procedure codes \*$/i), '99213');

    await user.click(screen.getByRole('button', { name: /create encounter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/please select a patient/i);
    expect(encountersApi.create).not.toHaveBeenCalled();
  });

  it('typeahead calls searchPatients debounced and selecting a result populates the chip', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(encountersApi.searchPatients).mockResolvedValue([
      { id: 42, firstName: 'Alice', lastName: 'Anderson', organizationName: 'Acme Hospice' },
    ]);

    renderForm();

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const search = screen.getByLabelText(/search patients/i);
    await user.type(search, 'ali');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(encountersApi.searchPatients).toHaveBeenCalledWith('ali');
    });

    const resultBtn = await screen.findByRole('button', { name: /alice anderson/i });
    await user.click(resultBtn);

    // Chip shows the selected patient + Change affordance is available.
    // The Change button is inside the patient <label>, so its accessible name
    // includes the surrounding label text — match it by text content instead.
    await waitFor(() => {
      expect(screen.getByText(/alice anderson \(acme hospice\)/i)).toBeInTheDocument();
    });
    const changeBtn = screen.getByText(/^change$/i);
    expect(changeBtn.tagName).toBe('BUTTON');
  });

  it('submits to encountersApi.create and navigates back to the list on success', async () => {
    vi.mocked(encountersApi.searchPatients).mockResolvedValue([
      { id: 7, firstName: 'Bob', lastName: 'Brown', organizationName: null },
    ]);
    vi.mocked(encountersApi.create).mockResolvedValueOnce({ id: 555 });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderForm();

    // Pick a patient via the typeahead.
    await user.type(screen.getByLabelText(/search patients/i), 'bob');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const resultBtn = await screen.findByRole('button', { name: /bob brown/i });
    await user.click(resultBtn);

    // Fill remaining required fields.
    await user.type(screen.getByLabelText(/^provider \*$/i), 'Dr. Strange');
    await user.type(screen.getByLabelText(/^diagnosis codes \*$/i), 'A1.2');
    await user.type(screen.getByLabelText(/^procedure codes \*$/i), '99213');

    await user.click(screen.getByRole('button', { name: /create encounter/i }));

    await waitFor(() => {
      expect(encountersApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 7,
          provider: 'Dr. Strange',
          diagnosisCodes: 'A1.2',
          procedureCodes: '99213',
        })
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/encounters');
    });
  });

  it('shows an error message when encountersApi.create fails', async () => {
    vi.mocked(encountersApi.searchPatients).mockResolvedValue([
      { id: 9, firstName: 'Carol', lastName: 'Curie', organizationName: null },
    ]);
    vi.mocked(encountersApi.create).mockRejectedValueOnce(new Error('Patient not found'));

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderForm();

    await user.type(screen.getByLabelText(/search patients/i), 'car');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const resultBtn = await screen.findByRole('button', { name: /carol curie/i });
    await user.click(resultBtn);

    await user.type(screen.getByLabelText(/^provider \*$/i), 'Dr. Banner');
    await user.type(screen.getByLabelText(/^diagnosis codes \*$/i), 'C3.1');
    await user.type(screen.getByLabelText(/^procedure codes \*$/i), '99215');

    await user.click(screen.getByRole('button', { name: /create encounter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/patient not found/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
