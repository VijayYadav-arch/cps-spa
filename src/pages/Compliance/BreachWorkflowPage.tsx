import { useEffect, useState } from 'react';
import {
  assessBreachRisk,
  closeBreach,
  getBreachActivity,
  getBreachWorkflow,
  listBreachesWorkflow,
  registerBreach,
  sendBreachHhsNotification,
  sendBreachMediaNotice,
  sendBreachPatientNotifications,
  type AssessRiskRequest,
  type BreachActivity,
  type BreachRiskLevel,
  type BreachStatus,
  type BreachWorkflowSummary,
} from '@/api/compliance';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_COLORS: Record<BreachStatus, { bg: string; fg: string }> = {
  draft: { bg: '#f1f5f9', fg: '#475569' },
  confirmed: { bg: '#fef3c7', fg: '#92400e' },
  assessed: { bg: '#dbeafe', fg: '#1e40af' },
  notifying: { bg: '#ede9fe', fg: '#5b21b6' },
  hhs_notified: { bg: '#dcfce7', fg: '#166534' },
  closed: { bg: '#d1fae5', fg: '#065f46' },
  overdue: { bg: '#fee2e2', fg: '#991b1b' },
};

function statusBadge(s: BreachStatus) {
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.draft;
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 12, fontWeight: 600,
    }}>
      {s}
    </span>
  );
}

