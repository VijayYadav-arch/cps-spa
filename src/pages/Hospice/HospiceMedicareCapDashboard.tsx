import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMedicareCapReconciliation,
  type MedicareCapReconciliation,
} from '@/api/hospice';

function currency(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function defaultCapYear(): number {
  // CMS cap year ends Sep 30 and is named by the year it ends. Default to the cap
  // year currently accruing — that is the one operators watch for live liability and
  // the one CMS has published per-beneficiary rates for. (The most-recent CLOSED year
  // is often a year for which we have no reference-rate file loaded yet.)
  const now = new Date();
  const y = now.getUTCFullYear();
  // Before Oct 1 we are still in the cap year ending Sep 30 of THIS year; on/after Oct 1
  // we have rolled into the cap year ending Sep 30 of NEXT year.
  const isBeforeOct1 = now.getUTCMonth() < 9; // 0-indexed: 9 = October
  return isBeforeOct1 ? y : y + 1;
}

type MetricTone = 'navy' | 'teal' | 'amber' | 'red' | 'green';

const METRIC_TONE: Record<MetricTone, string> = {
  navy: 'text-navy-900',
  teal: 'text-teal-700',
  amber: 'text-accent-600',
  red: 'text-error',
  green: 'text-success',
};

function MetricCard({
  label,
  value,
  tone = 'navy',
}: {
  label: string;
  value: string;
  tone?: MetricTone;
}) {
  return (
    <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${METRIC_TONE[tone]}`}>
        {value}
      </div>
    </div>
  );
}

export function HospiceMedicareCapDashboard() {
  const [capYear, setCapYear] = useState<number>(defaultCapYear);
  const [report, setReport] = useState<MedicareCapReconciliation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(year: number) {
    setIsLoading(true);
    setError(null);
    try {
      setReport(await getMedicareCapReconciliation(year));
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Failed to load cap reconciliation.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(capYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    void load(capYear);
  }

  const overCapBeneficiaries = useMemo(
    () =>
      (report?.beneficiaries ?? [])
        .filter((b) => b.excessLiability > 0)
        .sort((a, b) => b.excessLiability - a.excessLiability),
    [report],
  );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Medicare Hospice Cap Reconciliation</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          42 CFR 418.309 — per-beneficiary cap on Medicare hospice payments per
          cap year. Amounts above the cap must be returned to CMS at year-end.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Cap year (FY ending Sep 30)
          </span>
          <input
            type="number"
            className="form-input w-36"
            value={capYear}
            onChange={(e) => setCapYear(Number(e.target.value))}
            min={2020}
            max={2099}
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
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600"
        >
          {error}
        </div>
      )}

      {report && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Cap Year" value={`FY${report.capYear}`} tone="navy" />
            <MetricCard
              label="Per-Beneficiary Cap"
              value={currency(report.capAmountPerBeneficiary)}
              tone="teal"
            />
            <MetricCard
              label="Beneficiaries"
              value={String(report.beneficiaryCount)}
              tone="navy"
            />
            <MetricCard
              label="Total Paid in Window"
              value={currency(report.totalPaidInCapYear)}
              tone="navy"
            />
            <MetricCard
              label="Total Excess Liability"
              value={currency(report.totalExcessLiability)}
              tone={report.totalExcessLiability > 0 ? 'red' : 'green'}
            />
          </section>

          <section
            className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${
              report.totalExcessLiability > 0
                ? 'border-error bg-red-50 text-red-800'
                : 'border-success bg-green-50 text-green-800'
            }`}
          >
            {report.totalExcessLiability > 0
              ? `Estimated cap liability of ${currency(report.totalExcessLiability)} across ${overCapBeneficiaries.length} beneficiar${overCapBeneficiaries.length === 1 ? 'y' : 'ies'}. Review beneficiary-level detail below.`
              : `No estimated cap liability for FY${report.capYear} based on the streamlined methodology.`}
          </section>

          {report.caveats.length > 0 && (
            <section className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3">
              <strong className="text-slate-800">Methodology caveats</strong>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {report.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">Beneficiary Detail</h3>
            {report.beneficiaries.length === 0 ? (
              <p className="text-slate-500">
                No beneficiaries with elections overlapping this cap year.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Days In Cap Year</th>
                      <th className="px-4 py-3">Paid in Cap Year</th>
                      <th className="px-4 py-3">Cap Allowance</th>
                      <th className="px-4 py-3">Excess Liability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.beneficiaries.map((b) => (
                      <tr
                        key={b.patientId}
                        className={`border-t border-slate-100 ${
                          b.excessLiability > 0
                            ? 'bg-red-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          {b.patientName ? (
                            <Link
                              to={`/patients/${b.patientId}`}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              {b.patientName}
                            </Link>
                          ) : (
                            <span className="text-slate-500">
                              Patient #{b.patientId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {b.electionDaysInCapYear}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {currency(b.paidInCapYear)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {currency(b.capAllowance)}
                        </td>
                        <td
                          className={`px-4 py-3 ${
                            b.excessLiability > 0
                              ? 'font-semibold text-error'
                              : 'text-slate-500'
                          }`}
                        >
                          {currency(b.excessLiability)}
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
