import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RcaForm } from '@/components/RcaForm';

describe('RcaForm', () => {
  it('calls onSubmit with collected payload on form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RcaForm onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Method'), 'FishboneIshikawa');
    await user.type(screen.getByLabelText('Contributing Factors'), 'Factor A');
    await user.type(screen.getByLabelText('Root Cause Summary'), 'Root cause text');
    await user.click(screen.getByRole('button', { name: /submit rca/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'FishboneIshikawa',
        contributingFactors: 'Factor A',
        rootCauseSummary: 'Root cause text',
        createPip: false,
      }),
    );
  });

  it('shows PIP fields when "Create linked PIP" checkbox is toggled on', async () => {
    const user = userEvent.setup();
    render(<RcaForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText('PIP Title')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /create linked pip/i }));

    expect(screen.getByLabelText('PIP Title')).toBeInTheDocument();
    expect(screen.getByLabelText('PIP Description')).toBeInTheDocument();
    expect(screen.getByLabelText('PIP Category')).toBeInTheDocument();
  });

  it('includes PIP fields in payload when createPip is true', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RcaForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('checkbox', { name: /create linked pip/i }));
    await user.type(screen.getByLabelText('PIP Title'), 'New PIP');
    await user.click(screen.getByRole('button', { name: /submit rca/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        createPip: true,
        pipTitle: 'New PIP',
        pipCategory: 'PatientSafety',
      }),
    );
  });
});
