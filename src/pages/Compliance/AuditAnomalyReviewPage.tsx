import { Fragment, useEffect, useState } from 'react';
import {
  listAnomalies,
  updateAnomalyStatus,
  scanAnomaliesNow,
  narrateAnomaliesNow,
  type AuditAnomalyAlert,
  type AnomalyStatus,
} from '@/api/compliance';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_FILTERS: { value: AnomalyStatus | ''; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'escalated', label: 'Escalated' },
  { value: '', label: 'All' },
];

const ANOMALY_LABELS: Record<string, { label: string; tone: string }> = {
  'bulk-read': { label: 'Bulk PHI read', tone: 'text-accent-700' },
  'off-hours': { label: 'Off-hours access', tone: 'text-blue-700' },
  'denial-cluster': { label: 'Denial cluster (IP)', tone: 'text-red-700' },
};

function fmtWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${start.toLocaleString()} → ${end.toLocaleString()}`;
}

const ROW_ACTION_BTN =
  'rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed';

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

  // All state-changing endpoints on this page (PATCH status, scan-now,
  // narrate-now) live on AuditAnomalyAlertsController, gated by
  // [Authorize(Policy = compliance:phi_review)]. The list (GET) shares that
  // policy with the route guard, so only the action buttons are gated.
  const canReview = usePermission(PERMISSIONS.COMPLIANCE_PHI_REVIEW);

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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Audit anomaly review</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Anomalies detected by the background scanner. Each alert covers a
          user/time window; dismiss to acknowledge as expected, or escalate
          to send to incident response.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Filter</span>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnomalyStatus | '')}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={runScan}
          disabled={!canReview}
          title={!canReview ? NO_PERMISSION : undefined}
          className={ROW_ACTION_BTN}
        >
          Scan now
        </button>
        <button
          type="button"
          onClick={runNarrate}
          disabled={!canReview}
          title={!canReview ? NO_PERMISSION : undefined}
          className={ROW_ACTION_BTN}
        >
          Generate narratives
        </button>
        {scanResult && <span className="text-sm font-medium text-success">{scanResult}</span>}
        {narrateResult && <span className="text-sm font-medium text-success">{narrateResult}</span>}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}
      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && !error && rows.length === 0 && (
        <div className="text-slate-500">No anomalies match this filter.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Detected</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const label = ANOMALY_LABELS[r.anomalyType] ?? {
                  label: r.anomalyType, tone: 'text-slate-600',
                };
                const isExpanded = expandedNarrativeId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className={r.narrativeText && isExpanded ? '' : 'border-t border-slate-100 hover:bg-slate-50'}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {new Date(r.detectedAtUtc).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${label.tone}`}>
                        {label.label}
                        {r.narrativeText && (
                          <button
                            type="button"
                            onClick={() => setExpandedNarrativeId(isExpanded ? null : r.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? `Hide narrative for alert ${r.id}` : `Show narrative for alert ${r.id}`}
                            className="ml-2 rounded border border-slate-300 px-1.5 text-[11px] text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            {isExpanded ? '▾ AI' : '▸ AI'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.userEmail ?? r.ipAddress ?? `user ${r.userId ?? '?'}`}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">
                        {fmtWindow(r.windowStartUtc, r.windowEndUtc)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.evidence}</td>
                      <td className="px-4 py-3 text-slate-700">{r.status}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.status === 'open' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openAction(r.id, 'dismissed')}
                              disabled={!canReview}
                              title={!canReview ? NO_PERMISSION : undefined}
                              className={`mr-2 ${ROW_ACTION_BTN}`}
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(r.id, 'escalated')}
                              disabled={!canReview}
                              title={!canReview ? NO_PERMISSION : undefined}
                              className={ROW_ACTION_BTN}
                            >
                              Escalate
                            </button>
                          </>
                        )}
                        {r.status !== 'open' && r.notes && (
                          <span className="text-[13px] text-slate-500">
                            {r.notes}
                          </span>
                        )}
                      </td>
                    </tr>
                    {r.narrativeText && isExpanded && (
                      <tr className="border-t border-slate-100">
                        <td colSpan={7} className="bg-slate-50 px-4 pb-3 pl-8">
                          <div
                            aria-label={`AI narrative for alert ${r.id}`}
                            className="whitespace-pre-wrap rounded border-l-[3px] border-accent-400 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700"
                          >
                            {r.narrativeText}
                            {r.narrativeGeneratedAtUtc && (
                              <div className="mt-2 text-[11px] text-slate-400">
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
        </div>
      )}

      {actionRowId != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review action"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/50"
        >
          <div className="min-w-[400px] rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              {actionStatus === 'dismissed' ? 'Dismiss alert' : 'Escalate alert'}
            </h3>
            <p className="mt-1 text-slate-500">
              {actionStatus === 'dismissed'
                ? 'Mark this alert as reviewed and expected behaviour.'
                : 'Send this alert to incident response. Include any context.'}
            </p>
            <label className="mt-4 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Notes</span>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={4}
                className="form-input"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={cancelAction} className={ROW_ACTION_BTN}>Cancel</button>
              <button type="button" onClick={submitAction} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
