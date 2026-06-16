import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createApiKey,
  getApiKeys,
  revokeApiKey,
  type ApiKey,
  type ApiKeyCreateResponse,
  type CreateApiKeyRequest,
} from '@/api/platform';
import { useAnyPermission } from '@/permissions/useAnyPermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const PAGE_SIZE = 25;

const SCOPE_OPTIONS = [
  { value: 'read', label: 'read — list/get only' },
  { value: 'write', label: 'write — read + create/update' },
  { value: 'admin', label: 'admin — full lifecycle (use sparingly)' },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function ApiKeysPage() {
  const [rows, setRows] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateApiKeyRequest>({
    name: '', scope: 'read', expiresAt: null,
  });
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<ApiKeyCreateResponse | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  // Backend api-keys endpoints use a compound OR policy (apikey_management =
  // org:api_keys OR platform:api_keys) — satisfied by EITHER permission.
  const canManageKeys = useAnyPermission([
    PERMISSIONS.ORG_API_KEYS,
    PERMISSIONS.PLATFORM_API_KEYS,
  ]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getApiKeys({ page, pageSize: PAGE_SIZE });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load API keys';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createApiKey(form);
      setCreatedSecret(res);
      setForm({ name: '', scope: 'read', expiresAt: null });
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string; error?: string } } })
        ?.response?.data?.detail
        ?? (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Create failed';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (k: ApiKey) => {
    if (!confirm(`Revoke "${k.name}"? Active integrations using this key will start receiving 401s.`)) {
      return;
    }
    try {
      await revokeApiKey(k.id);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Revoke failed';
      setError(message);
    }
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret.fullKey);
      setCopyMsg('Copied — paste into your partner integration now');
    } catch {
      setCopyMsg('Copy failed — select and copy manually');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl">API keys</h1>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            Self-service credential management for partner integrations.
            The full key is shown ONCE on creation — store it immediately;
            the server only retains a hash.
          </p>
          <Link to="/platform" className="font-medium text-teal-700 hover:underline">← Platform dashboard</Link>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={!canManageKeys}
          title={!canManageKeys ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showForm ? 'Cancel' : '+ New API key'}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      {createdSecret && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3">
          <div className="mb-2 font-semibold text-green-800">
            API key "{createdSecret.name}" created
          </div>
          <div className="mb-2 text-sm text-slate-600">
            Copy and store this key now — it will not be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm">
              {createdSecret.fullKey}
            </code>
            <button
              type="button"
              onClick={() => { void copySecret(); }}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => { setCreatedSecret(null); setCopyMsg(null); }}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Dismiss
            </button>
          </div>
          {copyMsg && (
            <div className="mt-2 text-sm text-green-800">{copyMsg}</div>
          )}
        </div>
      )}

      {showForm && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Partner X — production"
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Scope</span>
            <select
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
              className="form-input"
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Expires at (optional)</span>
            <input
              type="date"
              value={form.expiresAt ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value || null }))}
              className="form-input"
            />
          </label>
          <button
            type="button"
            disabled={creating || !form.name.trim() || !canManageKeys}
            title={!canManageKeys ? NO_PERMISSION : undefined}
            aria-busy={creating}
            onClick={() => { void handleCreate(); }}
            className="btn-primary justify-self-start disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No API keys yet.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-slate-700">
                    {k.prefix}…
                  </td>
                  <td className="px-4 py-3 text-slate-700">{k.name}</td>
                  <td className="px-4 py-3 text-slate-700">{k.scope}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      k.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {k.isActive ? 'active' : 'revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {fmtDate(k.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {k.isActive && (
                      <button
                        type="button"
                        onClick={() => { void handleRevoke(k); }}
                        disabled={!canManageKeys}
                        title={!canManageKeys ? NO_PERMISSION : undefined}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <span className="text-sm text-slate-600">Page {page} of {totalPages} · {total} keys</span>
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