function deadlineBadge(b: BreachWorkflowSummary) {
  if (b.daysUntilDeadline === null) return null;
  if (b.isOverdue) {
    return (
      <span style={{ color: '#991b1b', fontWeight: 600 }}>
        OVERDUE by {Math.abs(b.daysUntilDeadline)}d
      </span>
    );
  }
  if (b.daysUntilDeadline <= 7) {
    return (
      <span style={{ color: '#b45309', fontWeight: 600 }}>
        {b.daysUntilDeadline}d remaining
      </span>
    );
  }
  return <span style={{ color: '#64748b' }}>{b.daysUntilDeadline}d remaining</span>;
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

type ModalKind =
  | 'register'
  | 'assess'
  | 'send-patients'
  | 'send-media'
  | 'send-hhs'
  | 'close'
  | null;

// HIPAA §164.402 four-factor risk-of-compromise assessment. Structured
// capture beats a single free-text blob.
const RISK_FACTORS = [
  { key: 'phiNature', label: '1. Nature & extent of PHI involved (identifiers, financial, clinical)' },
  { key: 'unauthorizedPerson', label: '2. Unauthorized person who used or received the PHI' },
  { key: 'actualAcquisition', label: '3. Whether PHI was actually acquired or viewed' },
  { key: 'mitigation', label: '4. Extent risk has been mitigated' },
] as const;

export function BreachWorkflowPage() {
  const [items, setItems] = useState<BreachWorkflowSummary[]>([]);
  const [selected, setSelected] = useState<BreachWorkflowSummary | null>(null);
  const [activity, setActivity] = useState<BreachActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  // Register form
  const [registerDate, setRegisterDate] = useState(new Date().toISOString().slice(0, 10));
  const [registerAffected, setRegisterAffected] = useState('');
  const [registerPhiTypes, setRegisterPhiTypes] = useState('');
  const [registerDescription, setRegisterDescription] = useState('');

  // Assess-risk form
  const [riskLevel, setRiskLevel] = useState<BreachRiskLevel>('Moderate');
  const [riskFactors, setRiskFactors] = useState<Record<string, string>>({});
  const [riskAffected, setRiskAffected] = useState('');

  // Notification / close form
  const [actionNotes, setActionNotes] = useState('');

  // Every breach mutation (register, assess-risk, send-*, close) lives on
  // BreachWorkflowController / BreachNotificationsController, both gated by
  // [Authorize(Policy = compliance:breaches)]. The list/detail GETs share that
  // policy with the route guard, so only the action triggers are gated.
  const canManage = usePermission(PERMISSIONS.COMPLIANCE_BREACHES);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listBreachesWorkflow();
      setItems(data);
    } catch {
      setError('Failed to load breach list.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function openDetail(b: BreachWorkflowSummary) {
    setActionMsg(null);
    setError(null);
    try {
      const [full, act] = await Promise.all([
        getBreachWorkflow(b.id),
        getBreachActivity(b.id),
      ]);
      setSelected(full);
      setActivity(act.data);
    } catch (err) {
      setError(extractError(err, 'Failed to load breach detail.'));
    }
  }

  async function runWorkflow(fn: () => Promise<BreachWorkflowSummary>, successMsg: string) {
    setError(null);
    setActionMsg(null);
    try {
      const updated = await fn();
      setSelected(updated);
      const act = await getBreachActivity(updated.id);
      setActivity(act.data);
      await refresh();
      setActionMsg(successMsg);
    } catch (err) {
      setError(extractError(err, 'Workflow action failed.'));
    }
  }

  function openModal(kind: Exclude<ModalKind, null>, b?: BreachWorkflowSummary) {
    setActionNotes('');
    if (kind === 'register') {
      setRegisterDate(new Date().toISOString().slice(0, 10));
      setRegisterAffected('');
      setRegisterPhiTypes('');
      setRegisterDescription('');
    }
    if (kind === 'assess' && b) {
      setRiskLevel((b.riskLevel as BreachRiskLevel) ?? 'Moderate');
      setRiskFactors({});
      setRiskAffected(b.affectedPatientCount?.toString() ?? '');
    }
    setModal(kind);
  }

  async function submitRegister() {
    try {
      await registerBreach({
        discoveredAt: new Date(registerDate).toISOString(),
        affectedPatientCount: registerAffected ? Number(registerAffected) : null,
        phiTypesInvolved: registerPhiTypes.trim() || null,
        description: registerDescription.trim() || null,
      });
      setModal(null);
      setActionMsg('Breach registered');
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to register breach.'));
    }
  }

  async function submitAssess() {
    if (!selected) return;
    // Stitch the 4-factor structured input into the single notes field
    // the backend expects, with labelled sections so the activity log
    // preserves the structure for auditors.
    const stitched = RISK_FACTORS
      .map((f) => `${f.label}: ${riskFactors[f.key]?.trim() || '(not assessed)'}`)
      .join('\n');
    const affected = riskAffected ? Number(riskAffected) : null;
    const req: AssessRiskRequest = {
      riskLevel,
      notes: stitched,
      affectedPatientCount: affected,
      mediaNoticeRequired: (affected ?? 0) >= 500,
    };
    setModal(null);
    await runWorkflow(
      () => assessBreachRisk(selected.id, req),
      `Risk assessed as ${riskLevel}`,
    );
  }

  async function submitSendPatients() {
    if (!selected) return;
    setModal(null);
    await runWorkflow(
      () => sendBreachPatientNotifications(selected.id, actionNotes.trim() || null),
      'Patient notifications marked sent',
    );
  }

  async function submitSendMedia() {
    if (!selected) return;
    setModal(null);
    await runWorkflow(
      () => sendBreachMediaNotice(selected.id, actionNotes.trim() || null),
      'Media notice marked sent',
    );
  }

  async function submitSendHhs() {
    if (!selected) return;
    setModal(null);
    await runWorkflow(
      () => sendBreachHhsNotification(selected.id, actionNotes.trim() || null),
      'HHS notification marked sent',
    );
  }

  async function submitClose() {
    if (!selected) return;
    const requiresNote = selected.confirmedAt !== null && selected.hhsNotifiedAt === null;
    if (requiresNote && !actionNotes.trim()) {
      setError('Closure note is required when closing without HHS notification.');
      return;
    }
    setModal(null);
    await runWorkflow(
      () => closeBreach(selected.id, actionNotes.trim() || null),
      'Breach closed',
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>HIPAA Breach Workflow</h2>
          <p style={{ color: '#64748b', marginTop: 4, maxWidth: 720 }}>
            State-machine view of breach notifications: confirm → assess
            risk → notify individuals/media/HHS → close. 60-day deadline
            tracking and activity log per HIPAA §164.404, §164.406,
            §164.408, §164.414(b).
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal('register')}
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
        >
          + Register breach
        </button>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      {isLoading && <div role="status">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <p style={{ color: '#64748b' }}>No breach notifications recorded.</p>
      )}
      {!isLoading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Discovered</th>
              <th style={{ padding: '6px 10px' }}>Status</th>
              <th style={{ padding: '6px 10px' }}>Risk</th>
              <th style={{ padding: '6px 10px' }}>Affected</th>
              <th style={{ padding: '6px 10px' }}>Deadline</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px' }}>{b.discoveredAt.slice(0, 10)}</td>
                <td style={{ padding: '6px 10px' }}>
                  {statusBadge(b.isOverdue ? 'overdue' : b.status)}
                </td>
                <td style={{ padding: '6px 10px' }}>{b.riskLevel ?? '—'}</td>
                <td style={{ padding: '6px 10px' }}>
                  {b.affectedPatientCount ?? '—'}
                </td>
                <td style={{ padding: '6px 10px' }}>{deadlineBadge(b)}</td>
                <td style={{ padding: '6px 10px' }}>
                  <button type="button" onClick={() => void openDetail(b)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section style={{
          border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
          background: '#f8fafc', display: 'grid', gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Breach #{selected.id}</h3>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Discovered {selected.discoveredAt.slice(0, 10)} ·{' '}
                {statusBadge(selected.isOverdue ? 'overdue' : selected.status)}{' · '}
                {deadlineBadge(selected)}
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)}>Close panel</button>
          </div>

          {selected.description && (
            <div style={{ color: '#475569' }}>{selected.description}</div>
          )}

          <div style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13 }}>
            <div><strong>Confirmed:</strong> {selected.confirmedAt?.slice(0, 10) ?? '—'}</div>
            <div>
              <strong>Risk Assessment:</strong>{' '}
              {selected.riskAssessmentAt
                ? `${selected.riskLevel} on ${selected.riskAssessmentAt.slice(0, 10)}`
                : '—'}
            </div>
            <div>
              <strong>Patient Notifications:</strong>{' '}
              {selected.patientNotificationsSentAt?.slice(0, 10) ?? '—'}
            </div>
            <div>
              <strong>Media Notice:</strong>{' '}
              {selected.mediaNoticeRequired
                ? selected.mediaNoticeSentAt
                  ? `Sent ${selected.mediaNoticeSentAt.slice(0, 10)}`
                  : 'Required, not yet sent'
                : 'Not required'}
            </div>
            <div><strong>HHS Notification:</strong> {selected.hhsNotifiedAt?.slice(0, 10) ?? '—'}</div>
            <div><strong>Closed:</strong> {selected.closedAt?.slice(0, 10) ?? '—'}</div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selected.confirmedAt && selected.riskAssessmentAt === null && (
              <button
                onClick={() => openModal('assess', selected)}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
              >
                Assess Risk
              </button>
            )}
            {selected.riskAssessmentAt
              && selected.patientNotificationsSentAt === null
              && selected.status !== 'closed' && (
                <button
                  onClick={() => openModal('send-patients')}
                  disabled={!canManage}
                  title={!canManage ? NO_PERMISSION : undefined}
                  style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
                >
                  Mark Patient Notifications Sent
                </button>
              )}
            {selected.mediaNoticeRequired
              && selected.mediaNoticeSentAt === null
              && selected.status !== 'closed' && (
                <button
                  onClick={() => openModal('send-media')}
                  disabled={!canManage}
                  title={!canManage ? NO_PERMISSION : undefined}
                  style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
                >
                  Mark Media Notice Sent
                </button>
              )}
            {selected.riskAssessmentAt
              && selected.hhsNotifiedAt === null
              && selected.status !== 'closed' && (
                <button
                  onClick={() => openModal('send-hhs')}
                  disabled={!canManage}
                  title={!canManage ? NO_PERMISSION : undefined}
                  style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
                >
                  Mark HHS Notified
                </button>
              )}
            {selected.status !== 'closed' && (
              <button
                onClick={() => openModal('close')}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
              >
                Close Breach
              </button>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Activity</h4>
            {activity.length === 0 ? (
              <p style={{ color: '#64748b' }}>No activity yet.</p>
            ) : (
              <ul style={{ paddingLeft: 18, display: 'grid', gap: 4 }}>
                {activity.map((a) => (
                  <li key={a.id}>
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                      {a.occurredAtUtc.slice(0, 19).replace('T', ' ')}
                    </span>
                    {' · '}<strong>{a.eventType}</strong>
                    {' · '}<span style={{ color: '#475569' }}>{a.actorEmail}</span>
                    {a.notes && (
                      <pre style={{
                        color: '#0f172a', margin: '4px 0 0 0',
                        fontFamily: 'inherit', fontSize: 13,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {a.notes}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            modal === 'register' ? 'Register breach'
              : modal === 'assess' ? 'Assess breach risk'
              : modal === 'send-patients' ? 'Mark patient notifications sent'
              : modal === 'send-media' ? 'Mark media notice sent'
              : modal === 'send-hhs' ? 'Mark HHS notified'
              : 'Close breach'
          }
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{
            background: '#fff', padding: 24, borderRadius: 8,
            minWidth: 480, maxWidth: 640, maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            {modal === 'register' && (
              <>
                <h3 style={{ marginTop: 0 }}>Register breach</h3>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Discovered on
                  <input
                    type="date"
                    value={registerDate}
                    onChange={(e) => setRegisterDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Affected patient count (estimated; ≥500 triggers media notice)
                  <input
                    type="number"
                    min={0}
                    value={registerAffected}
                    onChange={(e) => setRegisterAffected(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  PHI types involved
                  <input
                    type="text"
                    placeholder="e.g. names, SSN, treatment records"
                    value={registerPhiTypes}
                    onChange={(e) => setRegisterPhiTypes(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Description
                  <textarea
                    rows={4}
                    value={registerDescription}
                    onChange={(e) => setRegisterDescription(e.target.value)}
                    placeholder="What happened, when, how was it discovered…"
                    style={{ width: '100%' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" onClick={() => { void submitRegister(); }}>
                    Register
                  </button>
                </div>
              </>
            )}

            {modal === 'assess' && (
              <>
                <h3 style={{ marginTop: 0 }}>Risk assessment</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  HIPAA §164.402: assess the four factors to determine
                  whether the impermissible use/disclosure compromised PHI.
                  All four are required for the determination to be
                  defensible.
                </p>
                <label style={{ display: 'block', marginBottom: 12 }}>
                  Risk level
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as BreachRiskLevel)}
                    style={{ width: '100%' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </label>
                {RISK_FACTORS.map((f) => (
                  <label key={f.key} style={{ display: 'block', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: '#475569' }}>{f.label}</div>
                    <textarea
                      rows={2}
                      value={riskFactors[f.key] ?? ''}
                      onChange={(e) =>
                        setRiskFactors((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      style={{ width: '100%' }}
                    />
                  </label>
                ))}
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Affected patient count (≥500 triggers media notice)
                  <input
                    type="number"
                    min={0}
                    value={riskAffected}
                    onChange={(e) => setRiskAffected(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" onClick={() => { void submitAssess(); }}>
                    Save assessment
                  </button>
                </div>
              </>
            )}

            {(modal === 'send-patients' || modal === 'send-media' || modal === 'send-hhs') && (
              <>
                <h3 style={{ marginTop: 0 }}>
                  {modal === 'send-patients' && 'Patient notifications sent'}
                  {modal === 'send-media' && 'Media notice sent'}
                  {modal === 'send-hhs' && 'HHS notification sent'}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  Notes are appended to the activity log. Reference batch IDs,
                  publication URLs, or OCR submission numbers as appropriate.
                </p>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Notes (optional)
                  <textarea
                    rows={4}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modal === 'send-patients') void submitSendPatients();
                      else if (modal === 'send-media') void submitSendMedia();
                      else void submitSendHhs();
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {modal === 'close' && (
              <>
                <h3 style={{ marginTop: 0 }}>Close breach</h3>
                {selected && selected.confirmedAt && selected.hhsNotifiedAt === null && (
                  <p style={{ fontSize: 13, color: '#b45309' }}>
                    HHS has not been notified for this breach. A closure note
                    explaining the reason is required.
                  </p>
                )}
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Closure notes
                  <textarea
                    rows={4}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" onClick={() => { void submitClose(); }}>
                    Close breach
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
