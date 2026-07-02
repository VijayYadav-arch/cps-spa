import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModuleSelector } from '@/pages/Admin/Organizations/ModuleSelector';
import { MODULES } from '@/permissions';

describe('ModuleSelector', () => {
  it('applies a bundle preset to the selection', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModuleSelector value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /hospice suite/i }));

    expect(onChange).toHaveBeenCalledWith([MODULES.HOSPICE, MODULES.CLINICAL, MODULES.BILLING]);
  });

  it('toggles a single module off, preserving catalog order', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ModuleSelector value={[MODULES.HOSPICE, MODULES.CLINICAL, MODULES.BILLING]} onChange={onChange} />
    );

    // Uncheck Clinical (the checkbox carries an aria-label of the module name).
    await user.click(screen.getByRole('checkbox', { name: 'Clinical' }));

    expect(onChange).toHaveBeenCalledWith([MODULES.HOSPICE, MODULES.BILLING]);
  });

  it('toggles a single module on', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModuleSelector value={[MODULES.HOSPICE]} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Home Health' }));

    expect(onChange).toHaveBeenCalledWith([MODULES.HOSPICE, MODULES.HOME_HEALTH]);
  });

  it('disables all controls when disabled', () => {
    render(<ModuleSelector value={[MODULES.HOSPICE]} onChange={vi.fn()} disabled />);
    screen.getAllByRole('checkbox').forEach((cb) => expect(cb).toBeDisabled());
  });
});
