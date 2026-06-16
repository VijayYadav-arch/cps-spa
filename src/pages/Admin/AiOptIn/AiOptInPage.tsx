import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/api/client';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface OptInRow {
  id: number;
  organizationId: number;
  enabled: boolean;
  enabledByUserId: number;
  enabledAtUtc: string;
  disabledByUserId: number | null;
  disabledAtUtc: string | null;
  notes: string | null;
}

interface OrgRow {
  id: number;
  name: string;
}

interface ListEnvelope<T> {
  data: T[];
  pagination?: { total: number; page: number; pageSize: number; totalPages: number };
}

interface RowEnvelope<T> {
  data: T;
}

type Status = 'enabled' | 'disabled' | 'no-row';

/**
 * Admin UI for managing per-org AI opt-in (cps-dotnet PR #221 backend).
 *
 * Joins the cross-tenant list of opt-in rows with the orgs catalog so
 * admins see a row per organization regardless of whether an opt-in row
 * exists yet. Enable / disable each row inline; both actions hit the
 * existing endpoints (PUT to enable, DELETE with body to disable) and
 * write `compliance.ai.opt-in.enabled` / `compliance.ai.opt-in.disabled`
 * audit rows on the backend.
 *
 * Gated by ADMIN_SYSTEM_CONFIG (highest-privilege admin scope) -- mirrors
 * the controller's `admin:system_config` policy.
 *
 * Notes-on-toggle is optional but encouraged for compliance traceability
 * (BAA ticket #, change-ticket id). The backend audit-row metadata
 * records it verbatim.
 */
export function AiOptInPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [rows, setRows] = useState<OptInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    org: OrgRow;
    row: OptInRow | null;
    targetState: 'enabled' | 'disabled';
    notes: string;
    submitting: boolean;
    error: string | null;
  } | null>(null);

  // Enable / disable both hit PUT|DELETE /admin/ai/opt-in/{orgId}, whose
  // controller is class-gated by admin:system_config.
  const canManage = usePermission(PERMISSIONS.ADMIN_SYSTEM_CONFIG);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<ListEnvelope<OrgRow>>('/organizations?pageSize=200'),
      apiClient.get<ListEnvelope<OptInRow>>('/admin/ai/opt-in'),
    ])
      .then(([orgsRes, optInRes]) => {
        if (cancelled) return;
        setOrgs(Array.isArray(orgsRes.data?.data) ? orgsRes.data.data : []);
        setRows(Array.isArray(optInRes.data?.data) ? optInRes.data.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load AI opt-in rows.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsByOrgId = useMemo(() => {
    const map = new Map<number, OptInRow>();
    for (const r of rows) map.set(r.organizationId, r);
    return map;
  }, [rows]);

  function statusOf(orgId: number): Status {
    const row = rowsByOrgId.get(orgId);
    if (row == null) return 'no-row';
    return row.enabled ? 'enabled' : 'disabled';
  }

  function openEditor(org: OrgRow, target: 'enabled' | 'disabled') {
    setEditor({
      org,
      row: rowsByOrgId.get(org.id) ?? null,
      targetState: target,
      notes: '',
      submitting: false,
      error: null,
    });
  }

  async function submitEditor() {
    if (!editor) return;
    setEditor({ ...editor, submitting: true, error: null });
    try {
      const body = { notes: editor.notes.trim().length > 0 ? editor.notes.trim() : null };
      const url = `/admin/ai/opt-in/${editor.org.id}`;
      let res;
      if (editor.targetState === 'enabled') {
        res = await apiClient.put<RowEnvelope<OptInRow>>(url, body);
      } else {
        // axios delete-with-body requires `data:` field.
        res = await apiClient.delete<RowEnvelope<OptInRow>>(url, { data: body });
      }
      const updated = res.data?.data;
      if (updated) {
        setRows((prev) => {
          const others = prev.filter((r) => r.organizationId !== updated.organizationId);
          return [...others, updated];
        });
      }
      setEditor(null);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? `Request failed (HTTP ${(err as { response?: { status?: number } }).response?.status ?? '?'})`
          : 'Request failed';
      setEditor((prev) => (prev ? { ...prev, submitting: false, error: msg } : prev));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 data-testid="page-title" className="text-2xl">
          AI opt-in
        </h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Per-organization consent gate for AI features. Until an org has an
          enabled row, no PHI from that org flows through any AI provider.
        </p>
      </header>

      {loading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table data-testid="opt-in-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last change</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-slate-400" data-testid="empty-state">
                    No organizations found.
                  </td>
                </tr>
              )}
              {orgs.map((org) => {
                const row = rowsByOrgId.get(org.id);
                const status = statusOf(org.id);
                return (
                  <tr key={org.id} data-testid={`opt-in-row-${org.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{org.name}</div>
                      <div className="text-xs text-slate-400">#{org.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row?.enabled
                        ? `Enabled ${formatDate(row.enabledAtUtc)}`
                        : row && row.disabledAtUtc
                          ? `Disabled ${formatDate(row.disabledAtUtc)}`
                          : '—'}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-xs text-slate-600">
                      {row?.notes ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === 'enabled' ? (
                        <button
                          type="button"
                          data-testid={`disable-${org.id}`}
                          onClick={() => openEditor(org, 'disabled')}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`enable-${org.id}`}
                          onClick={() => openEditor(org, 'enabled')}
                          className="btn-primary"
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
              {editor.targetState === 'enabled' ? 'Enable AI for' : 'Disable AI for'} {editor.org.name}
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              {editor.targetState === 'enabled'
                ? 'This org will be allowed to send PHI to the configured AI provider. Add a BAA ticket # or change-ticket id in the notes for the audit trail.'
                : 'This org will be blocked from all AI features. In-flight requests fail closed with HTTP 503 ai_not_available.'}
            </p>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Notes (optional)
            </label>
            <textarea
              data-testid="editor-notes"
              value={editor.notes}
              onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="e.g. BAA-ticket #4123 signed 2026-06-08"
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
                  editor.targetState === 'enabled'
                    ? 'btn-primary disabled:cursor-not-allowed disabled:opacity-60'
                    : 'rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                }
              >
                {editor.submitting
                  ? 'Saving…'
                  : editor.targetState === 'enabled'
                    ? 'Enable'
                    : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, { cls: string; label: string }> = {
    enabled: { cls: 'bg-green-100 text-green-800', label: 'Enabled' },
    disabled: { cls: 'bg-red-100 text-red-800', label: 'Revoked' },
    'no-row': { cls: 'bg-slate-100 text-slate-600', label: 'Not opted in' },
  };
  const s = styles[status];
  return (
    <span
      data-testid="status-pill"
      data-status={status}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
