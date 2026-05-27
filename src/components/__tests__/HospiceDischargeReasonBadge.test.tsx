import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HospiceDischargeReasonBadge } from '@/components/HospiceDischargeReasonBadge';

describe('HospiceDischargeReasonBadge', () => {
  it('renders Transfer label', () => {
    render(<HospiceDischargeReasonBadge reason="Transfer" />);
    expect(screen.getByText(/transfer/i)).toBeInTheDocument();
  });

  it('renders OutOfServiceArea as "Out of Area"', () => {
    render(<HospiceDischargeReasonBadge reason="OutOfServiceArea" />);
    expect(screen.getByText(/out of area/i)).toBeInTheDocument();
  });

  it('renders ForCause with warning class', () => {
    render(<HospiceDischargeReasonBadge reason="ForCause" />);
    expect(screen.getByText(/for cause/i).className).toMatch(/warning|danger|red/i);
  });

  it('renders NoLongerTerminal', () => {
    render(<HospiceDischargeReasonBadge reason="NoLongerTerminal" />);
    expect(screen.getByText(/no longer terminal/i)).toBeInTheDocument();
  });

  it('renders AgencyClosure', () => {
    render(<HospiceDischargeReasonBadge reason="AgencyClosure" />);
    expect(screen.getByText(/agency closure/i)).toBeInTheDocument();
  });
});
