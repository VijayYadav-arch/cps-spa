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

  if (isLoading) return <div role="status" className="text-slate-500">Loading platform dashboard…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <h2 className="text-2xl">Platform Dashboard</h2>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex justify-between">
          <h3 className="text-lg font-semibold">API Keys ({apiKeys.filter((k) => k.isActive).length} active)</h3>
          <Link to="/platform/api-keys" className="font-medium text-teal-700 hover:underline">Manage</Link>
        </div>
        {apiKeys.length === 0 ? <p className="text-slate-500">No API keys.</p> : (
          <ul className="m-0 list-none p-0">
            {apiKeys.map((k) => (
              <li key={k.id} className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-700">{k.prefix}… <strong>{k.name}</strong></span>
                <span className={`text-xs font-semibold ${k.isActive ? 'text-green-800' : 'text-red-800'}`}>
                  {k.isActive ? 'Active' : 'Revoked'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex justify-between">
          <h3 className="text-lg font-semibold">Webhooks ({webhooks.filter((w) => w.isActive).length} active)</h3>
          <Link to="/platform/webhooks" className="font-medium text-teal-700 hover:underline">Manage</Link>
        </div>
        {webhooks.length === 0 ? <p className="text-slate-500">No webhooks configured.</p> : (
          <ul className="m-0 list-none p-0">
            {webhooks.map((w) => (
              <li key={w.id} className="border-b border-slate-100 py-2">
                <span className="font-mono text-sm text-slate-700">{w.url}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
