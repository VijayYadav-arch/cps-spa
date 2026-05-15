import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiKeys, getWebhooks, type ApiKey, type Webhook } from '@/api/platform';

export function PlatformDashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getApiKeys({ pageSize: 5 }), getWebhooks({ pageSize: 5 })])
      .then(([keys, hooks]) => {
        if (!cancelled) {
          setApiKeys(keys.data);
          setWebhooks(hooks.data);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load platform data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div role="status">Loading platform dashboard…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Platform Dashboard</h2>

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 600 }}>API Keys ({apiKeys.filter((k) => k.isActive).length} active)</h3>
          <Link to="/platform/api-keys" style={{ color: '#2563eb', fontSize: 14 }}>Manage</Link>
        </div>
        {apiKeys.length === 0 ? <p style={{ color: '#64748b' }}>No API keys.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {apiKeys.map((k) => (
              <li key={k.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                <span>{k.prefix}… <strong>{k.name}</strong></span>
                <span style={{ fontSize: 12, color: k.isActive ? '#166534' : '#991b1b' }}>
                  {k.isActive ? 'Active' : 'Revoked'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 600 }}>Webhooks ({webhooks.filter((w) => w.isActive).length} active)</h3>
          <Link to="/platform/webhooks" style={{ color: '#2563eb', fontSize: 14 }}>Manage</Link>
        </div>
        {webhooks.length === 0 ? <p style={{ color: '#64748b' }}>No webhooks configured.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {webhooks.map((w) => (
              <li key={w.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{w.url}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
