import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

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
    <div style={{ padding: '1rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          White-Label Branding
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Customize your portal appearance for your organization.
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Logo</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Logo URL</label>
              <input
                data-testid="input-logo-url"
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.svg"
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
              <label style={{ fontSize: 12, fontWeight: 500 }}>Favicon URL</label>
              <input
                data-testid="input-favicon-url"
                type="url"
                value={form.faviconUrl}
                onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
          </section>

          <section
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Brand Colors</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Primary</label>
                <input
                  data-testid="input-primary-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  style={{ width: '100%', height: 40, marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Secondary</label>
                <input
                  data-testid="input-secondary-color"
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  style={{ width: '100%', height: 40, marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Accent</label>
                <input
                  data-testid="input-accent-color"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  style={{ width: '100%', height: 40, marginTop: 4 }}
                />
              </div>
            </div>
          </section>

          <section
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Typography</h2>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Font Family</label>
            <select
              data-testid="input-font-family"
              value={form.fontFamily}
              onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                marginTop: 4,
              }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </section>

          <section
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Custom Domain</h2>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Domain</label>
            <input
              data-testid="input-custom-domain"
              type="text"
              value={form.customDomain}
              onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
              placeholder="portal.yourdomain.com"
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                marginTop: 4,
              }}
            />
          </section>

          <section
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Custom Text</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Login Page Message</label>
              <textarea
                data-testid="input-login-message"
                value={form.loginMessage}
                onChange={(e) => setForm({ ...form, loginMessage: e.target.value })}
                rows={3}
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
              <label style={{ fontSize: 12, fontWeight: 500 }}>Support Email</label>
              <input
                data-testid="input-support-email"
                type="email"
                value={form.footerText}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
          </section>

          <button
            data-testid="submit-branding"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 500,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </div>

        <div>
          <div
            data-testid="preview-banner"
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              position: 'sticky',
              top: 16,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Preview</h2>
            <div
              style={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                fontFamily: form.fontFamily,
              }}
            >
              <div style={{ padding: 12, background: form.secondaryColor, color: 'white' }}>
                {form.logoUrl ? 'Custom Logo' : 'Your Organization'}
              </div>
              <div style={{ padding: 12, background: '#f8fafc' }}>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: form.primaryColor,
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    height: 4,
                    width: '40%',
                    borderRadius: 2,
                    background: form.accentColor,
                  }}
                />
              </div>
              <div style={{ padding: 8, background: '#f1f5f9', fontSize: 11, color: '#94a3b8' }}>
                {form.footerText || 'Footer text'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
