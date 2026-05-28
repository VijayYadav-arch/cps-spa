import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdverseEventBadge } from '@/components/AdverseEventBadge';

describe('AdverseEventBadge', () => {
  it('renders "Critical" label with badge-danger class when severity=Critical', () => {
    render(<AdverseEventBadge severity="Critical" />);
    const badge = screen.getByText('Critical');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('badge-danger');
  });

  it('renders "Minor" label with badge-neutral class', () => {
    render(<AdverseEventBadge severity="Minor" />);
    const badge = screen.getByText('Minor');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('badge-neutral');
  });

  it('renders "Moderate" label with badge-info class', () => {
    render(<AdverseEventBadge severity="Moderate" />);
    const badge = screen.getByText('Moderate');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('badge-info');
  });
});
