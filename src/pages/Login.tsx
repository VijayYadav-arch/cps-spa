// Phase 2 of MSAL-only cutover replaces this entire file.
// For Phase 1, the old password-based login form is stubbed out so the build
// passes. SSO redirect via loginWithSSO() replaces this UI in Phase 2.

export function Login() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360, padding: 32, border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>CPS Sign In</h1>
        <p style={{ color: '#64748b' }}>
          Sign-in is handled via SSO. If you are seeing this page, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
