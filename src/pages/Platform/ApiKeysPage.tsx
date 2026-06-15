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
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>API keys</h1>
          <p style={{ color: '#64748b', maxWidth: 720 }}>
            Self-service credential management for partner integrations.
            The full key is shown ONCE on creation — store it immediately;
            the server only retains a hash.
          </p>
          <Link to="/platform" style={{ fontSize: 13 }}>← Platform dashboard</Link>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={!canManageKeys}
          title={!canManageKeys ? NO_PERMISSION : undefined}
        >
          {showForm ? 'Cancel' : '+ New API key'}
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
            API key "{createdSecret.name}" created
          </div>
          <div style={{ color: '#475569', fontSize: 13, marginBottom: 8 }}>
            Copy and store this key now — it will not be shown again.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{
              padding: '8px 12px', background: '#fff',
              border: '1px solid #cbd5e1', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 13,
              flex: 1, wordBreak: 'break-all',
            }}>
              {createdSecret.fullKey}
            </code>
            <button type="button" onClick={() => { void copySecret(); }}>Copy</button>
            <button
              type="button"
              onClick={() => { setCreatedSecret(null); setCopyMsg(null); }}
              style={{ color: '#64748b' }}
            >
              Dismiss
            </button>
          </div>
          {copyMsg && (
            <div style={{ marginTop: 8, color: '#166534', fontSize: 13 }}>{copyMsg}</div>
          )}
        </div>
      )}

      {showForm && (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
          marginBottom: 16, background: '#f8fafc',
        }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Partner X — production"
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Scope
            <select
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
              style={{ width: '100%' }}
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Expires at (optional)
            <input
              type="date"
              value={form.expiresAt ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value || null }))}
              style={{ width: '100%' }}
            />
          </label>
          <button
            type="button"
            disabled={creating || !form.name.trim() || !canManageKeys}
            title={!canManageKeys ? NO_PERMISSION : undefined}
            aria-busy={creating}
            onClick={() => { void handleCreate(); }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>No API keys yet.</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Prefix</th>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Scope</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Last used</th>
              <th style={{ padding: 8 }}>Expires</th>
              <th style={{ padding: 8 }}>Created</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13 }}>
                  {k.prefix}…
                </td>
                <td style={{ padding: 8 }}>{k.name}</td>
                <td style={{ padding: 8 }}>{k.scope}</td>
                <td style={{ padding: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: k.isActive ? '#dcfce7' : '#fee2e2',
                    color: k.isActive ? '#166534' : '#991b1b',
                  }}>
                    {k.isActive ? 'active' : 'revoked'}
                  </span>
                </td>
                <td style={{ padding: 8, color: '#64748b', fontSize: 13 }}>
                  {fmtDate(k.lastUsedAt)}
                </td>
                <td style={{ padding: 8, color: '#64748b', fontSize: 13 }}>
                  {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: 8, color: '#64748b', fontSize: 13 }}>
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: 8 }}>
                  {k.isActive && (
                    <button
                      type="button"
                      onClick={() => { void handleRevoke(k); }}
                      disabled={!canManageKeys}
                      title={!canManageKeys ? NO_PERMISSION : undefined}
                      style={{ color: '#b91c1c', fontSize: 12 }}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>Page {page} of {totalPages} · {total} keys</span>
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
