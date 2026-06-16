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

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 200,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 6 }}>
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          Medicare Hospice Cap Reconciliation
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          42 CFR 418.309 — per-beneficiary cap on Medicare hospice payments per
          cap year. Amounts above the cap must be returned to CMS at year-end.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        style={{ display: 'flex', gap: 12, alignItems: 'end' }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Cap year (FY ending Sep 30)</span>
          <input
            type="number"
            value={capYear}
            onChange={(e) => setCapYear(Number(e.target.value))}
            min={2020}
            max={2099}
          />
        </label>
        <button type="submit">Apply</button>
      </form>

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}

      {report && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard(
              'Cap Year',
              `FY${report.capYear}`,
              '#0f172a',
            )}
            {metricCard(
              'Per-Beneficiary Cap',
              currency(report.capAmountPerBeneficiary),
              '#0e7490',
            )}
            {metricCard(
              'Beneficiaries',
              String(report.beneficiaryCount),
              '#0f172a',
            )}
            {metricCard(
              'Total Paid in Window',
              currency(report.totalPaidInCapYear),
              '#0f172a',
            )}
            {metricCard(
              'Total Excess Liability',
              currency(report.totalExcessLiability),
              report.totalExcessLiability > 0 ? '#b91c1c' : '#15803d',
            )}
          </section>

          <section
            style={{
              padding: 12,
              borderRadius: 6,
              background:
                report.totalExcessLiability > 0 ? '#fef2f2' : '#f0fdf4',
              color:
                report.totalExcessLiability > 0 ? '#991b1b' : '#166534',
              fontWeight: 600,
            }}
          >
            {report.totalExcessLiability > 0
              ? `Estimated cap liability of ${currency(report.totalExcessLiability)} across ${overCapBeneficiaries.length} beneficiar${overCapBeneficiaries.length === 1 ? 'y' : 'ies'}. Review beneficiary-level detail below.`
              : `No estimated cap liability for FY${report.capYear} based on the streamlined methodology.`}
          </section>

          {report.caveats.length > 0 && (
            <section
              style={{
                background: '#fef9c3',
                border: '1px solid #fde68a',
                borderRadius: 6,
                padding: 12,
              }}
            >
              <strong>Methodology caveats</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {report.caveats.map((c, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              Beneficiary Detail
            </h3>
            {report.beneficiaries.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                No beneficiaries with elections overlapping this cap year.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Patient</th>
                    <th style={{ padding: '6px 10px' }}>Days In Cap Year</th>
                    <th style={{ padding: '6px 10px' }}>Paid in Cap Year</th>
                    <th style={{ padding: '6px 10px' }}>Cap Allowance</th>
                    <th style={{ padding: '6px 10px' }}>Excess Liability</th>
                  </tr>
                </thead>
                <tbody>
                  {report.beneficiaries.map((b) => (
                    <tr
                      key={b.patientId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: b.excessLiability > 0 ? '#fef2f2' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '6px 10px' }}>
                        {b.patientName ? (
                          <Link to={`/patients/${b.patientId}`}>
                            {b.patientName}
                          </Link>
                        ) : (
                          <span style={{ color: '#64748b' }}>
                            Patient #{b.patientId}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px' }}>{b.electionDaysInCapYear}</td>
                      <td style={{ padding: '6px 10px' }}>{currency(b.paidInCapYear)}</td>
                      <td style={{ padding: '6px 10px' }}>{currency(b.capAllowance)}</td>
                      <td
                        style={{
                          padding: '6px 10px',
                          color: b.excessLiability > 0 ? '#b91c1c' : '#64748b',
                          fontWeight: b.excessLiability > 0 ? 600 : 400,
                        }}
                      >
                        {currency(b.excessLiability)}
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
