/**
 * Link-out to the dedicated documentation site (cps-docs / Starlight).
 *
 * Gated on the build-time env var VITE_DOCS_URL, mirroring the go-live gating pattern used
 * elsewhere: until ops sets it (once the docs.* domain is deployed), every docs link is hidden so
 * no dead link ships. Set e.g. VITE_DOCS_URL=https://docs.mira.ai to light them up.
 *
 * The in-app /help section is always available regardless; this only controls the external
 * "full documentation" deep-links.
 */
export function docsBaseUrl(): string | null {
  const raw = import.meta.env.VITE_DOCS_URL as string | undefined;
  if (!raw || raw.trim() === '') return null;
  return raw.trim().replace(/\/+$/, '');
}

/**
 * Absolute URL for a docs page, or null when docs links are not configured.
 * @param path e.g. "user-guide/administration/" (leading slash optional).
 */
export function docsUrl(path = ''): string | null {
  const base = docsBaseUrl();
  if (base === null) return null;
  const p = path.replace(/^\/+/, '');
  return p ? `${base}/${p}` : base;
}
