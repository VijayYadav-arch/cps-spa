import { useEffect, useState } from 'react';
import {
  getPhiAnomalies,
  getPhiPatientAccess,
  getPhiRetentionStatus,
  getPhiUserAccess,
  recordPhiReview,
  type AnomalyReport,
  type PatientAccessReport,
  type PhiAccessEvent,
  type PhiAnomalyFlag,
  type RetentionStatus,
  type ReviewResult,
  type UserAccessReport,
} from '@/api/compliance';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

type Tab = 'anomalies' | 'patient' | 'user' | 'retention';

const FLAG_COLORS: Record<PhiAnomalyFlag, { bg: string; fg: string }> = {
  BulkRead: { bg: '#fee2e2', fg: '#991b1b' },
  OffHours: { bg: '#fef3c7', fg: '#92400e' },
  CrossOrg: { bg: '#ede9fe', fg: '#5b21b6' },
  Modify: { bg: '#dbeafe', fg: '#1e40af' },
};

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 170,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function flagBadge(f: PhiAnomalyFlag) {
  const c = FLAG_COLORS[f];
  return (
    <span
      key={f}
      style={{
        background: c.bg,
        color: c.fg,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        marginRight: 4,
      }}
    >
      {f}
    </span>
  );
}

function eventsTable(events: PhiAccessEvent[]) {
  if (events.length === 0) {
    return <p style={{ color: '#64748b' }}>No events.</p>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
          <th style={{ padding: '6px 10px' }}>When</th>
          <th style={{ padding: '6px 10px' }}>User</th>
          <th style={{ padding: '6px 10px' }}>Action</th>
          <th style={{ padding: '6px 10px' }}>Resource</th>
          <th style={{ padding: '6px 10px' }}>Patient</th>
          <th style={{ padding: '6px 10px' }}>IP</th>
          <th style={{ padding: '6px 10px' }}>Flags</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '6px 10px', fontSize: 12 }}>
              {e.createdAt.slice(0, 19).replace('T', ' ')}
            </td>
            <td style={{ padding: '6px 10px' }}>
              {e.userEmail ?? `#${e.userId ?? '—'}`}
            </td>
            <td style={{ padding: '6px 10px' }}>{e.eventType}</td>
            <td style={{ padding: '6px 10px', color: '#64748b' }}>
              {e.resourceType ?? '—'}
              {e.resourceId !== null && `#${e.resourceId}`}
            </td>
            <td style={{ padding: '6px 10px' }}>
              {e.patientId === null ? '—' : `#${e.patientId}`}
            </td>
            <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 12 }}>
              {e.ipAddress ?? '—'}
            </td>
            <td style={{ padding: '6px 10px' }}>
              {e.anomalyFlags.length === 0 ? '—' : e.anomalyFlags.map(flagBadge)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime());
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

