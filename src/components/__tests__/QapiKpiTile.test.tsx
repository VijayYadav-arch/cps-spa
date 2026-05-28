import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QapiKpiTile } from '@/components/QapiKpiTile';

function renderTile(props: React.ComponentProps<typeof QapiKpiTile>) {
  return render(
    <MemoryRouter>
      <QapiKpiTile {...props} />
    </MemoryRouter>,
  );
}

describe('QapiKpiTile', () => {
  it('renders label and value', () => {
    renderTile({ label: 'Active PIPs', value: 7 });
    expect(screen.getByText('Active PIPs')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders as a link when linkTo is provided', () => {
    renderTile({ label: 'Active PIPs', value: 7, linkTo: '/quality/qapi/pips' });
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/quality/qapi/pips');
  });

  it('renders trend arrow and delta when trendDirection is set', () => {
    renderTile({ label: 'Falls', value: 3, delta: 2, trendDirection: 'up' });
    expect(screen.getByText(/↑/)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('renders down arrow for trendDirection=down', () => {
    renderTile({ label: 'Errors', value: 1, delta: 1, trendDirection: 'down' });
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it('does not render a link when linkTo is omitted', () => {
    renderTile({ label: 'Stat', value: 42 });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
