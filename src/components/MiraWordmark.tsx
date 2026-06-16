import type { CSSProperties } from 'react';

/**
 * The Mira wordmark, inlined.
 *
 * The brand SVG draws "mıra" as <text font-family="Inter"> (only the amber
 * i-dot is a vector path). An SVG referenced via <img src> is sandboxed and
 * cannot use the page's web font, so the text failed to render. Inlining the
 * SVG into the DOM lets it use the document-loaded Inter font (see the font
 * <link> in index.html), so the wordmark renders reliably everywhere.
 *
 * Teal wordmark (#0d9488) reads on both the cream login canvas and the navy
 * sidebar. Size via `className` (e.g. "h-14 w-auto") or `style`.
 */
export function MiraWordmark({
  className,
  style,
  title = 'Mira',
}: {
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 80"
      role="img"
      aria-label={title}
      className={className}
      style={style}
    >
      <title>{title}</title>
      <text
        x="6"
        y="60"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 700,
          fontSize: '72px',
          letterSpacing: '-3.5px',
          fill: '#0d9488',
        }}
      >
        {'mıra'}
      </text>
      {/* Amber sentinel i-dot (vector — always renders). */}
      <path d="M 77 4 Q 77 13 86 13 Q 77 13 77 22 Q 77 13 68 13 Q 77 13 77 4 Z" fill="#f59e0b" />
    </svg>
  );
}

export default MiraWordmark;
