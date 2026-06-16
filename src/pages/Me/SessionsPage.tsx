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
    <div className="grid max-w-[900px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl">Active sessions</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Each row is a refresh token issued for your account. Revoke a
          session to immediately sign out the app or device that still
          holds it. The full token value is never shown — only an id.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-success bg-green-50 px-4 py-3 text-green-800">
          {message}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { void load(); }}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Refresh
        </button>
        {activeRows.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingRevokeAll(true)}
            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Sign out everywhere
          </button>
        )}
      </div>

      {isLoading && rows.length === 0 && (
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      )}

      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No sessions on record.</div>
      )}

      {activeRows.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Active ({activeRows.length})</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">#{r.id}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {fmtRelative(r.createdAt)}
                      <div className="text-xs text-slate-500">
                        {fmtDate(r.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{fmtDate(r.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { void handleRevoke(r); }}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {revokedRows.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold text-slate-500">
            Revoked / expired ({revokedRows.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Revoked / expired</th>
                </tr>
              </thead>
              <tbody>
                {revokedRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-500 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono">#{r.id}</td>
                    <td className="px-4 py-3">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      {r.revokedAt ? `Revoked ${fmtDate(r.revokedAt)}` : `Expired ${fmtDate(r.expiresAt)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {confirmingRevokeAll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sign out everywhere"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50"
        >
          <div className="max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Sign out everywhere?</h3>
            <p className="mt-2 text-slate-700">
              Every active session for your account will be revoked,
              including this one. You will need to sign in again.
            </p>
            <p className="mt-2 text-[13px] text-accent-700">
              This is the safe choice if you suspect your account is
              compromised.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingRevokeAll(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleRevokeAllOthers(); }}
                className="rounded-md bg-error px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:brightness-110"
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
