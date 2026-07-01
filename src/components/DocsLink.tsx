import type { ReactNode } from 'react';
import { docsUrl } from '@/config/docs';

/**
 * External link to a page on the documentation site. Renders nothing when docs links aren't
 * configured (VITE_DOCS_URL unset), so pages can embed a "learn more in the docs" link that simply
 * disappears until the docs site is deployed. Opens in a new tab.
 */
export function DocsLink({
  path = '',
  children,
  className,
}: {
  path?: string;
  children: ReactNode;
  className?: string;
}) {
  const href = docsUrl(path);
  if (href === null) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
