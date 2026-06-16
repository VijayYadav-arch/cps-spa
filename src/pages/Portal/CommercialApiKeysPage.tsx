import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { useAnyPermission } from '@/permissions/useAnyPermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface ApiKeyItem {
  id: number;
  prefix: string;
  name: string;
  scope: string;
  lastUsedAt: string | null;
  createdAt: string;
  isActive: boolean;
  expiresAt: string | null;
}

interface ApiKeysEnvelope {
  data: ApiKeyItem[];
}

interface CreateKeyEnvelope {
  data: {
    id: number;
    prefix: string;
    name: string;
    scope: string;
    fullKey: string;
  };
}

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Never';

export function CommercialApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState('read');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const [createdKey, setCreatedKey] = useState<{ fullKey: string; name: string } | null>(
    null,
  );

  // Backend api-keys endpoints use a compound OR policy (apikey_management =
  // org:api_keys OR platform:api_keys) — satisfied by EITHER permission.
  const canManageKeys = useAnyPermission([
    PERMISSIONS.ORG_API_KEYS,
    PERMISSIONS.PLATFORM_API_KEYS,
  ]);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiKeysEnvelope>('/api-keys');
      setKeys(res.data.data ?? []);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await apiClient.post<CreateKeyEnvelope>('/api-keys', {
        name: newName,
        scope: newScope,
        expiresAt: newExpiresAt || undefined,
      });
      setCreatedKey({ fullKey: res.data.data.fullKey, name: res.data.data.name });
      setShowCreate(false);
      setNewName('');
      setNewScope('read');
      setNewExpiresAt('');
      await fetchKeys();
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/api-keys/${keyId}`);
      await fetchKeys();
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to revoke key');
    }
  };

  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading…
      </div>
    );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-2xl">
            API Keys
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage API keys for programmatic access.
          </p>
        </div>
        <button
          data-testid="action-create-key"
          onClick={() => {
            setShowCreate(true);
            setCreatedKey(null);
          }}
          disabled={!canManageKeys}
          title={!canManageKeys ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create API Key
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      {createdKey && (
        <div
          data-testid="created-key-banner"
          className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3"
        >
          <p className="font-semibold text-amber-800">
            API Key Created: {createdKey.name}
          </p>
          <p className="mb-2 text-xs text-amber-800">
            Copy this key now. It will not be shown again.
          </p>
          <code
            data-testid="created-key-value"
            className="block rounded border border-accent-200 bg-white p-2 font-mono"
          >
            {createdKey.fullKey}
          </code>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 className="mb-3 text-lg font-semibold">Create New API Key</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Name</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Scope</span>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value)}
                className="form-input"
              >
                <option value="read">Read Only</option>
                <option value="write">Read + Write</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">
                Expires (optional)
              </span>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="form-input"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Key'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div
        data-testid="api-keys-list"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {keys.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No API keys yet. Create your first key above.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Last Used</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  data-testid="api-key-row"
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td
                    data-testid="api-key-name"
                    className="px-4 py-3 font-medium text-slate-700"
                  >
                    {key.name}
                  </td>
                  <td
                    data-testid="api-key-prefix"
                    className="px-4 py-3 font-mono text-xs text-slate-700"
                  >
                    {key.prefix}…
                  </td>
                  <td className="px-4 py-3 text-slate-700">{key.scope}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td
                    data-testid="api-key-created"
                    className="px-4 py-3 text-xs text-slate-500"
                  >
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {key.isActive ? 'Active' : 'Revoked'}
                  </td>
                  <td className="px-4 py-3">
                    {key.isActive && (
                      <button
                        data-testid="action-revoke-key"
                        onClick={() => handleRevoke(key.id)}
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
        )}
      </div>
    </div>
  );
}
