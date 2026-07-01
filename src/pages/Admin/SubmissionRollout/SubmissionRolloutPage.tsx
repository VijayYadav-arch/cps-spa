import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';
import { DocsLink } from '@/components/DocsLink';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface OrgRow {
  id: number;
  name: string;
}

interface ReadinessCheck {
  name: string;
  passed: boolean;
  detail: string;
}

interface Readiness {
  ready: boolean;
  realSubmissionEnabled: boolean;
  checks: ReadinessCheck[];
}

interface ListEnvelope<T> {
  data: T[];
}

interface RowEnvelope<T> {
  data: T;
}

/**
 * Platform-admin panel for the billing go-live Phase 3 rollout gate
 * (cps-dotnet #341/#342). Lists every org with its submission-readiness
 * pre-flight (clearinghouse config + credentials + active payer enrollment)
 * and its current real-submission gate state, and lets a platform admin flip
 * the per-org gate. Enabling is only offered once the org is ready — the
 * backend also refuses a not-ready enable with 409 NOT_READY.
 *
 * Gated by ADMIN_SYSTEM_CONFIG, mirroring the controller's policy. Both the
 * GET (cross-org) and PUT require a platform admin (IsCrossOrgAdmin).
 */
export function SubmissionRolloutPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [readinessByOrgId, setReadinessByOrgId] = useState<Map<number, Readiness | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    org: OrgRow;
    targetEnabled: boolean;
    notes: string;
    submitting: boolean;
    error: string | null;
  } | null>(null);

  // The rollout toggle (PUT /billing/submission-rollout/{orgId}) is gated by admin:system_config.
  const canManage = usePermission(PERMISSIONS.ADMIN_SYSTEM_CONFIG);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgsRes = await apiClient.get<ListEnvelope<OrgRow>>('/organizations?pageSize=200');
        const orgList = Array.isArray(orgsRes.data?.data) ? orgsRes.data.data : [];
        if (cancelled) return;
        setOrgs(orgList);

        // Readiness is a per-org pre-flight (no list endpoint). Fetch all in parallel; a single
        // org's failure shouldn't blank the whole table.
        const entries = await Promise.all(
          orgList.map(async (org): Promise<[number, Readiness | null]> => {
            try {
              const res = await apiClient.get<RowEnvelope<Readiness>>(
                `/billing/submission-rollout/${org.id}`,
              );
              return [org.id, res.data?.data ?? null];
            } catch {
              return [org.id, null];
            }
          }),
        );
        if (!cancelled) setReadinessByOrgId(new Map(entries));
      } catch {
        if (!cancelled) setError('Failed to load submission-rollout status.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openEditor(org: OrgRow, targetEnabled: boolean) {
    setEditor({ org, targetEnabled, notes: '', submitting: false, error: null });
  }

  async function submitEditor() {
    if (!editor) return;
    setEditor({ ...editor, submitting: true, error: null });
    try {
      const body = {
        enabled: editor.targetEnabled,
        notes: editor.notes.trim().length > 0 ? editor.notes.trim() : null,
      };
      await apiClient.put(`/billing/submission-rollout/${editor.org.id}`, body);
      // Re-fetch readiness for the toggled org so the gate state reflects the change.
      const orgId = editor.org.id;
      let refreshed: Readiness | null = null;
      try {
        const res = await apiClient.get<RowEnvelope<Readiness>>(`/billing/submission-rollout/${orgId}`);
        refreshed = res.data?.data ?? null;
      } catch {
        refreshed = readinessByOrgId.get(orgId) ?? null;
      }
      setReadinessByOrgId((prev) => {
        const next = new Map(prev);
        next.set(orgId, refreshed);
        return next;
      });
      setEditor(null);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      const msg =
        status === 409
          ? 'Org is not ready for real submission — resolve the failing checks first.'
          : `Request failed (HTTP ${status ?? '?'})`;
      setEditor((prev) => (prev ? { ...prev, submitting: false, error: msg } : prev));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 data-testid="page-title" className="text-2xl">
          Submission Rollout
        </h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Per-org go-live gate for <strong>real</strong> clearinghouse submission. An org can only
          be enabled once its readiness pre-flight passes — an active primary clearinghouse with
          credentials and at least one active payer enrollment. Until then, claims follow the legacy
          status-flip path.
        </p>
        <DocsLink
          path="user-guide/administration/"
          className="inline-block text-sm font-medium text-teal-700 hover:underline"
        >
          Go-live guide: readiness & rollout ↗
        </DocsLink>
      </header>

      {loading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table data-testid="rollout-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Real submission</th>
                <th className="px-4 py-3">Readiness</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-slate-400" data-testid="empty-state">
                    No organizations found.
                  </td>
                </tr>
              )}
              {orgs.map((org) => {
                const readiness = readinessByOrgId.get(org.id) ?? null;
                const enabled = readiness?.realSubmissionEnabled ?? false;
                const ready = readiness?.ready ?? false;
                const failing = readiness?.checks.filter((c) => !c.passed) ?? [];
                return (
                  <tr key={org.id} data-testid={`rollout-row-${org.id}`} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{org.name}</div>
                      <div className="text-xs text-slate-400">#{org.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionPill enabled={enabled} />
                    </td>
                    <td className="px-4 py-3">
                      {readiness == null ? (
                        <span className="text-xs text-slate-400">Unknown</span>
                      ) : (
                        <ReadinessCell ready={ready} failing={failing} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {enabled ? (
                        <button
                          type="button"
                          data-testid={`disable-${org.id}`}
                          onClick={() => openEditor(org, false)}
                          disabled={!canManage}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`enable-${org.id}`}
                          onClick={() => openEditor(org, true)}
                          disabled={!canManage || !ready}
                          title={
                            !canManage
                              ? NO_PERMISSION
                              : !ready
                                ? 'Org is not ready — resolve the failing checks first.'
                                : undefined
                          }
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Enable
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="editor-modal"
          onClick={() => !editor.submitting && setEditor(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="mb-1 text-lg font-semibold">
              {editor.targetEnabled ? 'Enable real submission for' : 'Disable real submission for'}{' '}
              {editor.org.name}
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              {editor.targetEnabled
                ? 'Claims for this org will transmit to the live clearinghouse. Add a change-ticket id in the notes for the audit trail.'
                : 'This org reverts to the legacy status-flip path; no claims will transmit to a clearinghouse.'}
            </p>
            <label className="mb-1 block text-sm font-medium text-slate-600">Notes (optional)</label>
            <textarea
              data-testid="editor-notes"
              value={editor.notes}
              onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="e.g. go-live ticket #5120; payer enrollment confirmed 2026-06-30"
              className="form-input mb-3 resize-y"
            />
            {editor.error && (
              <div role="alert" data-testid="editor-error" className="mb-3 text-sm text-red-700">
                {editor.error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                disabled={editor.submitting}
                data-testid="editor-cancel"
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEditor}
                disabled={editor.submitting || !canManage}
                data-testid="editor-confirm"
                title={!canManage ? NO_PERMISSION : undefined}
                className={
                  editor.targetEnabled
                    ? 'btn-primary disabled:cursor-not-allowed disabled:opacity-60'
                    : 'rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                }
              >
                {editor.submitting ? 'Saving…' : editor.targetEnabled ? 'Enable' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      data-testid="submission-pill"
      data-enabled={enabled}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {enabled ? 'Live' : 'Off'}
    </span>
  );
}

function ReadinessCell({ ready, failing }: { ready: boolean; failing: ReadinessCheck[] }) {
  return (
    <div className="space-y-1">
      <span
        data-testid="readiness-pill"
        data-ready={ready}
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
          ready ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
        }`}
      >
        {ready ? 'Ready' : 'Not ready'}
      </span>
      {!ready && failing.length > 0 && (
        <ul className="text-xs text-slate-500">
          {failing.map((c) => (
            <li key={c.name} title={c.detail}>
              ✗ {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
