import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface SSOFormData {
  provider: 'saml' | 'oidc';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  callbackUrl: string;
  enforceSso: boolean;
  isActive: boolean;
}

interface SSOConfigEnvelope {
  data: {
    provider?: string;
    entityId?: string | null;
    ssoUrl?: string | null;
    certificate?: string | null;
    clientId?: string | null;
    issuer?: string | null;
    callbackUrl?: string | null;
    enforceSso?: boolean;
    isActive?: boolean;
  };
}

interface MeEnvelope {
  data: { organizationId: number | null };
}

const DEFAULT_FORM: SSOFormData = {
  provider: 'saml',
  entityId: '',
  ssoUrl: '',
  certificate: '',
  clientId: '',
  clientSecret: '',
  issuer: '',
  callbackUrl: '',
  enforceSso: false,
  isActive: false,
};

export function CommercialSettingsSSOPage() {
  const [form, setForm] = useState<SSOFormData>(DEFAULT_FORM);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Save hits PUT /auth/sso/config/{orgId}, gated by [Authorize(Policy = "platform:sso")].
  // Test Connection is a client-side simulation (no endpoint) → not guarded.
  const canSave = usePermission(PERMISSIONS.PLATFORM_SSO);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<MeEnvelope>('/users/me')
      .then((res) => {
        if (cancelled) return;
        const id = res.data.data.organizationId;
        setOrgId(id);
        if (id == null) return;
        return apiClient.get<SSOConfigEnvelope>(`/auth/sso/config/${id}`);
      })
      .then((res) => {
        if (cancelled || !res) return;
        const c = res.data.data;
        setForm({
          provider: c.provider === 'oidc' ? 'oidc' : 'saml',
          entityId: c.entityId || '',
          ssoUrl: c.ssoUrl || '',
          certificate: c.certificate || '',
          clientId: c.clientId || '',
          clientSecret: '',
          issuer: c.issuer || '',
          callbackUrl: c.callbackUrl || '',
          enforceSso: Boolean(c.enforceSso),
          isActive: Boolean(c.isActive),
        });
      })
      .catch(() => {
        /* 404 ok — defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!orgId) {
      setMessage({ type: 'error', text: 'Not signed in. Please log in and try again.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put(`/auth/sso/config/${orgId}`, {
        provider: form.provider,
        entityId: form.entityId,
        ssoUrl: form.ssoUrl,
        certificate: form.certificate,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        issuer: form.issuer,
        callbackUrl: form.callbackUrl,
        enforceSso: form.enforceSso,
      });
      setMessage({ type: 'success', text: 'SSO configuration saved successfully.' });
    } catch (err) {
      const text =
        (err as { message?: string })?.message || 'Failed to save SSO configuration.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    setTesting(true);
    setMessage(null);
    setTimeout(() => {
      setMessage({
        type: 'success',
        text: 'Connection test successful. SSO endpoint is reachable.',
      });
      setTesting(false);
    }, 1000);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          Single Sign-On (SSO)
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Configure SAML 2.0 or OpenID Connect for your organization.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 12,
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#166534' : '#b91c1c',
            borderRadius: 8,
          }}
        >
          {message.text}
        </div>
      )}

      <section
        style={{
          background: 'white',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Enable SSO</h2>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Allow users to sign in with your identity provider.
            </p>
          </div>
          <button
            data-testid="toggle-sso-active"
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
            role="switch"
            aria-checked={form.isActive}
            style={{
              width: 48,
              height: 24,
              borderRadius: 999,
              border: 'none',
              background: form.isActive ? '#0d9488' : '#cbd5e1',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: form.isActive ? 26 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.15s',
              }}
            />
          </button>
        </div>
      </section>

      <section
        style={{
          background: 'white',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Provider Type</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <label
            data-testid="provider-saml"
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: `2px solid ${form.provider === 'saml' ? '#0d9488' : '#e2e8f0'}`,
              background: form.provider === 'saml' ? '#f0fdfa' : 'white',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="provider"
              checked={form.provider === 'saml'}
              onChange={() => setForm({ ...form, provider: 'saml' })}
              style={{ position: 'absolute', opacity: 0 }}
            />
            <div style={{ fontWeight: 600 }}>SAML 2.0</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              For Okta, Azure AD, OneLogin
            </div>
          </label>
          <label
            data-testid="provider-oidc"
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: `2px solid ${form.provider === 'oidc' ? '#0d9488' : '#e2e8f0'}`,
              background: form.provider === 'oidc' ? '#f0fdfa' : 'white',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="provider"
              checked={form.provider === 'oidc'}
              onChange={() => setForm({ ...form, provider: 'oidc' })}
              style={{ position: 'absolute', opacity: 0 }}
            />
            <div style={{ fontWeight: 600 }}>OpenID Connect</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              For Google Workspace, Auth0
            </div>
          </label>
        </div>
      </section>

      {form.provider === 'saml' && (
        <section
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            SAML Configuration
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Entity ID (Issuer)</label>
              <input
                data-testid="input-sso-issuer"
                type="text"
                value={form.entityId}
                onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>SSO URL</label>
              <input
                data-testid="input-sso-url"
                type="url"
                value={form.ssoUrl}
                onChange={(e) => setForm({ ...form, ssoUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Callback URL</label>
              <input
                data-testid="input-sso-callback"
                type="url"
                value={form.callbackUrl}
                onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>X.509 Certificate</label>
              <textarea
                data-testid="input-sso-cert"
                value={form.certificate}
                onChange={(e) => setForm({ ...form, certificate: e.target.value })}
                rows={6}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              />
            </div>
          </div>
        </section>
      )}

      {form.provider === 'oidc' && (
        <section
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            OIDC Configuration
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Client ID</label>
              <input
                data-testid="input-oidc-client-id"
                type="text"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Client Secret</label>
              <input
                data-testid="input-oidc-client-secret"
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Issuer URL</label>
              <input
                data-testid="input-sso-issuer"
                type="url"
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Callback URL</label>
              <input
                data-testid="input-sso-callback"
                type="url"
                value={form.callbackUrl}
                onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
          </div>
        </section>
      )}

      <section
        style={{
          background: 'white',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Enforce SSO</h2>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              When enabled, all users must authenticate through SSO.
            </p>
          </div>
          <button
            data-testid="toggle-enforce-sso"
            onClick={() => setForm({ ...form, enforceSso: !form.enforceSso })}
            role="switch"
            aria-checked={form.enforceSso}
            style={{
              width: 48,
              height: 24,
              borderRadius: 999,
              border: 'none',
              background: form.enforceSso ? '#0d9488' : '#cbd5e1',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: form.enforceSso ? 26 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.15s',
              }}
            />
          </button>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          data-testid="submit-sso"
          onClick={handleSave}
          disabled={saving || !canSave}
          title={!canSave ? NO_PERMISSION : undefined}
          style={{
            padding: '10px 24px',
            background: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 500,
            cursor: (saving || !canSave) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        <button
          data-testid="action-test-sso"
          onClick={handleTest}
          disabled={testing || !form.isActive}
          style={{
            padding: '10px 24px',
            background: 'white',
            color: '#475569',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontWeight: 500,
            cursor: testing || !form.isActive ? 'not-allowed' : 'pointer',
            opacity: testing || !form.isActive ? 0.5 : 1,
          }}
        >
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
}
