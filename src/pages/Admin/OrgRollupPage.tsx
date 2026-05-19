import { useEffect, useState } from 'react';
import {
  getOrgRollup,
  type OrgRollupSummary,
} from '@/api/admin';

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

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function OrgRollupPage() {
  const [rollup, setRollup] = useState<OrgRollupSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrgRollup();
        if (!cancelled) setRollup(data);
      } catch {
        if (!cancelled) setError('Failed to load parent-org rollup.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div role="status">Loading…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!rollup) return null;

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          Parent-Org Rollup — {rollup.parentName}
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Aggregated metrics across {rollup.childOrgCount} child{' '}
          {rollup.childOrgCount === 1 ? 'CCN' : 'CCNs'}. Each child remains a
          fully tenant-isolated organization; this dashboard reads only the
          counts your <code>org:rollup_view</code> permission allows.
        </p>
      </header>

      {rollup.childOrgCount === 0 ? (
        <section
          style={{
            padding: 12,
            borderRadius: 6,
            background: '#fef3c7',
            color: '#92400e',
          }}
        >
          No child organizations linked to this parent. Set{' '}
          <code>ParentOrganizationId</code> on the child org records to enable
          rollup.
        </section>
      ) : (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Patients', rollup.totalPatientCount.toString(), '#0f172a')}
            {metricCard(
              'Active Elections',
              rollup.totalActiveElectionCount.toString(),
              '#0f172a',
            )}
            {metricCard(
              'Open Claims',
              rollup.totalOpenClaimCount.toString(),
              '#0f172a',
            )}
            {metricCard(
              'Open Claim Total',
              formatMoney(rollup.totalClaimAmountSubmitted),
              '#1e40af',
            )}
            {metricCard(
              'Open Breaches',
              rollup.totalOpenBreachCount.toString(),
              rollup.totalOpenBreachCount > 0 ? '#b91c1c' : '#15803d',
            )}
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              Child Organizations ({rollup.children.length})
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px' }}>Name</th>
                  <th style={{ padding: '6px 10px' }}>Slug</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Patients</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Active Elections</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Open Claims</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Open Claim $</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Open Breaches</th>
                </tr>
              </thead>
              <tbody>
                {rollup.children.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>
                      {c.slug}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {c.patientCount}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {c.activeElectionCount}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {c.openClaimCount}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {formatMoney(c.claimAmountSubmitted)}
                    </td>
                    <td
                      style={{
                        padding: '6px 10px',
                        textAlign: 'right',
                        color: c.openBreachCount > 0 ? '#b91c1c' : '#0f172a',
                        fontWeight: c.openBreachCount > 0 ? 600 : 400,
                      }}
                    >
                      {c.openBreachCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
