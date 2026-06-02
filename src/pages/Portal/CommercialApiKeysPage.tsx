import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/client';

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

  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

  return (
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
            API Keys
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Manage API keys for programmatic access.
          </p>
        </div>
        <button
          data-testid="action-create-key"
          onClick={() => {
            setShowCreate(true);
            setCreatedKey(null);
          }}
          style={{
            padding: '10px 16px',
            background: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Create API Key
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#b91c1c',
            marginBottom: 16,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {createdKey && (
        <div
          data-testid="created-key-banner"
          style={{
            padding: 16,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
            API Key Created: {createdKey.name}
          </p>
          <p style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>
            Copy this key now. It will not be shown again.
          </p>
          <code
            data-testid="created-key-value"
            style={{
              display: 'block',
              padding: 8,
              background: 'white',
              border: '1px solid #fde68a',
              borderRadius: 4,
              fontFamily: 'monospace',
            }}
          >
            {createdKey.fullKey}
          </code>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #f1f5f9',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Create New API Key</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
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
              <label style={{ fontSize: 12, fontWeight: 500 }}>Scope</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              >
                <option value="read">Read Only</option>
                <option value="write">Read + Write</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Expires (optional)</label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              style={{
                padding: '8px 16px',
                background: '#0d9488',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {creating ? 'Creating…' : 'Create Key'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div
        data-testid="api-keys-list"
        style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
        }}
      >
        {keys.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            No API keys yet. Create your first key above.
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Name</th>
                <th style={{ padding: 12 }}>Prefix</th>
                <th style={{ padding: 12 }}>Scope</th>
                <th style={{ padding: 12 }}>Last Used</th>
                <th style={{ padding: 12 }}>Created</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  data-testid="api-key-row"
                  style={{ borderTop: '1px solid #f1f5f9' }}
                >
                  <td data-testid="api-key-name" style={{ padding: 12, fontWeight: 500 }}>
                    {key.name}
                  </td>
                  <td
                    data-testid="api-key-prefix"
                    style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}
                  >
                    {key.prefix}…
                  </td>
                  <td style={{ padding: 12 }}>{key.scope}</td>
                  <td style={{ padding: 12, fontSize: 12, color: '#64748b' }}>
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td
                    data-testid="api-key-created"
                    style={{ padding: 12, fontSize: 12, color: '#64748b' }}
                  >
                    {formatDate(key.createdAt)}
                  </td>
                  <td style={{ padding: 12 }}>{key.isActive ? 'Active' : 'Revoked'}</td>
                  <td style={{ padding: 12 }}>
                    {key.isActive && (
                      <button
                        data-testid="action-revoke-key"
                        onClick={() => handleRevoke(key.id)}
                        style={{
                          background: 'transparent',
                          color: '#dc2626',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: 12,
                        }}
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
