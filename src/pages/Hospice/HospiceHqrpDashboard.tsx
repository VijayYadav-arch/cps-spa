import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getHqrpTimeliness,
  type HqrpTimelinessReport,
} from '@/api/hospice';

function defaultRange(): { from: string; to: string } {
  // Default: last 12 months ending yesterday.
  const today = new Date();
  const to = new Date(today.getTime());
  to.setDate(to.getDate() - 1);
  const from = new Date(to.getTime());
  from.setFullYear(from.getFullYear() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 160,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

export function HospiceHqrpDashboard() {
  const [range, setRange] = useState(defaultRange);
  const [report, setReport] = useState<HqrpTimelinessReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(from: string, to: string) {
    setIsLoading(true);
    setError(null);
    try {
      const r = await getHqrpTimeliness(from, to);
      setReport(r);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Failed to load HQRP timeliness report.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(range.from, range.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    void load(range.from, range.to);
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          HQRP Timeliness Dashboard
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          CMS Hospice Quality Reporting Program — HOPE submissions within 30 days
          of trigger event. Threshold is 90% on-time; falling below results in a
          4-percentage-point reduction to the annual payment update.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        style={{ display: 'flex', gap: 12, alignItems: 'end' }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>From</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>To</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <button type="submit">Apply</button>
      </form>

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}

      {report && !isLoading && (
        <>
          <section
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
            aria-label="HQRP summary metrics"
          >
            {metricCard(
              'Timeliness',
              `${report.summary.timelinessPercentage.toFixed(2)}%`,
              report.summary.meetsThreshold ? '#15803d' : '#b91c1c',
            )}
            {metricCard(
              'Threshold',
              `${report.summary.thresholdPercentage}%`,
              '#0e7490',
            )}
            {metricCard(
              'Total Assessments',
              String(report.summary.totalAssessments),
              '#0f172a',
            )}
            {metricCard(
              'On-Time',
              String(report.summary.onTimeCount),
              '#15803d',
            )}
            {metricCard('Late', String(report.summary.lateCount), '#b45309')}
            {metricCard(
              'Not Submitted',
              String(report.summary.notYetSubmittedCount),
              '#b91c1c',
            )}
            {metricCard(
              'Rejected',
              String(report.summary.rejectedCount),
              '#b91c1c',
            )}
          </section>

          <section>
            <p
              style={{
                padding: 12,
                borderRadius: 6,
                background: report.summary.meetsThreshold
                  ? '#f0fdf4'
                  : '#fef2f2',
                color: report.summary.meetsThreshold ? '#166534' : '#991b1b',
                fontWeight: 600,
              }}
            >
              {report.summary.totalAssessments === 0
                ? 'No HOPE assessments in this reporting period.'
                : report.summary.meetsThreshold
                  ? `Meets the ${report.summary.thresholdPercentage}% threshold — no APU penalty expected for this period.`
                  : `Below the ${report.summary.thresholdPercentage}% threshold — APU reduction of 4 percentage points may apply.`}
            </p>
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              Late / Pending Assessments
            </h3>
            {report.lateOrPending.length === 0 ? (
              <p style={{ color: '#64748b' }}>None — every assessment in this period is on time.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #e2e8f0',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '6px 10px' }}>Patient</th>
                    <th style={{ padding: '6px 10px' }}>Submission Type</th>
                    <th style={{ padding: '6px 10px' }}>Target Date</th>
                    <th style={{ padding: '6px 10px' }}>Deadline</th>
                    <th style={{ padding: '6px 10px' }}>Status</th>
                    <th style={{ padding: '6px 10px' }}>Days Late</th>
                    <th style={{ padding: '6px 10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lateOrPending.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '6px 10px' }}>
                        {row.patientName ? (
                          <Link to={`/patients/${row.patientId}`}>
                            {row.patientName}
                          </Link>
                        ) : (
                          <span style={{ color: '#64748b' }}>
                            Patient #{row.patientId}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px' }}>{row.submissionType}</td>
                      <td style={{ padding: '6px 10px' }}>{row.targetDate}</td>
                      <td style={{ padding: '6px 10px' }}>{row.deadlineDate}</td>
                      <td style={{ padding: '6px 10px' }}>{row.status}</td>
                      <td
                        style={{
                          padding: '6px 10px',
                          color: row.daysLate > 0 ? '#b91c1c' : '#64748b',
                          fontWeight: row.daysLate > 0 ? 600 : 400,
                        }}
                      >
                        {row.daysLate}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <Link to={`/hospice/hope/overdue`}>HOPE Queue</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
