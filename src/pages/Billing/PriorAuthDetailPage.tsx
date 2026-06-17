import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPriorAuth,
  recordPriorAuthDecision,
  refreshPriorAuthStatusNow,
  type PriorAuth,
  type PriorAuthStatus,
  type UpdatePriorAuthDecisionRequest,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_TONES: Record<PriorAuthStatus, string> = {
  pending: '#b45309',
  approved: '#15803d',
  denied: '#b91c1c',
  expired: '#475569',
  cancelled: '#475569',
};

interface TimelineEvent {
  atUtc: string;
  label: string;
  description: string;
  tone: string;
}

function buildTimeline(auth: PriorAuth): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (auth.submittedAtUtc) {
    events.push({
      atUtc: auth.submittedAtUtc,
      label: 'submitted',
      description: `Submitted to ${auth.clearinghouse ?? 'clearinghouse'}` +
        (auth.referenceId ? ` · ref ${auth.referenceId}` : ''),
      tone: '#0369a1',
    });
  }
  if (auth.lastStatusCheckedAtUtc
    && auth.lastStatusCheckedAtUtc !== auth.submittedAtUtc
    && auth.lastStatusCheckedAtUtc !== auth.decidedAtUtc) {
    events.push({
      atUtc: auth.lastStatusCheckedAtUtc,
      label: 'status-checked',
      description: 'Polled clearinghouse — no status change',
      tone: '#475569',
    });
  }
  if (auth.decidedAtUtc) {
    const decisionDesc = auth.status === 'approved'
      ? `Approved · auth ${auth.authNumber ?? '—'}`
      : auth.status === 'denied'
        ? `Denied · ${auth.denialReason ?? 'no reason given'}`
        : auth.status;
    events.push({
      atUtc: auth.decidedAtUtc,
      label: auth.status,
      description: decisionDesc,
      tone: STATUS_TONES[auth.status],
    });
  }
  return events.sort((a, b) => a.atUtc.localeCompare(b.atUtc));
}

