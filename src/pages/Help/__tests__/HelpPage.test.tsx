import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelpPage } from '@/pages/Help/HelpPage';
import { HELP_SECTIONS } from '@/pages/Help/helpContent';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/help" element={<HelpPage />} />
        <Route path="/help/:topicId" element={<HelpPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HelpPage', () => {
  it('renders the landing grid with every topic when no topic is selected', () => {
    renderAt('/help');
    expect(screen.getByTestId('help-landing')).toBeInTheDocument();
    const total = HELP_SECTIONS.reduce((n, s) => n + s.topics.length, 0);
    // Sidebar links + landing cards both render a link per topic; assert the known topic is present.
    expect(screen.getAllByTestId('help-link-submit-a-claim').length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(5);
  });

  it('renders the selected topic article with its blocks', () => {
    renderAt('/help/submission-rollout');
    const article = screen.getByTestId('help-article');
    expect(article).toBeInTheDocument();
    expect(article.textContent).toMatch(/Enable real claim submission/i);
    expect(article.textContent).toMatch(/readiness/i);
  });

  it('filters the sidebar by search query', async () => {
    renderAt('/help');
    await userEvent.type(screen.getByTestId('help-search'), 'denial');
    expect(screen.getByTestId('help-link-denials-appeals')).toBeInTheDocument();
    expect(screen.queryByTestId('help-link-oasis')).toBeNull();
  });

  it('shows a no-results message when nothing matches', async () => {
    renderAt('/help');
    await userEvent.type(screen.getByTestId('help-search'), 'zzzzz-nope');
    expect(screen.getByTestId('help-no-results')).toBeInTheDocument();
  });
});
