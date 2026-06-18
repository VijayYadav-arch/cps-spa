import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQapiDashboard, type QapiDashboard } from '@/api/qapi';
import { PipScorecard } from '@/components/PipScorecard';
import { QapiKpiTile } from '@/components/QapiKpiTile';

export function QapiDashboardPage() {
  const [dashboard, setDashboard] = useState<QapiDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQapiDashboard()
      .then(setDashboard)
      .catch(() => setError('Failed to load dashboard data.'));
  }, []);

  if (error) {
    return (
      <div role="alert" className="alert alert-danger">
        <p>{error}</p>
      </div>
    );
  }

  if (!dashboard) return <div>Loading…</div>;

  const totalEvents90d = Object.values(dashboard.adverseEventCountByCategory90d)
    .reduce((acc, n) => acc + n, 0);

  const trendDir = dashboard.weekOverWeekTrend.delta > 0
    ? 'up' as const
    : dashboard.weekOverWeekTrend.delta < 0
      ? 'down' as const
      : 'flat' as const;

  return (
    <div className="qapi-dashboard">
      <header>
        <h1>QAPI Dashboard</h1>
      </header>

      <section className="kpi-row" aria-label="QAPI KPI tiles">
        <QapiKpiTile
          label="Active PIPs"
          value={dashboard.activePipCount}
          linkTo="/quality/qapi/pips"
        />
        <QapiKpiTile
          label="Adverse Events (90d)"
          value={totalEvents90d}
          linkTo="/quality/qapi/adverse-events"
          delta={dashboard.weekOverWeekTrend.delta}
          trendDirection={trendDir}
        />
        <div className={`qapi-kpi-wrap ${dashboard.reviewOverdue ? 'qapi-kpi--warning' : ''}`}>
          <QapiKpiTile
            label="Days Since Last Review"
            value={dashboard.daysSinceLastReview === -1 ? '—' : dashboard.daysSinceLastReview}
            linkTo="/quality/qapi/reviews"
          />
        </div>
        <QapiKpiTile
          label="QAPI Plan"
          value={dashboard.planStatus.currentVersion == null ? 'Not set' : `v${dashboard.planStatus.currentVersion}`}
          linkTo="/quality/qapi/plan"
        />
      </section>

      <section className="active-pips">
        <h2>Top Active PIPs</h2>
        {dashboard.topActivePips.length === 0 ? (
          <p>No active PIPs. <Link to="/quality/qapi/pips">Start one</Link></p>
        ) : (
          <div className="pip-grid">
            {dashboard.topActivePips.map(p => <PipScorecard key={p.id} pip={p} />)}
          </div>
        )}
      </section>

      <section className="event-categories">
        <h2>Adverse Events by Category (last 90 days)</h2>
        <ul>
          {Object.entries(dashboard.adverseEventCountByCategory90d).map(([cat, count]) => (
            <li key={cat}>{cat}: <strong>{count}</strong></li>
          ))}
        </ul>
      </section>

      {dashboard.hqrpSummary != null && (
        <section className="hqrp-summary">
          <h2>HQRP Timeliness (last 90 days)</h2>
          <div className="kpi-row" aria-label="HQRP timeliness tiles">
            <QapiKpiTile
              label="On-time submission"
              value={`${dashboard.hqrpSummary.timelinessPercentage}%`}
              linkTo="/hospice/hqrp"
            />
            <QapiKpiTile label="HOPE assessments" value={dashboard.hqrpSummary.totalAssessments} />
            <QapiKpiTile label="On time" value={dashboard.hqrpSummary.onTimeCount} />
            <QapiKpiTile label="Late / not on file" value={dashboard.hqrpSummary.lateCount + dashboard.hqrpSummary.notYetSubmittedCount + dashboard.hqrpSummary.rejectedCount} />
          </div>
          <p className={dashboard.hqrpSummary.meetsThreshold ? 'qapi-threshold--ok' : 'qapi-threshold--warning'}>
            CMS threshold is {dashboard.hqrpSummary.thresholdPercentage}% on-time.{' '}
            {dashboard.hqrpSummary.totalAssessments === 0
              ? 'No assessments in this window.'
              : dashboard.hqrpSummary.meetsThreshold
                ? 'Currently meeting the threshold.'
                : 'Below threshold — at risk of a 4-pp APU reduction.'}
          </p>
        </section>
      )}

      {dashboard.cahpsSummary != null && (
        <section className="cahps-summary">
          <h2>CAHPS Survey (Q{dashboard.cahpsSummary.quarter} {dashboard.cahpsSummary.calendarYear})</h2>
          <div className="kpi-row" aria-label="CAHPS summary tiles">
            <QapiKpiTile
              label="Submission rate"
              value={`${dashboard.cahpsSummary.submissionRatePercentage}%`}
              linkTo="/hospice/cahps"
            />
            <QapiKpiTile label="Eligible decedents" value={dashboard.cahpsSummary.eligibleCount} />
            <QapiKpiTile label="Submitted to vendor" value={dashboard.cahpsSummary.submittedCount} />
            <QapiKpiTile label="Not yet submitted" value={dashboard.cahpsSummary.notYetSubmittedCount} />
          </div>
        </section>
      )}
    </div>
  );
}