export function PriorAuthDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<PriorAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState<PriorAuthStatus | null>(null);
  const [decisionForm, setDecisionForm] = useState<UpdatePriorAuthDecisionRequest>({
    status: 'approved', authNumber: null, approvedUnits: null,
    authEffectiveDate: null, authExpirationDate: null, denialReason: null,
  });

  // Refresh-status + record-decision hit /billing/prior-auth/* → clinical:prior_auth.
  const canManage = usePermission(PERMISSIONS.CLINICAL_PRIOR_AUTH);

  const loadAuth = async () => {
    if (!id) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPriorAuth(parseInt(id, 10));
      setAuth(res);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? 'Prior auth not found' : 'Failed to load prior auth');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadAuth(); }, [id]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      await refreshPriorAuthStatusNow();
      setRefreshMessage('Status poll triggered — reloading…');
      // Reload to pick up any change the poller wrote
      await loadAuth();
      setRefreshMessage('Status refreshed');
    } catch {
      setRefreshMessage('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDecision = (status: PriorAuthStatus) => {
    setDecisionOpen(status);
    setDecisionForm({
      status,
      authNumber: status === 'approved' ? '' : null,
      approvedUnits: null,
      authEffectiveDate: null,
      authExpirationDate: null,
      denialReason: status === 'denied' ? '' : null,
    });
  };

  const submitDecision = async () => {
    if (!auth) return;
    try {
      const updated = await recordPriorAuthDecision(auth.id, decisionForm);
      setAuth(updated);
      setDecisionOpen(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Decision failed';
      setError(message);
    }
  };

  if (isLoading) return <div role="status" className="p-6 text-slate-500">Loading…</div>;
  if (error || !auth) return (
    <div className="grid gap-4 p-6">
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {error ?? 'Prior auth not found'}
      </div>
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to prior auths
        </button>
      </div>
    </div>
  );

  const timeline = buildTimeline(auth);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back
        </button>
        <h2 className="text-2xl">
          Prior auth #{auth.id} · {auth.payerName}
        </h2>
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ background: STATUS_TONES[auth.status] }}
        >
          {auth.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient ID</div>
          <div className="mt-1 font-semibold text-slate-700">{auth.patientId}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Service type</div>
          <div className="mt-1 text-slate-700">{auth.serviceTypeCode ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Service dates</div>
          <div className="mt-1 text-slate-700">{auth.fromDate ?? '?'} → {auth.toDate ?? '?'}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Requested units</div>
          <div className="mt-1 text-slate-700">{auth.requestedUnits ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Approved units</div>
          <div className="mt-1 font-semibold text-success">
            {auth.approvedUnits ?? '—'}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Auth number</div>
          <div className="mt-1 font-mono text-slate-700">{auth.authNumber ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Effective window</div>
          <div className="mt-1 text-slate-700">
            {auth.authEffectiveDate ?? '—'} → {auth.authExpirationDate ?? '—'}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted by</div>
          <div className="mt-1 text-slate-700">{auth.submittedByEmail ?? '—'}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {auth.status === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => { void onRefresh(); }}
              disabled={isRefreshing || !canManage}
              aria-busy={isRefreshing}
              title={!canManage ? NO_PERMISSION : undefined}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh status now'}
            </button>
            <button
              type="button"
              onClick={() => openDecision('approved')}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Record approval
            </button>
            <button
              type="button"
              onClick={() => openDecision('denied')}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Record denial
            </button>
          </>
        )}
        {refreshMessage && (
          <span className="text-teal-700">{refreshMessage}</span>
        )}
      </div>

      <h3 className="text-lg font-semibold">Timeline</h3>
      {timeline.length === 0 ? (
        <div className="text-slate-500">No events yet.</div>
      ) : (
        <ol className="list-none p-0">
          {timeline.map((e, i) => (
            <li
              key={`${e.label}-${e.atUtc}-${i}`}
              className="grid grid-cols-[170px_130px_1fr] items-baseline gap-3 border-b border-slate-100 py-1.5"
            >
              <div className="text-sm text-slate-500">
                {new Date(e.atUtc).toLocaleString()}
              </div>
              <div>
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ background: e.tone }}
                >
                  {e.label}
                </span>
              </div>
              <div className="text-slate-700">{e.description}</div>
            </li>
          ))}
        </ol>
      )}

      {auth.status === 'denied' && auth.denialReason && (
        <div className="rounded-lg border-l-4 border-error bg-red-50 px-4 py-3">
          <strong className="text-red-800">Denial reason:</strong>{' '}
          <span className="text-red-800">{auth.denialReason}</span>
        </div>
      )}

      {decisionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={decisionOpen === 'approved' ? 'Record approval' : 'Record denial'}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50"
        >
          <div className="min-w-[420px] rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              {decisionOpen === 'approved' ? 'Record approval' : 'Record denial'}
            </h3>
            {decisionOpen === 'approved' && (
              <>
                <label className="mt-4 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Auth number</span>
                  <input
                    type="text"
                    value={decisionForm.authNumber ?? ''}
                    onChange={(e) => setDecisionForm((f) => ({ ...f, authNumber: e.target.value }))}
                    className="form-input"
                  />
                </label>
                <label className="mt-4 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Approved units</span>
                  <input
                    type="number"
                    value={decisionForm.approvedUnits ?? ''}
                    onChange={(e) => setDecisionForm((f) => ({
                      ...f, approvedUnits: e.target.value ? Number(e.target.value) : null,
                    }))}
                    className="form-input"
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <label className="grid flex-1 gap-1.5">
                    <span className="text-sm font-medium text-slate-600">Effective</span>
                    <input
                      type="date"
                      value={decisionForm.authEffectiveDate ?? ''}
                      onChange={(e) => setDecisionForm((f) => ({
                        ...f, authEffectiveDate: e.target.value || null,
                      }))}
                      className="form-input"
                    />
                  </label>
                  <label className="grid flex-1 gap-1.5">
                    <span className="text-sm font-medium text-slate-600">Expires</span>
                    <input
                      type="date"
                      value={decisionForm.authExpirationDate ?? ''}
                      onChange={(e) => setDecisionForm((f) => ({
                        ...f, authExpirationDate: e.target.value || null,
                      }))}
                      className="form-input"
                    />
                  </label>
                </div>
              </>
            )}
            {decisionOpen === 'denied' && (
              <label className="mt-4 grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Denial reason</span>
                <textarea
                  value={decisionForm.denialReason ?? ''}
                  onChange={(e) => setDecisionForm((f) => ({ ...f, denialReason: e.target.value }))}
                  rows={3}
                  className="form-input"
                />
              </label>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDecisionOpen(null)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void submitDecision(); }}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
