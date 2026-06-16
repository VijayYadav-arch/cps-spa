import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface BrandingFormData {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customDomain: string;
  loginMessage: string;
  footerText: string;
}

interface BrandingEnvelope {
  data: {
    organizationId?: number;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    fontFamily?: string | null;
    customDomain?: string | null;
    loginMessage?: string | null;
    footerText?: string | null;
    message?: string;
  };
}

interface MeEnvelope {
  data: { organizationId: number | null };
}

const DEFAULT_FORM: BrandingFormData = {
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#0d9488',
  secondaryColor: '#1e293b',
  accentColor: '#f59e0b',
  fontFamily: 'Inter',
  customDomain: '',
  loginMessage: '',
  footerText: '',
};

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Montserrat',
  'Source Sans Pro',
  'Nunito',
];

export function CommercialSettingsBrandingPage() {
  const [form, setForm] = useState<BrandingFormData>(DEFAULT_FORM);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Save hits PUT /branding/{orgId}, gated by [Authorize(Policy = "portal:branding")].
  const canSave = usePermission(PERMISSIONS.PORTAL_BRANDING);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<MeEnvelope>('/users/me')
      .then((res) => {
        if (cancelled) return;
        const id = res.data.data.organizationId;
        setOrgId(id);
        if (id == null) return;
        return apiClient.get<BrandingEnvelope>(`/branding/${id}`);
      })
      .then((res) => {
        if (cancelled || !res) return;
        const b = res.data.data;
        if (b && !b.message) {
          setForm({
            logoUrl: b.logoUrl || '',
            faviconUrl: b.faviconUrl || '',
            primaryColor: b.primaryColor || '#0d9488',
            secondaryColor: b.secondaryColor || '#1e293b',
            accentColor: b.accentColor || '#f59e0b',
            fontFamily: b.fontFamily || 'Inter',
            customDomain: b.customDomain || '',
            loginMessage: b.loginMessage || '',
            footerText: b.footerText || '',
          });
        }
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
      await apiClient.put(`/branding/${orgId}`, {
        logoUrl: form.logoUrl,
        faviconUrl: form.faviconUrl,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        customDomain: form.customDomain,
        welcomeMessage: form.loginMessage,
        supportEmail: form.footerText,
      });
      setMessage({ type: 'success', text: 'Branding settings saved successfully.' });
    } catch (err) {
      const text =
        (err as { message?: string })?.message || 'Failed to save branding settings.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid max-w-[1000px] gap-6 p-6">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          White-Label Branding
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Customize your portal appearance for your organization.
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

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Logo</h2>
            <label className="mb-3 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Logo URL</span>
              <input
                data-testid="input-logo-url"
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.svg"
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Favicon URL</span>
              <input
                data-testid="input-favicon-url"
                type="url"
                value={form.faviconUrl}
                onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                className="form-input"
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Brand Colors</h2>
            <div className="grid grid-cols-3 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Primary</span>
                <input
                  data-testid="input-primary-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-full"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Secondary</span>
                <input
                  data-testid="input-secondary-color"
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-10 w-full"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Accent</span>
                <input
                  data-testid="input-accent-color"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="h-10 w-full"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Typography</h2>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Font Family</span>
              <select
                data-testid="input-font-family"
                value={form.fontFamily}
                onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
                className="form-input"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Custom Domain</h2>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Domain</span>
              <input
                data-testid="input-custom-domain"
                type="text"
                value={form.customDomain}
                onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                placeholder="portal.yourdomain.com"
                className="form-input"
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Custom Text</h2>
            <label className="mb-3 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Login Page Message</span>
              <textarea
                data-testid="input-login-message"
                value={form.loginMessage}
                onChange={(e) => setForm({ ...form, loginMessage: e.target.value })}
                rows={3}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Support Email</span>
              <input
                data-testid="input-support-email"
                type="email"
                value={form.footerText}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                className="form-input"
              />
            </label>
          </section>

          <button
            data-testid="submit-branding"
            onClick={handleSave}
            disabled={saving || !canSave}
            title={!canSave ? NO_PERMISSION : undefined}
            className="btn-primary self-start disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </div>

        <div>
          <div
            data-testid="preview-banner"
            className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-3 text-lg font-semibold">Preview</h2>
            <div
              className="overflow-hidden rounded-lg border border-slate-200"
              style={{ fontFamily: form.fontFamily }}
            >
              <div className="p-3 text-white" style={{ background: form.secondaryColor }}>
                {form.logoUrl ? 'Custom Logo' : 'Your Organization'}
              </div>
              <div className="bg-slate-50 p-3">
                <div
                  className="mb-2 h-1 rounded-sm"
                  style={{ background: form.primaryColor }}
                />
                <div
                  className="h-1 w-2/5 rounded-sm"
                  style={{ background: form.accentColor }}
                />
              </div>
              <div className="bg-slate-100 p-2 text-xs text-slate-400">
                {form.footerText || 'Footer text'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
