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
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

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

  // Button-level permission gate. Create + Delete both hit the WebhooksController,
  // which is gated by the platform:webhooks policy. The Deliveries (GET), signature
  // Generate (pure compute), and pagination buttons are not state-changing — no guard.
  const canManage = usePermission(PERMISSIONS.PLATFORM_WEBHOOKS);

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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl">Webhooks</h1>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            HTTPS endpoints that receive event deliveries for the events you
            subscribe to. The signing secret is returned ONCE on creation —
            store it immediately and use it to verify the
            <code className="mx-1 font-mono">X-CPS-Signature</code>header on each delivery.
          </p>
          <Link to="/platform" className="font-medium text-teal-700 hover:underline">← Platform dashboard</Link>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New webhook'}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      {createdSecret && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3">
          <div className="mb-2 font-semibold text-green-800">
            Webhook created · {createdSecret.url}
          </div>
          <div className="mb-2 text-sm text-slate-600">
            Signing secret (shown once):
          </div>
          <code className="block break-all rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm">
            {createdSecret.secret}
          </code>
          <button
            type="button"
            onClick={() => setCreatedSecret(null)}
            className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-[1fr_200px] gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">URL (HTTPS only)</span>
              <input
                type="url"
                value={createUrl}
                onChange={(e) => setCreateUrl(e.target.value)}
                placeholder="https://partner.example.com/webhooks/cps"
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Organization id</span>
              <input
                type="number"
                value={createOrgId}
                onChange={(e) => setCreateOrgId(e.target.value)}
                className="form-input"
              />
            </label>
          </div>
          <div className="mt-3">
            <div className="mb-1 text-xs text-slate-600">Events</div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((e) => (
                <label
                  key={e}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-sm ${
                    createEvents.has(e)
                      ? 'border-blue-600 bg-blue-100'
                      : 'border-slate-300 bg-white'
                  }`}
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
            disabled={creating || !canManage}
            aria-busy={creating}
            title={!canManage ? NO_PERMISSION : undefined}
            onClick={() => { void handleCreate(); }}
            className="btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No webhooks configured.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const events = parseEvents(w.events);
                return (
                  <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="break-all px-4 py-3 font-mono text-sm text-slate-700">
                      {w.url}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {events.slice(0, 3).join(', ')}
                      {events.length > 3 && ` +${events.length - 3}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        w.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {w.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="flex gap-1.5 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { void loadDeliveries(w); }}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {deliveriesFor?.id === w.id ? 'Hide' : 'Deliveries'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleDelete(w); }}
                        disabled={!canManage}
                        title={!canManage ? NO_PERMISSION : undefined}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deliveriesFor && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Delivery history · {deliveriesFor.url}</h2>
          {deliveries.length === 0 ? (
            <p className="text-slate-500">No delivery attempts yet.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-1 py-1">Attempted</th>
                  <th className="px-1 py-1">Event</th>
                  <th className="px-1 py-1">Status</th>
                  <th className="px-1 py-1">Duration</th>
                  <th className="px-1 py-1">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-1 py-1 text-slate-700">{new Date(d.attemptedAt).toLocaleString()}</td>
                    <td className="px-1 py-1 text-slate-700">{d.eventType}</td>
                    <td className="px-1 py-1 text-slate-700">{d.responseStatus ?? '—'}</td>
                    <td className="px-1 py-1 text-slate-700">{d.durationMs ?? '—'} ms</td>
                    <td className={`px-1 py-1 ${d.succeeded ? 'text-green-800' : 'text-red-700'}`}>
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
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Verify your signing implementation</h2>
        <p className="text-sm text-slate-500">
          Paste your webhook's signing secret to get a sample payload + the
          expected <code>X-CPS-Signature</code> header. If your implementation
          produces the same signature for that payload, your verification is
          correct.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testSecret}
            onChange={(e) => setTestSecret(e.target.value)}
            placeholder="webhook signing secret"
            className="form-input flex-1 font-mono"
          />
          <button
            type="button"
            onClick={() => { void runSignatureTest(); }}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Generate
          </button>
        </div>
        {testResult && (
          <div className="mt-3 text-sm">
            <div className="mb-1"><strong>Payload:</strong></div>
            <pre className="m-0 overflow-x-auto rounded-md bg-slate-100 p-2 text-xs">
              {testResult.payload}
            </pre>
            <div className="mb-1 mt-2"><strong>Expected signature:</strong></div>
            <code className="block break-all rounded-md bg-slate-100 p-2 text-xs">
              {testResult.signature}
            </code>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages} · {total} webhooks</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
