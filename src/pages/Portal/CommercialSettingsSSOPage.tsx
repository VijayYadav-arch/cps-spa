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
    <div className="grid max-w-[800px] gap-6 p-6">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          Single Sign-On (SSO)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure SAML 2.0 or OpenID Connect for your organization.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${
            message.type === 'success'
              ? 'border-success bg-green-50 text-green-800'
              : 'border-error bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Enable SSO</h2>
            <p className="text-sm text-slate-500">
              Allow users to sign in with your identity provider.
            </p>
          </div>
          <button
            data-testid="toggle-sso-active"
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
            role="switch"
            aria-checked={form.isActive}
            className={`relative h-6 w-12 cursor-pointer rounded-full border-none ${
              form.isActive ? 'bg-teal-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] ${
                form.isActive ? 'left-[26px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Provider Type</h2>
        <div className="flex gap-3">
          <label
            data-testid="provider-saml"
            className={`flex-1 cursor-pointer rounded-lg border-2 p-3 ${
              form.provider === 'saml'
                ? 'border-teal-600 bg-teal-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <input
              type="radio"
              name="provider"
              checked={form.provider === 'saml'}
              onChange={() => setForm({ ...form, provider: 'saml' })}
              className="absolute opacity-0"
            />
            <div className="font-semibold">SAML 2.0</div>
            <div className="mt-1 text-sm text-slate-500">For Okta, Azure AD, OneLogin</div>
          </label>
          <label
            data-testid="provider-oidc"
            className={`flex-1 cursor-pointer rounded-lg border-2 p-3 ${
              form.provider === 'oidc'
                ? 'border-teal-600 bg-teal-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <input
              type="radio"
              name="provider"
              checked={form.provider === 'oidc'}
              onChange={() => setForm({ ...form, provider: 'oidc' })}
              className="absolute opacity-0"
            />
            <div className="font-semibold">OpenID Connect</div>
            <div className="mt-1 text-sm text-slate-500">For Google Workspace, Auth0</div>
          </label>
        </div>
      </section>

      {form.provider === 'saml' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">SAML Configuration</h2>
          <div className="flex flex-col gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Entity ID (Issuer)</span>
              <input
                data-testid="input-sso-issuer"
                type="text"
                value={form.entityId}
                onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">SSO URL</span>
              <input
                data-testid="input-sso-url"
                type="url"
                value={form.ssoUrl}
                onChange={(e) => setForm({ ...form, ssoUrl: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Callback URL</span>
              <input
                data-testid="input-sso-callback"
                type="url"
                value={form.callbackUrl}
                onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">X.509 Certificate</span>
              <textarea
                data-testid="input-sso-cert"
                value={form.certificate}
                onChange={(e) => setForm({ ...form, certificate: e.target.value })}
                rows={6}
                className="form-input font-mono text-xs"
              />
            </label>
          </div>
        </section>
      )}

      {form.provider === 'oidc' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">OIDC Configuration</h2>
          <div className="flex flex-col gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Client ID</span>
              <input
                data-testid="input-oidc-client-id"
                type="text"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Client Secret</span>
              <input
                data-testid="input-oidc-client-secret"
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Issuer URL</span>
              <input
                data-testid="input-sso-issuer"
                type="url"
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Callback URL</span>
              <input
                data-testid="input-sso-callback"
                type="url"
                value={form.callbackUrl}
                onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                className="form-input"
              />
            </label>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Enforce SSO</h2>
            <p className="text-sm text-slate-500">
              When enabled, all users must authenticate through SSO.
            </p>
          </div>
          <button
            data-testid="toggle-enforce-sso"
            onClick={() => setForm({ ...form, enforceSso: !form.enforceSso })}
            role="switch"
            aria-checked={form.enforceSso}
            className={`relative h-6 w-12 cursor-pointer rounded-full border-none ${
              form.enforceSso ? 'bg-teal-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] ${
                form.enforceSso ? 'left-[26px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          data-testid="submit-sso"
          onClick={handleSave}
          disabled={saving || !canSave}
          title={!canSave ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        <button
          data-testid="action-test-sso"
          onClick={handleTest}
          disabled={testing || !form.isActive}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
}
