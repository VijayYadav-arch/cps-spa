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
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
        AI opt-in
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
        Per-organization consent gate for AI features. Until an org has an
        enabled row, no PHI from that org flows through any AI provider.
      </p>

      {loading && <div>Loading…</div>}
      {error && (
        <div role="alert" style={{ color: '#b91c1c', padding: 12, background: '#fef2f2', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <table data-testid="opt-in-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={th}>Organization</th>
              <th style={th}>Status</th>
              <th style={th}>Last change</th>
              <th style={th}>Notes</th>
              <th style={{ ...th, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...td, color: '#94a3b8' }} data-testid="empty-state">
                  No organizations found.
                </td>
              </tr>
            )}
            {orgs.map((org) => {
              const row = rowsByOrgId.get(org.id);
              const status = statusOf(org.id);
              return (
                <tr key={org.id} data-testid={`opt-in-row-${org.id}`}>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>#{org.id}</div>
                  </td>
                  <td style={td}>
                    <StatusPill status={status} />
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#475569' }}>
                    {row?.enabled
                      ? `Enabled ${formatDate(row.enabledAtUtc)}`
                      : row && row.disabledAtUtc
                        ? `Disabled ${formatDate(row.disabledAtUtc)}`
                        : '—'}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#475569', maxWidth: 240 }}>
                    {row?.notes ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {status === 'enabled' ? (
                      <button
                        type="button"
                        data-testid={`disable-${org.id}`}
                        onClick={() => openEditor(org, 'disabled')}
                        style={dangerBtn}
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`enable-${org.id}`}
                        onClick={() => openEditor(org, 'enabled')}
                        style={primaryBtn}
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
      )}

      {editor && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="editor-modal"
          onClick={() => !editor.submitting && setEditor(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              {editor.targetState === 'enabled' ? 'Enable AI for' : 'Disable AI for'} {editor.org.name}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              {editor.targetState === 'enabled'
                ? 'This org will be allowed to send PHI to the configured AI provider. Add a BAA ticket # or change-ticket id in the notes for the audit trail.'
                : 'This org will be blocked from all AI features. In-flight requests fail closed with HTTP 503 ai_not_available.'}
            </p>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>
              Notes (optional)
            </label>
            <textarea
              data-testid="editor-notes"
              value={editor.notes}
              onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="e.g. BAA-ticket #4123 signed 2026-06-08"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 12,
              }}
            />
            {editor.error && (
              <div role="alert" data-testid="editor-error" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                {editor.error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setEditor(null)}
                disabled={editor.submitting}
                data-testid="editor-cancel"
                style={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEditor}
                disabled={editor.submitting || !canManage}
                data-testid="editor-confirm"
                title={!canManage ? NO_PERMISSION : undefined}
                style={{
                  ...(editor.targetState === 'enabled' ? primaryBtn : dangerBtn),
                  cursor: (editor.submitting || !canManage) ? 'not-allowed' : 'pointer',
                }}
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
  const styles: Record<Status, { bg: string; fg: string; label: string }> = {
    enabled: { bg: '#dcfce7', fg: '#166534', label: 'Enabled' },
    disabled: { bg: '#fee2e2', fg: '#991b1b', label: 'Revoked' },
    'no-row': { bg: '#f1f5f9', fg: '#475569', label: 'Not opted in' },
  };
  const s = styles[status];
  return (
    <span
      data-testid="status-pill"
      data-status={status}
      style={{
        display: 'inline-block',
        background: s.bg,
        color: s.fg,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
      }}
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

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#0d9488',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 13,
};

const dangerBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 13,
};

const secondaryBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: 'white',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};
