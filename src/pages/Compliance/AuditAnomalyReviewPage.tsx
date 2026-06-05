import { Fragment, useEffect, useState } from 'react';
import {
  listAnomalies,
  updateAnomalyStatus,
  scanAnomaliesNow,
  narrateAnomaliesNow,
  type AuditAnomalyAlert,
  type AnomalyStatus,
} from '@/api/compliance';

const STATUS_FILTERS: { value: AnomalyStatus | ''; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'escalated', label: 'Escalated' },
  { value: '', label: 'All' },
];

const ANOMALY_LABELS: Record<string, { label: string; tone: string }> = {
  'bulk-read': { label: 'Bulk PHI read', tone: '#b45309' },
  'off-hours': { label: 'Off-hours access', tone: '#0369a1' },
  'denial-cluster': { label: 'Denial cluster (IP)', tone: '#b91c1c' },
};

function fmtWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${start.toLocaleString()} → ${end.toLocaleString()}`;
}

export function AuditAnomalyReviewPage() {
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | ''>('open');
  const [rows, setRows] = useState<AuditAnomalyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionRowId, setActionRowId] = useState<number | null>(null);
  const [actionStatus, setActionStatus] = useState<AnomalyStatus>('dismissed');
  const [actionNotes, setActionNotes] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [expandedNarrativeId, setExpandedNarrativeId] = useState<number | null>(null);
  const [narrateResult, setNarrateResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listAnomalies({ status: statusFilter, limit: 100 })
      .then((res) => { if (!cancelled) setRows(res.data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ?? 'Failed to load anomalies';
        setError(message);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter, refreshCount]);

  const openAction = (id: number, nextStatus: AnomalyStatus) => {
    setActionRowId(id);
    setActionStatus(nextStatus);
    setActionNotes('');
  };

  const cancelAction = () => {
    setActionRowId(null);
    setActionNotes('');
  };

  const submitAction = async () => {
    if (actionRowId == null) return;
    try {
      await updateAnomalyStatus(actionRowId, actionStatus, actionNotes || null);
      setActionRowId(null);
      setActionNotes('');
      setRefreshCount((c) => c + 1);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Update failed';
      setError(message);
    }
  };

  const runScan = async () => {
    setScanResult(null);
    try {
      const res = await scanAnomaliesNow();
      setScanResult(`Scan complete — ${res.data.inserted} new alert(s)`);
      setRefreshCount((c) => c + 1);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Scan failed';
      setError(message);
    }
  };

  const runNarrate = async () => {
    setNarrateResult(null);
    try {
      const res = await narrateAnomaliesNow();
      setNarrateResult(`Generated narratives for ${res.data.written} alert(s)`);
      setRefreshCount((c) => c + 1);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Narrative generation failed';
      setError(message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Audit anomaly review</h1>
      <p style={{ color: '#64748b', maxWidth: 720 }}>
        Anomalies detected by the background scanner. Each alert covers a
        user/time window; dismiss to acknowledge as expected, or escalate
        to send to incident response.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Filter:&nbsp;
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnomalyStatus | '')}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={runScan}>Scan now</button>
        <button type="button" onClick={runNarrate}>Generate narratives</button>
        {scanResult && <span style={{ color: '#15803d' }}>{scanResult}</span>}
        {narrateResult && <span style={{ color: '#15803d' }}>{narrateResult}</span>}
      </div>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}
      {isLoading && <div>Loading…</div>}
      {!isLoading && !error && rows.length === 0 && (
        <div style={{ color: '#64748b' }}>No anomalies match this filter.</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Detected</th>
              <th style={{ padding: 8 }}>Type</th>
              <th style={{ padding: 8 }}>Subject</th>
              <th style={{ padding: 8 }}>Window</th>
              <th style={{ padding: 8 }}>Evidence</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const label = ANOMALY_LABELS[r.anomalyType] ?? {
                label: r.anomalyType, tone: '#475569',
              };
              const isExpanded = expandedNarrativeId === r.id;
              return (
                <Fragment key={r.id}>
                  <tr style={{ borderBottom: r.narrativeText && isExpanded ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                      {new Date(r.detectedAtUtc).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, color: label.tone, fontWeight: 600 }}>
                      {label.label}
                      {r.narrativeText && (
                        <button
                          type="button"
                          onClick={() => setExpandedNarrativeId(isExpanded ? null : r.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Hide narrative for alert ${r.id}` : `Show narrative for alert ${r.id}`}
                          style={{
                            marginLeft: 8,
                            background: 'none',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            padding: '0 6px',
                            fontSize: 11,
                            cursor: 'pointer',
                            color: '#475569',
                          }}
                        >
                          {isExpanded ? '▾ AI' : '▸ AI'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>
                      {r.userEmail ?? r.ipAddress ?? `user ${r.userId ?? '?'}`}
                    </td>
                    <td style={{ padding: 8, fontSize: 13 }}>
                      {fmtWindow(r.windowStartUtc, r.windowEndUtc)}
                    </td>
                    <td style={{ padding: 8 }}>{r.evidence}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                    <td style={{ padding: 8 }}>
                      {r.status === 'open' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openAction(r.id, 'dismissed')}
                            style={{ marginRight: 8 }}
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(r.id, 'escalated')}
                          >
                            Escalate
                          </button>
                        </>
                      )}
                      {r.status !== 'open' && r.notes && (
                        <span style={{ color: '#64748b', fontSize: 13 }}>
                          {r.notes}
                        </span>
                      )}
                    </td>
                  </tr>
                  {r.narrativeText && isExpanded && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td colSpan={7} style={{ padding: '0 8px 12px 32px', background: '#f8fafc' }}>
                        <div
                          aria-label={`AI narrative for alert ${r.id}`}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: '#334155',
                            whiteSpace: 'pre-wrap',
                            padding: '8px 12px',
                            borderLeft: '3px solid #6366f1',
                            background: '#fff',
                            borderRadius: 4,
                          }}
                        >
                          {r.narrativeText}
                          {r.narrativeGeneratedAtUtc && (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                              AI-generated {new Date(r.narrativeGeneratedAtUtc).toLocaleString()}
                              {' '}— review and verify before acting.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {actionRowId != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review action"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 400 }}>
            <h2 style={{ marginTop: 0 }}>
              {actionStatus === 'dismissed' ? 'Dismiss alert' : 'Escalate alert'}
            </h2>
            <p style={{ color: '#64748b' }}>
              {actionStatus === 'dismissed'
                ? 'Mark this alert as reviewed and expected behaviour.'
                : 'Send this alert to incident response. Include any context.'}
            </p>
            <label style={{ display: 'block' }}>
              Notes
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={4}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={cancelAction}>Cancel</button>
              <button type="button" onClick={submitAction}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
