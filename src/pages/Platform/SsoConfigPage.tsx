import { useEffect, useState } from 'react';
import {
  getSsoConfig,
  upsertSsoConfig,
  deleteSsoConfig,
  generateScimToken,
  revokeScimToken,
  type SsoConfigRequest,
} from '@/api/ssoAdmin';
import { getOrganizations, type Organization } from '@/api/admin';

type Provider = 'saml' | 'oidc';

interface FormState {
  provider: Provider;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  scopes: string;
  enforceSso: boolean;
}

const blank: FormState = {
  provider: 'saml', entityId: '', ssoUrl: '', certificate: '',
  clientId: '', clientSecret: '', issuer: '', scopes: '', enforceSso: false,
};

export function SsoConfigPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState('');
  const [form, setForm] = useState<FormState>(blank);
  const [hasConfig, setHasConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [scimToken, setScimToken] = useState<string | null>(null);

  useEffect(() => {
    // Org picker is best-effort — falls back to a numeric orgId input if the list
    // isn't reachable for this operator.
    getOrganizations({ pageSize: 200 }).then((r) => setOrgs(r.data)).catch(() => undefined);
  }, []);

  async function loadConfig(id: number) {
    setLoading(true);
    setError(null);
    setMsg(null);
    setScimToken(null);
    try {
      const cfg = await getSsoConfig(id);
      if (cfg) {
        setHasConfig(true);
        setForm({
          provider: (cfg.provider as Provider) || 'saml',
          entityId: cfg.entityId ?? '',
          ssoUrl: cfg.ssoUrl ?? '',
          certificate: cfg.certificate ?? '',
          clientId: cfg.clientId ?? '',
          clientSecret: '', // never prefilled (masked server-side); blank keeps existing
          issuer: cfg.issuer ?? '',
          scopes: cfg.scopes ?? '',
          enforceSso: cfg.enforceSso,
        });
      } else {
        setHasConfig(false);
        setForm(blank);
      }
    } catch {
      setError('Could not load the SSO configuration.');
    } finally {
      setLoading(false);
    }
  }

  function selectOrg(value: string) {
    setOrgId(value);
    const id = Number(value);
    if (id > 0) void loadConfig(id);
  }

  const id = Number(orgId);
  const orgChosen = id > 0;

  async function handleSave() {
    if (!orgChosen) return;
    setBusy(true); setError(null); setMsg(null);
    try {
      const req: SsoConfigRequest = {
        provider: form.provider,
        entityId: form.entityId || null,
        ssoUrl: form.ssoUrl || null,
        certificate: form.certificate || null,
        clientId: form.clientId || null,
        clientSecret: form.clientSecret || null, // blank → keep existing
        issuer: form.issuer || null,
        scopes: form.scopes || null,
        enforceSso: form.enforceSso,
      };
      await upsertSsoConfig(id, req);
      setMsg('SSO configuration saved.');
      void loadConfig(id);
    } catch (e) {
      setError(extractErr(e, 'Could not save the SSO configuration.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!orgChosen || !window.confirm('Delete the SSO configuration for this org?')) return;
    setBusy(true); setError(null); setMsg(null);
    try {
      await deleteSsoConfig(id);
      setHasConfig(false);
      setForm(blank);
      setMsg('SSO configuration deleted.');
    } catch (e) {
      setError(extractErr(e, 'Could not delete the SSO configuration.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateScim() {
    if (!orgChosen) return;
    setBusy(true); setError(null); setMsg(null); setScimToken(null);
    try {
      const { token } = await generateScimToken(id);
      setScimToken(token);
    } catch (e) {
      setError(extractErr(e, 'Could not generate a SCIM token (save the SSO config first).'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeScim() {
    if (!orgChosen) return;
    setBusy(true); setError(null);
    try {
      await revokeScimToken(id);
      setScimToken(null);
      setMsg('SCIM token revoked.');
    } catch (e) {
      setError(extractErr(e, 'Could not revoke the SCIM token.'));
    } finally {
      setBusy(false);
    }
  }

  const isSaml = form.provider === 'saml';

  return (
    <div className="grid max-w-[900px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">SSO &amp; SCIM Configuration</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Configure SAML/OIDC single sign-on and SCIM provisioning on behalf of a customer
          organization. (Operator surface — customers manage their own SSO from the portal.)
        </p>
      </header>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-600">Organization</span>
        {orgs.length > 0 ? (
          <select value={orgId} onChange={(e) => selectOrg(e.target.value)} className="form-input w-80">
            <option value="">Select an organization…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>
            ))}
          </select>
        ) : (
          <input
            type="number" min="1" placeholder="Organization ID"
            value={orgId} onChange={(e) => selectOrg(e.target.value)} className="form-input w-48"
          />
        )}
      </label>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{msg}</div>}

      {orgChosen && (loading ? (
        <div role="status" className="text-slate-500">Loading…</div>
      ) : (
        <>
          <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{hasConfig ? 'Edit SSO' : 'New SSO configuration'}</h3>
              {hasConfig && (
                <button onClick={handleDelete} disabled={busy}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                  Delete config
                </button>
              )}
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Provider</span>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as Provider })} className="form-input w-40">
                <option value="saml">SAML</option>
                <option value="oidc">OIDC</option>
              </select>
            </label>

            {isSaml ? (
              <>
                <Field label="IdP Entity ID" value={form.entityId} onChange={(v) => setForm({ ...form, entityId: v })} />
                <Field label="IdP SSO URL" value={form.ssoUrl} onChange={(v) => setForm({ ...form, ssoUrl: v })} />
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Signing certificate (PEM)</span>
                  <textarea value={form.certificate} onChange={(e) => setForm({ ...form, certificate: e.target.value })} rows={4} className="form-input font-mono text-xs" />
                </label>
              </>
            ) : (
              <>
                <Field label="Issuer (discovery URL)" value={form.issuer} onChange={(v) => setForm({ ...form, issuer: v })} />
                <Field label="Client ID" value={form.clientId} onChange={(v) => setForm({ ...form, clientId: v })} />
                <Field label="Client secret" value={form.clientSecret} onChange={(v) => setForm({ ...form, clientSecret: v })}
                  placeholder={hasConfig ? 'leave blank to keep existing' : ''} type="password" />
                <Field label="Scopes" value={form.scopes} onChange={(v) => setForm({ ...form, scopes: v })} placeholder="openid profile email" />
              </>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.enforceSso} onChange={(e) => setForm({ ...form, enforceSso: e.target.checked })} />
              Enforce SSO (block password login for this org)
            </label>

            <div>
              <button onClick={handleSave} disabled={busy} className="btn-primary disabled:opacity-60">
                {busy ? 'Saving…' : 'Save SSO configuration'}
              </button>
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">SCIM provisioning</h3>
            <p className="text-sm text-slate-500">
              Issue a bearer token for the IdP's SCIM client. Requires a saved SSO config.
              The token is shown once.
            </p>
            {scimToken && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800">SCIM token — copy now, it won't be shown again:</p>
                <p className="mt-1 break-all font-mono text-xs text-green-900">{scimToken}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleGenerateScim} disabled={busy}
                className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
                Generate / rotate token
              </button>
              <button onClick={handleRevokeScim} disabled={busy}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Revoke token
              </button>
            </div>
          </section>
        </>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="form-input" />
    </label>
  );
}

function extractErr(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}
