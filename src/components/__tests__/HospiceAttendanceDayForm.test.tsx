import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HospiceAttendanceDayForm } from '@/components/HospiceAttendanceDayForm';

describe('HospiceAttendanceDayForm', () => {
  it('renders the service date in the heading and hides hours by default', () => {
    render(
      <HospiceAttendanceDayForm
        serviceDate="2026-05-10"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Attendance for 2026-05-10/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Hours of Continuous Care/i)).not.toBeInTheDocument();
  });

  it('reveals the hours input when level of care switches to Continuous Home Care', async () => {
    const user = userEvent.setup();
    render(
      <HospiceAttendanceDayForm
        serviceDate="2026-05-10"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/Level of Care/i), 'ContinuousHomeCare');
    expect(screen.getByLabelText(/Hours of Continuous Care/i)).toBeInTheDocument();
  });

  it('disables submit when CHC hours are below 8', async () => {
    const user = userEvent.setup();
    render(
      <HospiceAttendanceDayForm
        serviceDate="2026-05-10"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/Level of Care/i), 'ContinuousHomeCare');
    await user.type(screen.getByLabelText(/Hours of Continuous Care/i), '7');
    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });

  it('calls onSubmit with the assembled request', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <HospiceAttendanceDayForm
        serviceDate="2026-05-10"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        serviceDate: '2026-05-10',
        levelOfCare: 'RoutineHomeCare',
        chcHoursOfCare: null,
        primaryNurseUserId: null,
        facilityName: null,
        notes: null,
      }),
    );
  });

  it('shows error banner when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(
      <HospiceAttendanceDayForm
        serviceDate="2026-05-10"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('boom'));
  });

  it('Cancel button calls onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <HospiceAttendanceDayForm
        serviceDate="2026-05-10"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
