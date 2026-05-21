import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingCodeAutocomplete } from '@/components/BillingCodeAutocomplete';

vi.mock('@/api/claims', async (orig) => ({
  ...(await orig<object>()),
  searchBillingCodes: vi.fn(),
}));

import { searchBillingCodes } from '@/api/claims';

beforeEach(() => vi.clearAllMocks());

function setup(initial = '') {
  const onChange = vi.fn();
  const utils = render(
    <BillingCodeAutocomplete
      id="cpt-input"
      label="Procedure code"
      type="cpt"
      value={initial}
      onChange={onChange}
      debounceMs={0}
    />,
  );
  return { ...utils, onChange };
}

describe('BillingCodeAutocomplete', () => {
  it('renders the label + input', () => {
    setup();
    expect(screen.getByLabelText(/Procedure code/i)).toBeInTheDocument();
  });

  it('debounces the search and shows results', async () => {
    const user = userEvent.setup();
    vi.mocked(searchBillingCodes).mockResolvedValue({
      data: [
        { code: '99215', description: 'Office visit established level 5', type: 'cpt', category: 'em' },
        { code: '99214', description: 'Office visit established level 4', type: 'cpt', category: 'em' },
      ],
      count: 2,
    });
    const { onChange } = setup();

    await user.type(screen.getByLabelText(/Procedure code/i), '992');

    expect(await screen.findByText('Office visit established level 5')).toBeInTheDocument();
    // onChange fires on each keystroke for free-text mode
    expect(onChange).toHaveBeenCalled();
  });

  it('selects a result on click and fires onChange with the code', async () => {
    const user = userEvent.setup();
    vi.mocked(searchBillingCodes).mockResolvedValue({
      data: [{ code: '99215', description: 'Office visit', type: 'cpt', category: 'em' }],
      count: 1,
    });
    const { onChange } = setup();

    await user.type(screen.getByLabelText(/Procedure code/i), '99');
    await user.click(await screen.findByText('Office visit'));

    expect(onChange).toHaveBeenLastCalledWith('99215');
  });

  it('keyboard navigation: arrow down + enter picks an item', async () => {
    const user = userEvent.setup();
    vi.mocked(searchBillingCodes).mockResolvedValue({
      data: [
        { code: 'A1', description: 'Alpha', type: 'cpt', category: 'x' },
        { code: 'B2', description: 'Bravo', type: 'cpt', category: 'x' },
      ],
      count: 2,
    });
    const { onChange } = setup();

    const input = screen.getByLabelText(/Procedure code/i);
    await user.type(input, 'a');
    await screen.findByText('Alpha');

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('B2');
  });

  it('passes the type filter to the API call', async () => {
    const user = userEvent.setup();
    vi.mocked(searchBillingCodes).mockResolvedValue({ data: [], count: 0 });
    setup();

    await user.type(screen.getByLabelText(/Procedure code/i), '992');

    await waitFor(() => {
      expect(searchBillingCodes).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: '992', type: 'cpt' }),
      );
    });
  });
});
