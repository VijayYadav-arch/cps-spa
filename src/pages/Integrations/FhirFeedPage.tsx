import { useEffect, useState } from 'react';
import { listFhirFeed, type FhirFeedRow } from '@/api/integrations';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'validation-error', label: 'Validation error' },
  { value: 'not-found', label: 'Not found' },
  { value: 'error', label: 'Error' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'All resources' },
  { value: 'Patient', label: 'Patient' },
  { value: 'Encounter', label: 'Encounter' },
  { value: 'Bundle', label: 'Bundle (wrapper)' },
];

function statusColor(status: FhirFeedRow['status']): string {
  switch (status) {
    case 'created': return 'text-green-700';
    case 'updated': return 'text-sky-700';
    case 'validation-error': return 'text-accent-700';
    case 'not-found': return 'text-red-700';
    case 'error': return 'text-red-800';
    default: return 'text-slate-600';
  }
}

export function FhirFeedPage() {
  const [rows, setRows] = useState<FhirFeedRow[]>([]);
  const [status, setStatus] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listFhirFeed({ limit: 100, status: status || undefined, resourceType: resourceType || undefined })
      .then((res) => {
        if (!cancelled) setRows(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = (err as { response?: { data?: { error?: string } } })
            ?.response?.data?.error ?? 'Failed to load FHIR feed';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [status, resourceType]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl">FHIR ingestion feed</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Audit trail of every FHIR resource a partner pushed into your tenant
          via /api/v1/fhir/*. The most recent 100 rows. Failures show the first
          validation diagnostic so partner integrators can self-diagnose.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="form-input w-48"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Resource</span>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            aria-label="Filter by resource type"
            className="form-input w-48"
          >
            {RESOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}
      {isLoading && (
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      )}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No FHIR ingestion activity recorded.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Id</th>
                <th className="px-4 py-3">Bundle entry</th>
                <th className="px-4 py-3">Diagnostics</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {new Date(r.receivedAtUtc).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.resourceType}</td>
                  <td className={`px-4 py-3 font-semibold ${statusColor(r.status)}`}>
                    {r.status}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.resourceId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.bundleEntryIndex ?? '—'}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">
                    {r.diagnostics ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
