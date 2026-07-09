import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocsLink } from '@/components/DocsLink';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('DocsLink', () => {
  it('renders nothing when VITE_DOCS_URL is unset', () => {
    vi.stubEnv('VITE_DOCS_URL', '');
    const { container } = render(<DocsLink path="user-guide/administration/">Docs</DocsLink>);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an external link to the docs page when configured', () => {
    vi.stubEnv('VITE_DOCS_URL', 'https://docs.usemirahealth.com');
    render(<DocsLink path="user-guide/administration/">Go-live guide</DocsLink>);
    const link = screen.getByRole('link', { name: 'Go-live guide' });
    expect(link).toHaveAttribute('href', 'https://docs.usemirahealth.com/user-guide/administration/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('normalizes a trailing slash on the base and a leading slash on the path', () => {
    vi.stubEnv('VITE_DOCS_URL', 'https://docs.usemirahealth.com/');
    render(<DocsLink path="/user-guide/faq/">FAQ</DocsLink>);
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute(
      'href',
      'https://docs.usemirahealth.com/user-guide/faq/',
    );
  });

  it('links to the docs root when no path is given', () => {
    vi.stubEnv('VITE_DOCS_URL', 'https://docs.usemirahealth.com');
    render(<DocsLink>Documentation</DocsLink>);
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
      'href',
      'https://docs.usemirahealth.com',
    );
  });
});
