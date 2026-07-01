import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumb } from '@/components/Breadcrumb';

describe('Breadcrumb', () => {
  it('links earlier crumbs and renders the last as the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: 'Clinical', to: '/clinical' }, { label: 'My Visits', to: '/clinician/visits' }, { label: 'Visit' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Clinical' })).toHaveAttribute('href', '/clinical');
    expect(screen.getByRole('link', { name: 'My Visits' })).toHaveAttribute('href', '/clinician/visits');
    // last crumb is not a link and marks the current page
    expect(screen.queryByRole('link', { name: 'Visit' })).toBeNull();
    expect(screen.getByText('Visit')).toHaveAttribute('aria-current', 'page');
  });
});
