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

const ROW_ACTION_BTN =
  'rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed';

type Tab = 'anomalies' | 'patient' | 'user' | 'retention';

// Tone classes for metric values. Callers pass a semantic tone key.
type MetricTone = 'navy' | 'red' | 'green' | 'amber' | 'blue' | 'slate';
const METRIC_TONE: Record<MetricTone, string> = {
  navy: 'text-navy-900',
  red: 'text-red-700',
  green: 'text-success',
  amber: 'text-amber-800',
  blue: 'text-blue-800',
  slate: 'text-slate-500',
};

const FLAG_COLORS: Record<PhiAnomalyFlag, string> = {
  BulkRead: 'bg-red-100 text-red-800',
  OffHours: 'bg-amber-100 text-amber-800',
  CrossOrg: 'bg-violet-100 text-violet-800',
  Modify: 'bg-blue-100 text-blue-800',
};

function metricCard(label: string, value: string, tone: MetricTone) {
  return (
    <div className="card-hover min-w-[170px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${METRIC_TONE[tone]}`}>
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
      className={`mr-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${c}`}
    >
      {f}
    </span>
  );
}

function eventsTable(events: PhiAccessEvent[]) {
  if (events.length === 0) {
    return <p className="text-slate-500">No events.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Resource</th>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">IP</th>
            <th className="px-4 py-3">Flags</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 text-xs text-slate-700">
                {e.createdAt.slice(0, 19).replace('T', ' ')}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {e.userEmail ?? `#${e.userId ?? '—'}`}
              </td>
              <td className="px-4 py-3 text-slate-700">{e.eventType}</td>
              <td className="px-4 py-3 text-slate-500">
                {e.resourceType ?? '—'}
                {e.resourceId !== null && `#${e.resourceId}`}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {e.patientId === null ? '—' : `#${e.patientId}`}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {e.ipAddress ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {e.anomalyFlags.length === 0 ? '—' : e.anomalyFlags.map(flagBadge)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">PHI Access Review</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          HIPAA §164.308(a)(1)(ii)(D) — regularly review records of information
          system activity. Compliance officers attest to their review here, which
          creates a durable audit artifact.
        </p>
      </header>

      <nav className="flex gap-2 border-b border-slate-200">
        {(['anomalies', 'patient', 'user', 'retention'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 bg-transparent px-3.5 py-2 transition-colors ${
              tab === t
                ? 'border-teal-600 font-semibold text-navy-900'
                : 'border-transparent text-slate-600 hover:text-navy-900'
            }`}
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
          className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === 'anomalies') void loadAnomalies();
            else if (tab === 'patient' && patientId) void loadPatient(Number(patientId));
            else if (tab === 'user' && userId) void loadUser(Number(userId));
          }}
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">From (UTC)</span>
            <input
              type="datetime-local"
              className="form-input"
              value={range.from.slice(0, 16)}
              onChange={(e) =>
                setRange({ ...range, from: new Date(e.target.value).toISOString() })
              }
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">To (UTC)</span>
            <input
              type="datetime-local"
              className="form-input"
              value={range.to.slice(0, 16)}
              onChange={(e) =>
                setRange({ ...range, to: new Date(e.target.value).toISOString() })
              }
            />
          </label>
          {tab === 'patient' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Patient ID</span>
              <input
                type="number"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                className="form-input w-24"
              />
            </label>
          )}
          {tab === 'user' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">User ID</span>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="form-input w-24"
              />
            </label>
          )}
          <button type="submit" className="btn-primary">Apply</button>
        </form>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>
      )}

      {tab === 'anomalies' && anomalies && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricCard(
              'Total Anomalies',
              anomalies.totalAnomalies.toString(),
              anomalies.totalAnomalies > 0 ? 'red' : 'green',
            )}
            {metricCard('Bulk Read', anomalies.bulkReadCount.toString(), 'red')}
            {metricCard('Off Hours', anomalies.offHoursCount.toString(), 'amber')}
            {metricCard('Cross-Org', anomalies.crossOrgCount.toString(), 'blue')}
          </section>
          {eventsTable(anomalies.events)}
        </>
      )}

      {tab === 'patient' && patientReport && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricCard('Patient', `#${patientReport.patientId}`, 'navy')}
            {metricCard('Total Events', patientReport.totalEvents.toString(), 'navy')}
            {metricCard('Distinct Users', patientReport.distinctUserCount.toString(), 'navy')}
            {metricCard('Modifications', patientReport.modificationCount.toString(), 'blue')}
            {metricCard(
              'Anomalies',
              patientReport.anomalyCount.toString(),
              patientReport.anomalyCount > 0 ? 'red' : 'green',
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
              className={ROW_ACTION_BTN}
            >
              Attest Review
            </button>
          </div>
          {eventsTable(patientReport.events)}
        </>
      )}

      {tab === 'user' && userReport && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricCard(
              'User',
              userReport.userEmail ?? `#${userReport.userId}`,
              'navy',
            )}
            {metricCard('Total Events', userReport.totalEvents.toString(), 'navy')}
            {metricCard('Distinct Patients', userReport.distinctPatientCount.toString(), 'navy')}
            {metricCard('Off Hours', userReport.offHoursCount.toString(), 'amber')}
            {metricCard(
              'Anomalies',
              userReport.anomalyCount.toString(),
              userReport.anomalyCount > 0 ? 'red' : 'green',
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
              className={ROW_ACTION_BTN}
            >
              Attest Review
            </button>
          </div>
          {eventsTable(userReport.events)}
        </>
      )}

      {tab === 'retention' && retention && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricCard('Total Events', retention.totalEvents.toString(), 'navy')}
            {metricCard('< 1 year', retention.under1YearCount.toString(), 'navy')}
            {metricCard('1–3 years', retention.between1And3YearsCount.toString(), 'navy')}
            {metricCard('3–6 years', retention.between3And6YearsCount.toString(), 'navy')}
            {metricCard(
              `> ${retention.minimumRequiredYears} years`,
              retention.over6YearsCount.toString(),
              retention.over6YearsCount > 0 ? 'green' : 'slate',
            )}
          </section>
          <section className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-slate-600">
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
      <section className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3 font-semibold text-amber-800">
        Never reviewed. Compliance attestation required.
      </section>
    );
  }
  const tone =
    lastReviewResult === 'ok'
      ? 'border-success bg-green-50 text-green-800'
      : 'border-error bg-red-50 text-red-800';
  return (
    <section className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${tone}`}>
      Last reviewed {lastReviewedAtUtc.slice(0, 10)} —{' '}
      <strong>{lastReviewResult}</strong>
    </section>
  );
}
