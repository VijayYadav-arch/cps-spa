import { useEffect, useState } from 'react';
import {
  getOrgRollup,
  type OrgRollupSummary,
} from '@/api/admin';

function metricCard(label: string, value: string, toneClass: string) {
  return (
    <div className="card-hover min-w-[170px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${toneClass}`}>
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

  if (isLoading) return <div role="status" className="text-slate-500">Loading…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;
  if (!rollup) return null;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          Parent-Org Rollup — {rollup.parentName}
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Aggregated metrics across {rollup.childOrgCount} child{' '}
          {rollup.childOrgCount === 1 ? 'CCN' : 'CCNs'}. Each child remains a
          fully tenant-isolated organization; this dashboard reads only the
          counts your <code>org:rollup_view</code> permission allows.
        </p>
      </header>

      {rollup.childOrgCount === 0 ? (
        <section className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3 font-semibold text-amber-800">
          No child organizations linked to this parent. Set{' '}
          <code>ParentOrganizationId</code> on the child org records to enable
          rollup.
        </section>
      ) : (
        <>
          <section className="flex flex-wrap gap-4">
            {metricCard('Patients', rollup.totalPatientCount.toString(), 'text-navy-900')}
            {metricCard(
              'Active Elections',
              rollup.totalActiveElectionCount.toString(),
              'text-navy-900',
            )}
            {metricCard(
              'Open Claims',
              rollup.totalOpenClaimCount.toString(),
              'text-navy-900',
            )}
            {metricCard(
              'Open Claim Total',
              formatMoney(rollup.totalClaimAmountSubmitted),
              'text-teal-700',
            )}
            {metricCard(
              'Open Breaches',
              rollup.totalOpenBreachCount.toString(),
              rollup.totalOpenBreachCount > 0 ? 'text-error' : 'text-success',
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">
              Child Organizations ({rollup.children.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3 text-right">Patients</th>
                    <th className="px-4 py-3 text-right">Active Elections</th>
                    <th className="px-4 py-3 text-right">Open Claims</th>
                    <th className="px-4 py-3 text-right">Open Claim $</th>
                    <th className="px-4 py-3 text-right">Open Breaches</th>
                  </tr>
                </thead>
                <tbody>
                  {rollup.children.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-700">{c.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {c.slug}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {c.patientCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {c.activeElectionCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {c.openClaimCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(c.claimAmountSubmitted)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${
                          c.openBreachCount > 0
                            ? 'font-semibold text-error'
                            : 'text-navy-900'
                        }`}
                      >
                        {c.openBreachCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
