import { useEffect, useState } from 'react';
import {
  assessBreachRisk,
  closeBreach,
  getBreachActivity,
  getBreachWorkflow,
  listBreachesWorkflow,
  sendBreachHhsNotification,
  sendBreachMediaNotice,
  sendBreachPatientNotifications,
  type AssessRiskRequest,
  type BreachActivity,
  type BreachRiskLevel,
  type BreachStatus,
  type BreachWorkflowSummary,
} from '@/api/compliance';

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
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {s}
    </span>
  );
}

function deadlineBadge(b: BreachWorkflowSummary) {
  if (b.daysUntilDeadline === null) return null;
  if (b.isOverdue) {
    return (
      <span style={{ color: '#991b1b', fontWeight: 600 }}>
        OVERDUE ({Math.abs(b.daysUntilDeadline)}d past)
      </span>
    );
  }
  const color =
    b.daysUntilDeadline <= 10 ? '#b45309' :
    b.daysUntilDeadline <= 30 ? '#0e7490' : '#15803d';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {b.daysUntilDeadline}d until 60-day deadline
    </span>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

export function BreachWorkflowPage() {
  const [items, setItems] = useState<BreachWorkflowSummary[]>([]);
  const [selected, setSelected] = useState<BreachWorkflowSummary | null>(null);
  const [activity, setActivity] = useState<BreachActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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

  useEffect(() => {
    void refresh();
  }, []);

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

  async function runWorkflow(fn: () => Promise<BreachWorkflowSummary>) {
    setError(null);
    try {
      const updated = await fn();
      setSelected(updated);
      const act = await getBreachActivity(updated.id);
      setActivity(act.data);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Workflow action failed.'));
    }
  }

  async function handleAssess(b: BreachWorkflowSummary) {
    const lvl = window.prompt(
      'Risk level — Low | Moderate | High:',
      b.riskLevel ?? 'Moderate',
    ) as BreachRiskLevel | null;
    if (!lvl || !['Low', 'Moderate', 'High'].includes(lvl)) return;
    const notes = window.prompt('Risk assessment notes (4-factor):') ?? '';
    const affectedStr = window.prompt(
      'Affected patient count (>= 500 triggers media notice):',
      b.affectedPatientCount?.toString() ?? '',
    );
    const affected = affectedStr ? Number(affectedStr) : null;
    const req: AssessRiskRequest = {
      riskLevel: lvl,
      notes: notes.trim() || null,
      affectedPatientCount: affected,
      mediaNoticeRequired: (affected ?? 0) >= 500,
    };
    await runWorkflow(() => assessBreachRisk(b.id, req));
  }

  async function handleSendPatients(b: BreachWorkflowSummary) {
    const notes = window.prompt('Notes (letters mailed batch, etc.):') ?? '';
    await runWorkflow(() => sendBreachPatientNotifications(b.id, notes.trim() || null));
  }

  async function handleSendMedia(b: BreachWorkflowSummary) {
    const notes = window.prompt('Notes (publication, URL):') ?? '';
    await runWorkflow(() => sendBreachMediaNotice(b.id, notes.trim() || null));
  }

  async function handleSendHhs(b: BreachWorkflowSummary) {
    const notes = window.prompt('Notes (OCR submission reference):') ?? '';
    await runWorkflow(() => sendBreachHhsNotification(b.id, notes.trim() || null));
  }

  async function handleClose(b: BreachWorkflowSummary) {
    const requiresNote = b.confirmedAt !== null && b.hhsNotifiedAt === null;
    const notes = window.prompt(
      requiresNote
        ? 'Closure note required (no HHS notification yet):'
        : 'Closure note (optional):',
    );
    if (requiresNote && (!notes || !notes.trim())) {
      setError('Closure note is required when closing without HHS notification.');
      return;
    }
    await runWorkflow(() => closeBreach(b.id, notes?.trim() || null));
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          HIPAA Breach Workflow
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          State-machine view of breach notifications: confirm → assess risk →
          notify individuals/media/HHS → close. 60-day deadline tracking and
          activity log per HIPAA §164.404, §164.406, §164.408, §164.414(b).
        </p>
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
        <section
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 16,
            background: '#f8fafc',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                Breach #{selected.id}
              </h3>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Discovered {selected.discoveredAt.slice(0, 10)} ·
                {' '}{statusBadge(selected.isOverdue ? 'overdue' : selected.status)}
                {' · '}{deadlineBadge(selected)}
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)}>Close</button>
          </div>

          {selected.description && (
            <div style={{ color: '#475569' }}>{selected.description}</div>
          )}

          <div style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13 }}>
            <div>
              <strong>Confirmed:</strong>{' '}
              {selected.confirmedAt?.slice(0, 10) ?? '—'}
            </div>
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
            <div>
              <strong>HHS Notification:</strong>{' '}
              {selected.hhsNotifiedAt?.slice(0, 10) ?? '—'}
            </div>
            <div>
              <strong>Closed:</strong>{' '}
              {selected.closedAt?.slice(0, 10) ?? '—'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selected.confirmedAt && selected.riskAssessmentAt === null && (
              <button onClick={() => void handleAssess(selected)}>
                Assess Risk
              </button>
            )}
            {selected.riskAssessmentAt
              && selected.patientNotificationsSentAt === null
              && selected.status !== 'closed' && (
                <button onClick={() => void handleSendPatients(selected)}>
                  Mark Patient Notifications Sent
                </button>
              )}
            {selected.mediaNoticeRequired
              && selected.mediaNoticeSentAt === null
              && selected.status !== 'closed' && (
                <button onClick={() => void handleSendMedia(selected)}>
                  Mark Media Notice Sent
                </button>
              )}
            {selected.riskAssessmentAt
              && selected.hhsNotifiedAt === null
              && selected.status !== 'closed' && (
                <button onClick={() => void handleSendHhs(selected)}>
                  Mark HHS Notified
                </button>
              )}
            {selected.status !== 'closed' && (
              <button onClick={() => void handleClose(selected)}>Close Breach</button>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Activity
            </h4>
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
                      <span style={{ color: '#0f172a', marginLeft: 6 }}>
                        — {a.notes}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
