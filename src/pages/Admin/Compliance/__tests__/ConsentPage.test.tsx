import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsentPage } from '@/pages/Admin/Compliance/ConsentPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ConsentPage />
    </MemoryRouter>
  );
}

describe('ConsentPage', () => {
  it('renders heading + backend-pending notice', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /consent forms/i })).toBeInTheDocument();
    expect(screen.getByText(/backend pending/i)).toBeInTheDocument();
  });

  it('shows empty-state until backend ships', () => {
    renderPage();
    expect(screen.getByText(/no consent forms yet/i)).toBeInTheDocument();
  });
});
