import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createWebhook,
  deleteWebhook,
  getWebhooks,
  getWebhookDeliveries,
  testWebhookSignature,
  type Webhook,
  type WebhookCreateResponse,
  type WebhookDeliveryAttempt,
} from '@/api/platform';

const PAGE_SIZE = 25;

const AVAILABLE_EVENTS = [
  'claim.submitted', 'claim.paid', 'claim.denied',
  'era.posted', 'workqueue.item_assigned',
  'ar_followup.note_added', 'ar_followup.bulk_notes_added',
  'eligibility.checked', 'prior_auth.decided',
];

function parseEvents(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch { return []; }
}

export function WebhooksPage() {
  const [rows, setRows] = useState<Webhook[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [createUrl, setCreateUrl] = useState('');
  const [createEvents, setCreateEvents] = useState<Set<string>>(new Set(['claim.paid']));
  const [createOrgId, setCreateOrgId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<WebhookCreateResponse | null>(null);

  // Deliveries panel
  const [deliveriesFor, setDeliveriesFor] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryAttempt[]>([]);

  // Test signature panel
  const [testSecret, setTestSecret] = useState('');
  const [testResult, setTestResult] = useState<{ payload: string; signature: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getWebhooks({ page, pageSize: PAGE_SIZE });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load webhooks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page]);

  const toggleEvent = (e: string) => {
    const next = new Set(createEvents);
    if (next.has(e)) next.delete(e);
    else next.add(e);
    setCreateEvents(next);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      if (!createUrl.trim() || createEvents.size === 0 || !createOrgId.trim()) {
        setError('URL, at least one event, and organization id are required');
        setCreating(false);
        return;
      }
      const res = await createWebhook({
        organizationId: Number(createOrgId),
        url: createUrl.trim(),
        events: [...createEvents],
      });
      setCreatedSecret(res);
      setCreateUrl('');
      setCreateEvents(new Set(['claim.paid']));
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Create failed';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (w: Webhook) => {
    if (!confirm(`Delete webhook for ${w.url}? Active subscriptions to this endpoint will stop receiving events.`)) {
      return;
    }
    try {
      await deleteWebhook(w.id);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Delete failed';
      setError(message);
    }
  };

  const loadDeliveries = async (w: Webhook) => {
    if (deliveriesFor?.id === w.id) {
      setDeliveriesFor(null);
      setDeliveries([]);
      return;
    }
    try {
      const res = await getWebhookDeliveries(w.id, 50);
      setDeliveries(res.data);
      setDeliveriesFor(w);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load deliveries';
      setError(message);
    }
  };

  const runSignatureTest = async () => {
    try {
      const res = await testWebhookSignature(testSecret);
      setTestResult(res);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Test failed';
      setError(message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Webhooks</h1>
          <p style={{ color: '#64748b', maxWidth: 720 }}>
            HTTPS endpoints that receive event deliveries for the events you
            subscribe to. The signing secret is returned ONCE on creation —
            store it immediately and use it to verify the
            <code style={{ margin: '0 4px' }}>X-CPS-Signature</code>header on each delivery.
          </p>
          <Link to="/platform" style={{ fontSize: 13 }}>← Platform dashboard</Link>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New webhook'}
        </button>
      </header>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}

      {createdSecret && (
        <div style={{
          padding: 16, marginBottom: 16, borderRadius: 8,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
        }}>
          <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8 }}>
            Webhook created · {createdSecret.url}
          </div>
          <div style={{ color: '#475569', fontSize: 13, marginBottom: 8 }}>
            Signing secret (shown once):
          </div>
          <code style={{
            display: 'block',
            padding: '8px 12px', background: '#fff',
            border: '1px solid #cbd5e1', borderRadius: 4,
            fontFamily: 'monospace', fontSize: 13,
            wordBreak: 'break-all',
          }}>
            {createdSecret.secret}
          </code>
          <button
            type="button"
            onClick={() => setCreatedSecret(null)}
            style={{ marginTop: 8 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
          marginBottom: 16, background: '#f8fafc',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
            <label>
              URL (HTTPS only)
              <input
                type="url"
                value={createUrl}
                onChange={(e) => setCreateUrl(e.target.value)}
                placeholder="https://partner.example.com/webhooks/cps"
                style={{ width: '100%' }}
              />
            </label>
            <label>
              Organization id
              <input
                type="number"
                value={createOrgId}
                onChange={(e) => setCreateOrgId(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Events</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AVAILABLE_EVENTS.map((e) => (
                <label
                  key={e}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 8px',
                    border: '1px solid ' + (createEvents.has(e) ? '#2563eb' : '#cbd5e1'),
                    background: createEvents.has(e) ? '#dbeafe' : '#fff',
                    borderRadius: 4, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createEvents.has(e)}
                    onChange={() => toggleEvent(e)}
                  />
                  {e}
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={creating}
            aria-busy={creating}
            onClick={() => { void handleCreate(); }}
            style={{ marginTop: 12 }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b', marginBottom: 16 }}>No webhooks configured.</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>URL</th>
              <th style={{ padding: 8 }}>Events</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const events = parseEvents(w.events);
              return (
                <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
                    {w.url}
                  </td>
                  <td style={{ padding: 8, fontSize: 13 }}>
                    {events.slice(0, 3).join(', ')}
                    {events.length > 3 && ` +${events.length - 3}`}
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      background: w.isActive ? '#dcfce7' : '#fee2e2',
                      color: w.isActive ? '#166534' : '#991b1b',
                    }}>
                      {w.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => { void loadDeliveries(w); }}
                      style={{ fontSize: 12 }}
                    >
                      {deliveriesFor?.id === w.id ? 'Hide' : 'Deliveries'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleDelete(w); }}
                      style={{ fontSize: 12, color: '#b91c1c' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {deliveriesFor && (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
          marginBottom: 16, background: '#f8fafc',
        }}>
          <h2 style={{ marginTop: 0 }}>Delivery history · {deliveriesFor.url}</h2>
          {deliveries.length === 0 ? (
            <p style={{ color: '#64748b' }}>No delivery attempts yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: 4 }}>Attempted</th>
                  <th style={{ padding: 4 }}>Event</th>
                  <th style={{ padding: 4 }}>Status</th>
                  <th style={{ padding: 4 }}>Duration</th>
                  <th style={{ padding: 4 }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 4, fontSize: 13 }}>{new Date(d.attemptedAt).toLocaleString()}</td>
                    <td style={{ padding: 4, fontSize: 13 }}>{d.eventType}</td>
                    <td style={{ padding: 4, fontSize: 13 }}>{d.responseStatus ?? '—'}</td>
                    <td style={{ padding: 4, fontSize: 13 }}>{d.durationMs ?? '—'} ms</td>
                    <td style={{ padding: 4, fontSize: 13, color: d.succeeded ? '#166534' : '#b91c1c' }}>
                      {d.succeeded ? 'ok' : (d.errorMessage ?? 'failed')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Signature test helper */}
      <div style={{
        border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
        background: '#fff',
      }}>
        <h2 style={{ marginTop: 0 }}>Verify your signing implementation</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Paste your webhook's signing secret to get a sample payload + the
          expected <code>X-CPS-Signature</code> header. If your implementation
          produces the same signature for that payload, your verification is
          correct.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={testSecret}
            onChange={(e) => setTestSecret(e.target.value)}
            placeholder="webhook signing secret"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
          />
          <button type="button" onClick={() => { void runSignatureTest(); }}>
            Generate
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <div style={{ marginBottom: 4 }}><strong>Payload:</strong></div>
            <pre style={{
              background: '#f1f5f9', padding: 8, borderRadius: 4,
              fontSize: 12, overflowX: 'auto', margin: 0,
            }}>
              {testResult.payload}
            </pre>
            <div style={{ marginTop: 8, marginBottom: 4 }}><strong>Expected signature:</strong></div>
            <code style={{
              display: 'block', background: '#f1f5f9', padding: 8,
              borderRadius: 4, fontSize: 12, wordBreak: 'break-all',
            }}>
              {testResult.signature}
            </code>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>Page {page} of {totalPages} · {total} webhooks</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
