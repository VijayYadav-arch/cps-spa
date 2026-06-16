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

const ROW_ACTION_BTN =
  'rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed';

const STATUS_COLORS: Record<BreachStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-amber-100 text-amber-800',
  assessed: 'bg-blue-100 text-blue-800',
  notifying: 'bg-violet-100 text-violet-800',
  hhs_notified: 'bg-green-100 text-green-800',
  closed: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
};

function statusBadge(s: BreachStatus) {
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.draft;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${c}`}>
      {s}
    </span>
  );
}

function deadlineBadge(b: BreachWorkflowSummary) {
  if (b.daysUntilDeadline === null) return null;
  if (b.isOverdue) {
    return (
      <span className="font-semibold text-red-800">
        OVERDUE by {Math.abs(b.daysUntilDeadline)}d
      </span>
    );
  }
  if (b.daysUntilDeadline <= 7) {
    return (
      <span className="font-semibold text-accent-700">
        {b.daysUntilDeadline}d remaining
      </span>
    );
  }
  return <span className="text-slate-500">{b.daysUntilDeadline}d remaining</span>;
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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl">HIPAA Breach Workflow</h2>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
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
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          + Register breach
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <p className="text-slate-500">No breach notifications recorded.</p>
      )}
      {!isLoading && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Discovered</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Affected</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{b.discoveredAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {statusBadge(b.isOverdue ? 'overdue' : b.status)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{b.riskLevel ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {b.affectedPatientCount ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{deadlineBadge(b)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <button type="button" onClick={() => void openDetail(b)} className={ROW_ACTION_BTN}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">Breach #{selected.id}</h3>
              <div className="mt-1 text-[13px] text-slate-500">
                Discovered {selected.discoveredAt.slice(0, 10)} ·{' '}
                {statusBadge(selected.isOverdue ? 'overdue' : selected.status)}{' · '}
                {deadlineBadge(selected)}
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)} className={ROW_ACTION_BTN}>Close panel</button>
          </div>

          {selected.description && (
            <div className="text-slate-600">{selected.description}</div>
          )}

          <div className="grid gap-1.5 text-[13px] text-slate-600">
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

          <div className="flex flex-wrap gap-1.5">
            {selected.confirmedAt && selected.riskAssessmentAt === null && (
              <button
                onClick={() => openModal('assess', selected)}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                className={ROW_ACTION_BTN}
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
                  className={ROW_ACTION_BTN}
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
                  className={ROW_ACTION_BTN}
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
                  className={ROW_ACTION_BTN}
                >
                  Mark HHS Notified
                </button>
              )}
            {selected.status !== 'closed' && (
              <button
                onClick={() => openModal('close')}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                className={ROW_ACTION_BTN}
              >
                Close Breach
              </button>
            )}
          </div>

          <div>
            <h4 className="mb-1.5 text-sm font-semibold text-slate-700">Activity</h4>
            {activity.length === 0 ? (
              <p className="text-slate-500">No activity yet.</p>
            ) : (
              <ul className="grid gap-1 pl-4">
                {activity.map((a) => (
                  <li key={a.id}>
                    <span className="text-[13px] text-slate-500">
                      {a.occurredAtUtc.slice(0, 19).replace('T', ' ')}
                    </span>
                    {' · '}<strong>{a.eventType}</strong>
                    {' · '}<span className="text-slate-600">{a.actorEmail}</span>
                    {a.notes && (
                      <pre className="m-0 mt-1 whitespace-pre-wrap font-sans text-[13px] text-slate-900">
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/50"
        >
          <div className="max-h-[85vh] min-w-[480px] max-w-[640px] overflow-y-auto rounded-xl bg-white p-6 shadow-sm">
            {modal === 'register' && (
              <>
                <h3 className="text-lg font-semibold">Register breach</h3>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Discovered on</span>
                  <input
                    type="date"
                    value={registerDate}
                    onChange={(e) => setRegisterDate(e.target.value)}
                    className="form-input"
                  />
                </label>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Affected patient count (estimated; ≥500 triggers media notice)</span>
                  <input
                    type="number"
                    min={0}
                    value={registerAffected}
                    onChange={(e) => setRegisterAffected(e.target.value)}
                    className="form-input"
                  />
                </label>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">PHI types involved</span>
                  <input
                    type="text"
                    placeholder="e.g. names, SSN, treatment records"
                    value={registerPhiTypes}
                    onChange={(e) => setRegisterPhiTypes(e.target.value)}
                    className="form-input"
                  />
                </label>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Description</span>
                  <textarea
                    rows={4}
                    value={registerDescription}
                    onChange={(e) => setRegisterDescription(e.target.value)}
                    placeholder="What happened, when, how was it discovered…"
                    className="form-input"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className={ROW_ACTION_BTN}>Cancel</button>
                  <button type="button" onClick={() => { void submitRegister(); }} className="btn-primary">
                    Register
                  </button>
                </div>
              </>
            )}

            {modal === 'assess' && (
              <>
                <h3 className="text-lg font-semibold">Risk assessment</h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  HIPAA §164.402: assess the four factors to determine
                  whether the impermissible use/disclosure compromised PHI.
                  All four are required for the determination to be
                  defensible.
                </p>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Risk level</span>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as BreachRiskLevel)}
                    className="form-input"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </label>
                {RISK_FACTORS.map((f) => (
                  <label key={f.key} className="mt-3 grid gap-1.5">
                    <span className="text-[13px] text-slate-600">{f.label}</span>
                    <textarea
                      rows={2}
                      value={riskFactors[f.key] ?? ''}
                      onChange={(e) =>
                        setRiskFactors((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      className="form-input"
                    />
                  </label>
                ))}
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Affected patient count (≥500 triggers media notice)</span>
                  <input
                    type="number"
                    min={0}
                    value={riskAffected}
                    onChange={(e) => setRiskAffected(e.target.value)}
                    className="form-input"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className={ROW_ACTION_BTN}>Cancel</button>
                  <button type="button" onClick={() => { void submitAssess(); }} className="btn-primary">
                    Save assessment
                  </button>
                </div>
              </>
            )}

            {(modal === 'send-patients' || modal === 'send-media' || modal === 'send-hhs') && (
              <>
                <h3 className="text-lg font-semibold">
                  {modal === 'send-patients' && 'Patient notifications sent'}
                  {modal === 'send-media' && 'Media notice sent'}
                  {modal === 'send-hhs' && 'HHS notification sent'}
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  Notes are appended to the activity log. Reference batch IDs,
                  publication URLs, or OCR submission numbers as appropriate.
                </p>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Notes (optional)</span>
                  <textarea
                    rows={4}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="form-input"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className={ROW_ACTION_BTN}>Cancel</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modal === 'send-patients') void submitSendPatients();
                      else if (modal === 'send-media') void submitSendMedia();
                      else void submitSendHhs();
                    }}
                    className="btn-primary"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {modal === 'close' && (
              <>
                <h3 className="text-lg font-semibold">Close breach</h3>
                {selected && selected.confirmedAt && selected.hhsNotifiedAt === null && (
                  <p className="mt-1 text-[13px] text-accent-700">
                    HHS has not been notified for this breach. A closure note
                    explaining the reason is required.
                  </p>
                )}
                <label className="mt-3 grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Closure notes</span>
                  <textarea
                    rows={4}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="form-input"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setModal(null)} className={ROW_ACTION_BTN}>Cancel</button>
                  <button type="button" onClick={() => { void submitClose(); }} className="btn-primary">
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