export function PhiAccessReviewDashboard() {
  const [tab, setTab] = useState<Tab>('anomalies');
  const [range, setRange] = useState(defaultRange);
  const [patientId, setPatientId] = useState('');
  const [userId, setUserId] = useState('');

  const [anomalies, setAnomalies] = useState<AnomalyReport | null>(null);
  const [patientReport, setPatientReport] = useState<PatientAccessReport | null>(null);
  const [userReport, setUserReport] = useState<UserAccessReport | null>(null);
  const [retention, setRetention] = useState<RetentionStatus | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Attest maps to POST /compliance/phi-access/reviews → [Authorize(Policy =
  // compliance:phi_review)]. The read endpoints share the same policy as the
  // route guard, so only the state-changing attestation is gated here.
  const canReview = usePermission(PERMISSIONS.COMPLIANCE_PHI_REVIEW);

  async function loadAnomalies() {
    setIsLoading(true);
    setError(null);
    try {
      setAnomalies(await getPhiAnomalies(range.from, range.to));
    } catch {
      setError('Failed to load anomalies.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPatient(id: number) {
    setIsLoading(true);
    setError(null);
    try {
      setPatientReport(await getPhiPatientAccess(id, range.from, range.to));
    } catch (err) {
      setError(extractError(err, 'Failed to load patient access.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUser(id: number) {
    setIsLoading(true);
    setError(null);
    try {
      setUserReport(await getPhiUserAccess(id, range.from, range.to));
    } catch (err) {
      setError(extractError(err, 'Failed to load user access.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRetention() {
    setIsLoading(true);
    setError(null);
    try {
      setRetention(await getPhiRetentionStatus());
    } catch {
      setError('Failed to load retention status.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'anomalies') void loadAnomalies();
    else if (tab === 'retention') void loadRetention();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function attest(
    subjectType: 'patient' | 'user',
    subjectId: number,
    eventCount: number,
  ) {
    const result = window.prompt(
      'Attestation result (ok | investigate | escalated):',
      'ok',
    ) as ReviewResult | null;
    if (!result || !['ok', 'investigate', 'escalated'].includes(result)) return;
    const notes = window.prompt('Notes (optional):') ?? '';
    try {
      await recordPhiReview({
        subjectType,
        subjectId,
        windowFromUtc: range.from,
        windowToUtc: range.to,
        result,
        notes: notes.trim() || null,
        eventCount,
      });
      setActionMsg(`Review recorded (${result}).`);
      if (subjectType === 'patient') await loadPatient(subjectId);
      else await loadUser(subjectId);
    } catch (err) {
      setError(extractError(err, 'Failed to record review.'));
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 16 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>PHI Access Review</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          HIPAA §164.308(a)(1)(ii)(D) — regularly review records of information
          system activity. Compliance officers attest to their review here, which
          creates a durable audit artifact.
        </p>
      </header>

      <nav style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
        {(['anomalies', 'patient', 'user', 'retention'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderBottom: tab === t ? '2px solid #0ea5e9' : '2px solid transparent',
              background: 'none',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t === 'anomalies' && 'Anomalies'}
            {t === 'patient' && 'By Patient'}
            {t === 'user' && 'By User'}
            {t === 'retention' && 'Retention'}
          </button>
        ))}
      </nav>

      {tab !== 'retention' && (
        <form
          style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === 'anomalies') void loadAnomalies();
            else if (tab === 'patient' && patientId) void loadPatient(Number(patientId));
            else if (tab === 'user' && userId) void loadUser(Number(userId));
          }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span>From (UTC)</span>
            <input
              type="datetime-local"
              value={range.from.slice(0, 16)}
              onChange={(e) =>
                setRange({ ...range, from: new Date(e.target.value).toISOString() })
              }
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>To (UTC)</span>
            <input
              type="datetime-local"
              value={range.to.slice(0, 16)}
              onChange={(e) =>
                setRange({ ...range, to: new Date(e.target.value).toISOString() })
              }
            />
          </label>
          {tab === 'patient' && (
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Patient ID</span>
              <input
                type="number"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                style={{ width: 100 }}
              />
            </label>
          )}
          {tab === 'user' && (
            <label style={{ display: 'grid', gap: 4 }}>
              <span>User ID</span>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                style={{ width: 100 }}
              />
            </label>
          )}
          <button type="submit">Apply</button>
        </form>
      )}

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      {tab === 'anomalies' && anomalies && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard(
              'Total Anomalies',
              anomalies.totalAnomalies.toString(),
              anomalies.totalAnomalies > 0 ? '#b91c1c' : '#15803d',
            )}
            {metricCard('Bulk Read', anomalies.bulkReadCount.toString(), '#991b1b')}
            {metricCard('Off Hours', anomalies.offHoursCount.toString(), '#92400e')}
            {metricCard('Cross-Org', anomalies.crossOrgCount.toString(), '#5b21b6')}
          </section>
          {eventsTable(anomalies.events)}
        </>
      )}

      {tab === 'patient' && patientReport && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Patient', `#${patientReport.patientId}`, '#0f172a')}
            {metricCard('Total Events', patientReport.totalEvents.toString(), '#0f172a')}
            {metricCard('Distinct Users', patientReport.distinctUserCount.toString(), '#0f172a')}
            {metricCard('Modifications', patientReport.modificationCount.toString(), '#1e40af')}
            {metricCard(
              'Anomalies',
              patientReport.anomalyCount.toString(),
              patientReport.anomalyCount > 0 ? '#b91c1c' : '#15803d',
            )}
          </section>
          <ReviewBanner
            lastReviewedAtUtc={patientReport.lastReviewedAtUtc}
            lastReviewResult={patientReport.lastReviewResult}
          />
          <div>
            <button
              type="button"
              onClick={() =>
                void attest('patient', patientReport.patientId, patientReport.totalEvents)
              }
              disabled={!canReview}
              title={!canReview ? NO_PERMISSION : undefined}
              style={{ cursor: !canReview ? 'not-allowed' : 'pointer' }}
            >
              Attest Review
            </button>
          </div>
          {eventsTable(patientReport.events)}
        </>
      )}

      {tab === 'user' && userReport && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard(
              'User',
              userReport.userEmail ?? `#${userReport.userId}`,
              '#0f172a',
            )}
            {metricCard('Total Events', userReport.totalEvents.toString(), '#0f172a')}
            {metricCard('Distinct Patients', userReport.distinctPatientCount.toString(), '#0f172a')}
            {metricCard('Off Hours', userReport.offHoursCount.toString(), '#92400e')}
            {metricCard(
              'Anomalies',
              userReport.anomalyCount.toString(),
              userReport.anomalyCount > 0 ? '#b91c1c' : '#15803d',
            )}
          </section>
          <ReviewBanner
            lastReviewedAtUtc={userReport.lastReviewedAtUtc}
            lastReviewResult={userReport.lastReviewResult}
          />
          <div>
            <button
              type="button"
              onClick={() =>
                void attest('user', userReport.userId, userReport.totalEvents)
              }
              disabled={!canReview}
              title={!canReview ? NO_PERMISSION : undefined}
              style={{ cursor: !canReview ? 'not-allowed' : 'pointer' }}
            >
              Attest Review
            </button>
          </div>
          {eventsTable(userReport.events)}
        </>
      )}

      {tab === 'retention' && retention && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Total Events', retention.totalEvents.toString(), '#0f172a')}
            {metricCard('< 1 year', retention.under1YearCount.toString(), '#0f172a')}
            {metricCard('1–3 years', retention.between1And3YearsCount.toString(), '#0f172a')}
            {metricCard('3–6 years', retention.between3And6YearsCount.toString(), '#0f172a')}
            {metricCard(
              `> ${retention.minimumRequiredYears} years`,
              retention.over6YearsCount.toString(),
              retention.over6YearsCount > 0 ? '#15803d' : '#64748b',
            )}
          </section>
          <section
            style={{
              padding: 12,
              borderRadius: 6,
              background: '#f8fafc',
              color: '#475569',
            }}
          >
            HIPAA §164.530(j) requires PHI access records to be retained for at least{' '}
            <strong>{retention.minimumRequiredYears} years</strong>.{' '}
            {retention.oldestEventAtUtc
              ? `Oldest event is from ${retention.oldestEventAtUtc.slice(0, 10)}.`
              : 'No events yet recorded.'}
          </section>
        </>
      )}
    </div>
  );
}

interface ReviewBannerProps {
  lastReviewedAtUtc: string | null;
  lastReviewResult: string | null;
}

function ReviewBanner({ lastReviewedAtUtc, lastReviewResult }: ReviewBannerProps) {
  if (!lastReviewedAtUtc) {
    return (
      <section
        style={{
          padding: 10,
          borderRadius: 6,
          background: '#fef3c7',
          color: '#92400e',
        }}
      >
        Never reviewed. Compliance attestation required.
      </section>
    );
  }
  const bg = lastReviewResult === 'ok' ? '#f0fdf4' : '#fef2f2';
  const fg = lastReviewResult === 'ok' ? '#166534' : '#991b1b';
  return (
    <section style={{ padding: 10, borderRadius: 6, background: bg, color: fg }}>
      Last reviewed {lastReviewedAtUtc.slice(0, 10)} —{' '}
      <strong>{lastReviewResult}</strong>
    </section>
  );
}
