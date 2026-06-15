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

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !auth) return (
    <div style={{ padding: 24 }}>
      <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
        {error ?? 'Prior auth not found'}
      </div>
      <button type="button" onClick={() => navigate('/billing/prior-auth')}>
        Back to prior auths
      </button>
    </div>
  );

  const timeline = buildTimeline(auth);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={() => navigate('/billing/prior-auth')}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>
          Prior auth #{auth.id} · {auth.payerName}
        </h1>
        <span style={{
          background: STATUS_TONES[auth.status], color: '#fff',
          padding: '2px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600,
        }}>
          {auth.status}
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
        marginBottom: 24, background: '#f8fafc',
      }}>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Patient ID</div>
          <div style={{ fontWeight: 600 }}>{auth.patientId}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Service type</div>
          <div>{auth.serviceTypeCode ?? '—'}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Service dates</div>
          <div>{auth.fromDate ?? '?'} → {auth.toDate ?? '?'}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Requested units</div>
          <div>{auth.requestedUnits ?? '—'}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Approved units</div>
          <div style={{ fontWeight: 600, color: '#15803d' }}>
            {auth.approvedUnits ?? '—'}
          </div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Auth number</div>
          <div style={{ fontFamily: 'monospace' }}>{auth.authNumber ?? '—'}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Effective window</div>
          <div>
            {auth.authEffectiveDate ?? '—'} → {auth.authExpirationDate ?? '—'}
          </div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Submitted by</div>
          <div>{auth.submittedByEmail ?? '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        {auth.status === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => { void onRefresh(); }}
              disabled={isRefreshing || !canManage}
              aria-busy={isRefreshing}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh status now'}
            </button>
            <button
              type="button"
              onClick={() => openDecision('approved')}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              Record approval
            </button>
            <button
              type="button"
              onClick={() => openDecision('denied')}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              Record denial
            </button>
          </>
        )}
        {refreshMessage && (
          <span style={{ color: '#0369a1' }}>{refreshMessage}</span>
        )}
      </div>

      <h2>Timeline</h2>
      {timeline.length === 0 ? (
        <div style={{ color: '#64748b' }}>No events yet.</div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0 }}>
          {timeline.map((e, i) => (
            <li
              key={`${e.label}-${e.atUtc}-${i}`}
              style={{
                display: 'grid', gridTemplateColumns: '170px 130px 1fr',
                gap: 12, alignItems: 'baseline', padding: '6px 0',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {new Date(e.atUtc).toLocaleString()}
              </div>
              <div>
                <span style={{
                  background: e.tone, color: '#fff',
                  padding: '2px 8px', borderRadius: 4,
                  fontSize: 12, fontWeight: 600,
                }}>
                  {e.label}
                </span>
              </div>
              <div>{e.description}</div>
            </li>
          ))}
        </ol>
      )}

      {auth.status === 'denied' && auth.denialReason && (
        <div style={{
          marginTop: 24, padding: 16, background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8,
        }}>
          <strong style={{ color: '#991b1b' }}>Denial reason:</strong>{' '}
          {auth.denialReason}
        </div>
      )}

      {decisionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={decisionOpen === 'approved' ? 'Record approval' : 'Record denial'}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 420 }}>
            <h2 style={{ marginTop: 0 }}>
              {decisionOpen === 'approved' ? 'Record approval' : 'Record denial'}
            </h2>
            {decisionOpen === 'approved' && (
              <>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Auth number
                  <input
                    type="text"
                    value={decisionForm.authNumber ?? ''}
                    onChange={(e) => setDecisionForm((f) => ({ ...f, authNumber: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Approved units
                  <input
                    type="number"
                    value={decisionForm.approvedUnits ?? ''}
                    onChange={(e) => setDecisionForm((f) => ({
                      ...f, approvedUnits: e.target.value ? Number(e.target.value) : null,
                    }))}
                    style={{ width: '100%' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label style={{ flex: 1 }}>
                    Effective
                    <input
                      type="date"
                      value={decisionForm.authEffectiveDate ?? ''}
                      onChange={(e) => setDecisionForm((f) => ({
                        ...f, authEffectiveDate: e.target.value || null,
                      }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    Expires
                    <input
                      type="date"
                      value={decisionForm.authExpirationDate ?? ''}
                      onChange={(e) => setDecisionForm((f) => ({
                        ...f, authExpirationDate: e.target.value || null,
                      }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              </>
            )}
            {decisionOpen === 'denied' && (
              <label style={{ display: 'block', marginBottom: 8 }}>
                Denial reason
                <textarea
                  value={decisionForm.denialReason ?? ''}
                  onChange={(e) => setDecisionForm((f) => ({ ...f, denialReason: e.target.value }))}
                  rows={3}
                  style={{ width: '100%' }}
                />
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDecisionOpen(null)}>Cancel</button>
              <button
                type="button"
                onClick={() => { void submitDecision(); }}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
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
