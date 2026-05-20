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
    case 'created': return '#15803d';
    case 'updated': return '#0369a1';
    case 'validation-error': return '#b45309';
    case 'not-found': return '#b91c1c';
    case 'error': return '#991b1b';
    default: return '#475569';
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
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>FHIR ingestion feed</h1>
      <p style={{ color: '#64748b', maxWidth: 720 }}>
        Audit trail of every FHIR resource a partner pushed into your tenant
        via /api/v1/fhir/*. The most recent 100 rows. Failures show the first
        validation diagnostic so partner integrators can self-diagnose.
      </p>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0', alignItems: 'center' }}>
        <label>
          Status:&nbsp;
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label>
          Resource:&nbsp;
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            aria-label="Filter by resource type"
          >
            {RESOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}
      {isLoading && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>No FHIR ingestion activity recorded.</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Received</th>
              <th style={{ padding: 8 }}>Resource</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Id</th>
              <th style={{ padding: 8 }}>Bundle entry</th>
              <th style={{ padding: 8 }}>Diagnostics</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                  {new Date(r.receivedAtUtc).toLocaleString()}
                </td>
                <td style={{ padding: 8 }}>{r.resourceType}</td>
                <td style={{ padding: 8, color: statusColor(r.status), fontWeight: 600 }}>
                  {r.status}
                </td>
                <td style={{ padding: 8 }}>{r.resourceId ?? '—'}</td>
                <td style={{ padding: 8 }}>{r.bundleEntryIndex ?? '—'}</td>
                <td style={{ padding: 8, color: '#475569', fontSize: 13 }}>
                  {r.diagnostics ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
