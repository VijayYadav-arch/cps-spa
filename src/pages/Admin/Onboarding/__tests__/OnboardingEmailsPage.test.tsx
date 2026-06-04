import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingEmailsPage } from '@/pages/Admin/Onboarding/OnboardingEmailsPage';
import { getWelcomeSequence } from '@/data/onboardingEmailTemplates';

function renderPage() {
  return render(
    <MemoryRouter>
      <OnboardingEmailsPage />
    </MemoryRouter>
  );
}

describe('OnboardingEmailsPage', () => {
  it('renders heading + back link to onboarding', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /email templates/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to onboarding/i })).toHaveAttribute(
      'href',
      '/admin/onboarding'
    );
  });

  it('renders summary card with total template count', () => {
    renderPage();
    const total = getWelcomeSequence().length;
    expect(screen.getByTestId('email-summary')).toHaveTextContent(String(total));
  });

  it('renders every template subject', () => {
    renderPage();
    for (const t of getWelcomeSequence()) {
      expect(screen.getAllByText(t.subject).length).toBeGreaterThan(0);
    }
  });

  it('substitutes template variables in preview', () => {
    renderPage();
    expect(screen.getAllByText(/John/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sample Hospice/).length).toBeGreaterThan(0);
  });
});
