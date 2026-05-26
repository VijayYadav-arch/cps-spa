// Phase 2 rewrite: these tests covered the old password-based Login form.
// The form was stubbed in Phase 1 (MSAL-only cutover); Phase 2 will replace
// Login.tsx with an SSO-redirect page and rewrite these tests accordingly.
import { describe, it } from 'vitest';

describe('Login page', () => {
  it.skip('renders email and password inputs', () => {
    // Phase 2 rewrite
  });

  it.skip('calls login() with entered credentials on submit', () => {
    // Phase 2 rewrite
  });

  it.skip('redirects to / on successful login', () => {
    // Phase 2 rewrite
  });

  it.skip('shows error message on login failure', () => {
    // Phase 2 rewrite
  });
});
