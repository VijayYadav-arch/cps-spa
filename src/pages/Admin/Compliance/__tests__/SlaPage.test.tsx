import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SlaPage } from '@/pages/Admin/Compliance/SlaPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SlaPage />
    </MemoryRouter>
  );
}

describe('SlaPage', () => {
  it('renders heading + backend-pending notice', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /sla monitor/i })).toBeInTheDocument();
    expect(screen.getByText(/backend pending/i)).toBeInTheDocument();
  });

  it('renders summary cards with defaults when no data', () => {
    renderPage();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('Met')).toBeInTheDocument();
  });

  it('shows no-incidents and no-uptime-data messages', () => {
    renderPage();
    expect(screen.getByText(/no incidents recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/no uptime data recorded/i)).toBeInTheDocument();
  });
});
