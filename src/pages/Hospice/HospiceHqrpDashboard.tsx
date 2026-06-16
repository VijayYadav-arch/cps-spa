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

function metricCard(label: string, value: string, tone: string) {
  return (
    <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${tone}`}>{value}</div>
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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">HQRP Timeliness Dashboard</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          CMS Hospice Quality Reporting Program — HOPE submissions within 30 days
          of trigger event. Threshold is 90% on-time; falling below results in a
          4-percentage-point reduction to the annual payment update.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">From</span>
          <input
            type="date"
            className="form-input w-44"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">To</span>
          <input
            type="date"
            className="form-input w-44"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <button type="submit" className="btn-primary">
          Apply
        </button>
      </form>

      {isLoading && (
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      {report && !isLoading && (
        <>
          <section
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            aria-label="HQRP summary metrics"
          >
            {metricCard(
              'Timeliness',
              `${report.summary.timelinessPercentage.toFixed(2)}%`,
              report.summary.meetsThreshold ? 'text-success' : 'text-error',
            )}
            {metricCard(
              'Threshold',
              `${report.summary.thresholdPercentage}%`,
              'text-teal-700',
            )}
            {metricCard(
              'Total Assessments',
              String(report.summary.totalAssessments),
              'text-navy-900',
            )}
            {metricCard(
              'On-Time',
              String(report.summary.onTimeCount),
              'text-success',
            )}
            {metricCard(
              'Late',
              String(report.summary.lateCount),
              'text-accent-600',
            )}
            {metricCard(
              'Not Submitted',
              String(report.summary.notYetSubmittedCount),
              'text-error',
            )}
            {metricCard(
              'Rejected',
              String(report.summary.rejectedCount),
              'text-error',
            )}
          </section>

          <section>
            <p
              className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${
                report.summary.meetsThreshold
                  ? 'border-success bg-green-50 text-green-800'
                  : 'border-error bg-red-50 text-red-800'
              }`}
            >
              {report.summary.totalAssessments === 0
                ? 'No HOPE assessments in this reporting period.'
                : report.summary.meetsThreshold
                  ? `Meets the ${report.summary.thresholdPercentage}% threshold — no APU penalty expected for this period.`
                  : `Below the ${report.summary.thresholdPercentage}% threshold — APU reduction of 4 percentage points may apply.`}
            </p>
          </section>

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">
              Late / Pending Assessments
            </h3>
            {report.lateOrPending.length === 0 ? (
              <p className="text-slate-500">
                None — every assessment in this period is on time.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Submission Type</th>
                      <th className="px-4 py-3">Target Date</th>
                      <th className="px-4 py-3">Deadline</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Days Late</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lateOrPending.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          {row.patientName ? (
                            <Link
                              to={`/patients/${row.patientId}`}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              {row.patientName}
                            </Link>
                          ) : (
                            <span className="text-slate-500">
                              Patient #{row.patientId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.submissionType}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.targetDate}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.deadlineDate}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.status}
                        </td>
                        <td
                          className={`px-4 py-3 ${
                            row.daysLate > 0
                              ? 'font-semibold text-error'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.daysLate}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/hospice/hope/overdue`}
                            className="font-medium text-teal-700 hover:underline"
                          >
                            HOPE Queue
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
