import { useEffect, useState } from 'react';
import {
  getMySessions,
  revokeAllOtherSessions,
  revokeMySession,
  type SessionRow,
} from '@/api/me';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function fmtRelative(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingRevokeAll, setConfirmingRevokeAll] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMySessions();
      setRows(res.data);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load sessions';
      setError(m);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleRevoke = async (s: SessionRow) => {
    if (!confirm(`Revoke this session? Any app or device still using it will be signed out.`)) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await revokeMySession(s.id);
      setMessage(`Session #${s.id} revoked.`);
      await load();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Revoke failed';
      setError(m);
    }
  };

  const handleRevokeAllOthers = async () => {
    setError(null);
    setMessage(null);
    setConfirmingRevokeAll(false);
    try {
      // We don't know the caller's own token id from claims here. The
      // backend honours "except" only if we pass one, and there's no
      // safe SPA-side way to identify it. Pass null — the server will
      // revoke every active token for the user (including this one),
      // and the next request will 401 and route to login. Acceptable
      // semantics for a "sign me out everywhere" button.
      const res = await revokeAllOtherSessions(null);
      setMessage(`${res.data.revoked} session(s) revoked. You may need to sign in again.`);
      await load();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Sign-out everywhere failed';
      setError(m);
    }
  };

  const activeRows = rows.filter((r) => r.isActive);
  const revokedRows = rows.filter((r) => !r.isActive);

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ margin: 0 }}>Active sessions</h1>
      <p style={{ color: '#64748b', maxWidth: 720 }}>
        Each row is a refresh token issued for your account. Revoke a
        session to immediately sign out the app or device that still
        holds it. The full token value is never shown — only an id.
      </p>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}
      {message && (
        <div style={{ color: '#15803d', marginBottom: 12 }}>{message}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => { void load(); }}>Refresh</button>
        {activeRows.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingRevokeAll(true)}
            style={{ color: '#b91c1c' }}
          >
            Sign out everywhere
          </button>
        )}
      </div>

      {isLoading && rows.length === 0 && <div>Loading…</div>}

      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>No sessions on record.</div>
      )}

      {activeRows.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, marginTop: 16 }}>
            Active ({activeRows.length})
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Session</th>
                <th style={{ padding: 8 }}>Issued</th>
                <th style={{ padding: 8 }}>Expires</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>#{r.id}</td>
                  <td style={{ padding: 8 }}>
                    {fmtRelative(r.createdAt)}
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {fmtDate(r.createdAt)}
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>{fmtDate(r.expiresAt)}</td>
                  <td style={{ padding: 8 }}>
                    <button
                      type="button"
                      onClick={() => { void handleRevoke(r); }}
                      style={{ color: '#b91c1c', fontSize: 12 }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {revokedRows.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, marginTop: 24, color: '#64748b' }}>
            Revoked / expired ({revokedRows.length})
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Session</th>
                <th style={{ padding: 8 }}>Issued</th>
                <th style={{ padding: 8 }}>Revoked / expired</th>
              </tr>
            </thead>
            <tbody>
              {revokedRows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>#{r.id}</td>
                  <td style={{ padding: 8 }}>{fmtDate(r.createdAt)}</td>
                  <td style={{ padding: 8 }}>
                    {r.revokedAt ? `Revoked ${fmtDate(r.revokedAt)}` : `Expired ${fmtDate(r.expiresAt)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {confirmingRevokeAll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sign out everywhere"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 480 }}>
            <h3 style={{ marginTop: 0 }}>Sign out everywhere?</h3>
            <p>
              Every active session for your account will be revoked,
              including this one. You will need to sign in again.
            </p>
            <p style={{ color: '#b45309', fontSize: 13 }}>
              This is the safe choice if you suspect your account is
              compromised.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmingRevokeAll(false)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleRevokeAllOthers(); }}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4 }}
              >
                Sign out everywhere
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
