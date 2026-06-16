import { useEffect, useState } from 'react';
import {
  buildSecondary837,
  listEligibleSecondary,
  type Secondary837Result,
  type SecondaryEligibleClaim,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const CLEARINGHOUSES = [
  'availity',
  'change-healthcare',
  'waystar',
  'ability-network',
  'office-ally',
  'mock',
];

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

export function SecondaryClaimsPage() {
  const [items, setItems] = useState<SecondaryEligibleClaim[]>([]);
  const [clearinghouse, setClearinghouse] = useState('availity');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [building, setBuilding] = useState<number | null>(null);
  const [result, setResult] = useState<Secondary837Result | null>(null);

  // Build 837 calls POST /billing/secondary-claims/{id}/build → billing:scrub.
  const canBuild = usePermission(PERMISSIONS.BILLING_SCRUB);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listEligibleSecondary();
      setItems(data);
    } catch {
      setError('Failed to load eligible claims.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function handleBuild(c: SecondaryEligibleClaim) {
    setError(null);
    setActionMsg(null);
    setBuilding(c.claimId);
    try {
      const r = await buildSecondary837(c.claimId, clearinghouse);
      setResult(r);
      setActionMsg(
        `Generated secondary 837 for ${c.claimNumber} (submission #${r.submissionId}, control ${r.controlNumber}).`,
      );
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to build secondary 837.'));
    } finally {
      setBuilding(null);
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Secondary Payer Submissions</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Claims with partial primary payment + secondary payer set. Generate a
          COB-framed secondary 837 to recover the remaining balance.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}
      {actionMsg && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>
      )}

      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Clearinghouse for outgoing secondary 837</span>
          <select
            value={clearinghouse}
            onChange={(e) => setClearinghouse(e.target.value)}
            className="form-input min-w-[220px]"
          >
            {CLEARINGHOUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <p className="text-slate-500">
          No claims currently eligible for secondary submission. They appear here
          when a primary 835 pays partial and the claim has a SecondaryPayer set.
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Claim</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3">Secondary</th>
                <th className="px-4 py-3 text-right">Charges</th>
                <th className="px-4 py-3 text-right">Primary Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.claimId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {c.claimNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.patientName}</td>
                  <td className="px-4 py-3 text-slate-700">{c.primaryPayer}</td>
                  <td className="px-4 py-3 text-slate-700">{c.secondaryPayer}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatMoney(c.chargeAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatMoney(c.primaryPaidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-700">
                    {formatMoney(c.balanceForSecondary)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleBuild(c)}
                      disabled={building === c.claimId || !canBuild}
                      title={!canBuild ? NO_PERMISSION : undefined}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {building === c.claimId ? 'Building…' : 'Build 837'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Secondary 837 — Submission #{result.submissionId}
              </h3>
              <div className="mt-1 text-sm text-slate-500">
                Control #{result.controlNumber} · Primary paid{' '}
                {formatMoney(result.primaryPaidAmount)} · Secondary balance{' '}
                {formatMoney(result.secondaryClaimAmount)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          {result.warnings.length > 0 && (
            <div className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3">
              <strong className="text-amber-800">Warnings:</strong>
              <ul className="mt-1.5 list-disc pl-5 text-amber-800">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-navy-900 p-3 font-mono text-[11px] text-slate-200">
            {result.edi837}
          </pre>
        </section>
      )}
    </div>
  );
}
