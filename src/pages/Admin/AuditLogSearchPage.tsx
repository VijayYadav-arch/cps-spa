import { useEffect, useState } from 'react';
import {
  getAuditEvents,
  auditExportUrl,
  type AuditEvent,
  type AuditSearchParams,
  type PaginationMeta,
} from '@/api/platform';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

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
    case 'success': return 'text-green-700';
    case 'denied': return 'text-red-700';
    case 'error': return 'text-amber-700';
    default: return 'text-slate-600';
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

  // CSV export hits GET /audit/export, gated by admin:audit_logs.
  const canExport = usePermission(PERMISSIONS.ADMIN_AUDIT_LOGS);

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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl">Audit log search</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Search the HIPAA audit log. Default window is the last 90 days when
          no start date is set. Export downloads the same filter as CSV (up to
          50,000 rows).
        </p>
      </header>

      <form
        onSubmit={onSearch}
        className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Audit log filters"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Start date</span>
          <input type="date" className="form-input" value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">End date</span>
          <input type="date" className="form-input" value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Event type</span>
          <select className="form-input" value={form.eventType}
            onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t || 'Any'}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Result</span>
          <select className="form-input" value={form.result}
            onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}>
            {RESULTS.map((r) => <option key={r} value={r}>{r || 'Any'}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">User id</span>
          <input type="number" className="form-input" value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">User email contains</span>
          <input type="text" className="form-input" value={form.userEmail} placeholder="alice@…"
            onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Patient id</span>
          <input type="number" className="form-input" value={form.patientId}
            onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Resource type</span>
          <input type="text" className="form-input" value={form.resourceType} placeholder="Patient, Claim, …"
            onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Resource id</span>
          <input type="number" className="form-input" value={form.resourceId}
            onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">IP address</span>
          <input type="text" className="form-input" value={form.ipAddress}
            onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-slate-600">Description contains</span>
          <input type="text" className="form-input" value={form.q} placeholder="surveyor, bulk export, …"
            onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))} />
        </label>

        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary">Search</button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            title={!canExport ? NO_PERMISSION : undefined}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download CSV
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}
      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && !error && rows.length === 0 && (
        <div className="text-slate-500">No audit events matched these filters.</div>
      )}

      {rows.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.eventType}</td>
                    <td className={`px-4 py-3 font-semibold ${resultColor(r.result)}`}>
                      {r.result}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.userEmail || r.userId || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.resourceType ? `${r.resourceType}/${r.resourceId ?? '—'}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.patientId ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {totalPages} ({pagination.total.toLocaleString()} rows)
              </span>
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
        </>
      )}
    </div>
  );
}
