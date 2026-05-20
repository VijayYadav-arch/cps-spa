import { useEffect, useState } from 'react';
import {
  getAuditEvents,
  auditExportUrl,
  type AuditEvent,
  type AuditSearchParams,
  type PaginationMeta,
} from '@/api/platform';

const EVENT_TYPES = [
  '', 'phi-access', 'phi-modify', 'phi-export',
  'auth-success', 'auth-failure', 'permission-denied',
  'admin-action', 'session-event',
];

const RESULTS = ['', 'success', 'denied', 'error'];

function isoOrEmpty(d: string): string | undefined {
  if (!d) return undefined;
  // Treat the input as the local-time start/end of day → UTC ISO. The
  // backend treats the timestamps as UTC inclusive.
  return new Date(d).toISOString();
}

function buildParams(
  form: {
    startDate: string; endDate: string; userId: string; userEmail: string;
    patientId: string; resourceType: string; resourceId: string;
    eventType: string; result: string; ipAddress: string; q: string;
  },
  page: number,
  pageSize: number,
): AuditSearchParams {
  const params: AuditSearchParams = { page, pageSize };
  if (form.startDate) params.startDate = isoOrEmpty(form.startDate);
  if (form.endDate) params.endDate = isoOrEmpty(form.endDate);
  if (form.userId) params.userId = Number(form.userId);
  if (form.userEmail) params.userEmail = form.userEmail;
  if (form.patientId) params.patientId = Number(form.patientId);
  if (form.resourceType) params.resourceType = form.resourceType;
  if (form.resourceId) params.resourceId = Number(form.resourceId);
  if (form.eventType) params.eventType = form.eventType;
  if (form.result) params.result = form.result;
  if (form.ipAddress) params.ipAddress = form.ipAddress;
  if (form.q) params.q = form.q;
  return params;
}

function resultColor(r: string): string {
  switch (r) {
    case 'success': return '#15803d';
    case 'denied': return '#b91c1c';
    case 'error': return '#b45309';
    default: return '#475569';
  }
}

const emptyForm = {
  startDate: '', endDate: '', userId: '', userEmail: '',
  patientId: '', resourceType: '', resourceId: '',
  eventType: '', result: '', ipAddress: '', q: '',
};

export function AuditLogSearchPage() {
  const [form, setForm] = useState(emptyForm);
  const [committed, setCommitted] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getAuditEvents(buildParams(committed, page, pageSize))
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setPagination(res.pagination);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ?? 'Failed to load audit log';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [committed, page, pageSize]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setCommitted(form);
  };

  const onClear = () => {
    setForm(emptyForm);
    setCommitted(emptyForm);
    setPage(1);
  };

  const onExport = () => {
    // Use a real <a> click so the browser handles the streaming download.
    window.location.href = auditExportUrl(buildParams(committed, 1, pageSize));
  };

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Audit log search</h1>
      <p style={{ color: '#64748b', maxWidth: 720 }}>
        Search the HIPAA audit log. Default window is the last 90 days when
        no start date is set. Export downloads the same filter as CSV (up to
        50,000 rows).
      </p>

      <form
        onSubmit={onSearch}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}
        aria-label="Audit log filters"
      >
        <label>Start date<br />
          <input type="date" value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
        </label>
        <label>End date<br />
          <input type="date" value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
        </label>
        <label>Event type<br />
          <select value={form.eventType}
            onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t || 'Any'}</option>
            ))}
          </select>
        </label>
        <label>Result<br />
          <select value={form.result}
            onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}>
            {RESULTS.map((r) => <option key={r} value={r}>{r || 'Any'}</option>)}
          </select>
        </label>
        <label>User id<br />
          <input type="number" value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
        </label>
        <label>User email contains<br />
          <input type="text" value={form.userEmail} placeholder="alice@…"
            onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))} />
        </label>
        <label>Patient id<br />
          <input type="number" value={form.patientId}
            onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} />
        </label>
        <label>Resource type<br />
          <input type="text" value={form.resourceType} placeholder="Patient, Claim, …"
            onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value }))} />
        </label>
        <label>Resource id<br />
          <input type="number" value={form.resourceId}
            onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))} />
        </label>
        <label>IP address<br />
          <input type="text" value={form.ipAddress}
            onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} />
        </label>
        <label style={{ gridColumn: 'span 2' }}>Description contains<br />
          <input type="text" value={form.q} placeholder="surveyor, bulk export, …"
            onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
            style={{ width: '100%' }} />
        </label>

        <div style={{ gridColumn: 'span 4', display: 'flex', gap: 8 }}>
          <button type="submit">Search</button>
          <button type="button" onClick={onClear}>Clear</button>
          <button type="button" onClick={onExport}>Download CSV</button>
        </div>
      </form>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}
      {isLoading && <div>Loading…</div>}
      {!isLoading && !error && rows.length === 0 && (
        <div style={{ color: '#64748b' }}>No audit events matched these filters.</div>
      )}

      {rows.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>When</th>
                <th style={{ padding: 8 }}>Event</th>
                <th style={{ padding: 8 }}>Result</th>
                <th style={{ padding: 8 }}>User</th>
                <th style={{ padding: 8 }}>Resource</th>
                <th style={{ padding: 8 }}>Patient</th>
                <th style={{ padding: 8 }}>IP</th>
                <th style={{ padding: 8 }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: 8 }}>{r.eventType}</td>
                  <td style={{ padding: 8, color: resultColor(r.result), fontWeight: 600 }}>
                    {r.result}
                  </td>
                  <td style={{ padding: 8 }}>{r.userEmail || r.userId || '—'}</td>
                  <td style={{ padding: 8 }}>
                    {r.resourceType ? `${r.resourceType}/${r.resourceId ?? '—'}` : '—'}
                  </td>
                  <td style={{ padding: 8 }}>{r.patientId ?? '—'}</td>
                  <td style={{ padding: 8 }}>{r.ipAddress ?? '—'}</td>
                  <td style={{ padding: 8, color: '#475569', fontSize: 13 }}>
                    {r.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span>
                Page {pagination.page} of {totalPages} ({pagination.total.toLocaleString()} rows)
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
