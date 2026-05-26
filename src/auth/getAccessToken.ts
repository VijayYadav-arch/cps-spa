/**
 * Module-scoped accessor that decouples axios from React state. AuthContext
 * registers its token provider on mount; apiClient calls getAccessToken()
 * in the request interceptor.
 *
 * Returns null when no provider is registered or when the provider throws.
 * Production code should never throw from the provider, but defensive
 * null-return prevents one slow API call from corrupting request state.
 */
type Provider = () => string | null | Promise<string | null>;

let _provider: Provider | null = null;

export function setAccessTokenProvider(fn: Provider): void {
  _provider = fn;
}

export async function getAccessToken(): Promise<string | null> {
  if (!_provider) return null;
  try {
    const result = _provider();
    return await Promise.resolve(result);
  } catch {
    return null;
  }
}

/** Test-only — reset between tests. */
export function _resetAccessTokenProviderForTests(): void {
  _provider = null;
}
