import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listPaymentPeriods,
  createPaymentPeriod,
  buildClaimForPeriod,
  type HomeHealthPaymentPeriod,
} from '@/api/homehealth';

const NO_PERMISSION = 'You do not have permission to perform this action';

const LEVEL_TINT: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

export function HomeHealthPaymentPeriodsSection({ episodeId, canManage }: { episodeId: number; canManage: boolean }) {
  const [periods, setPeriods] = useState<HomeHealthPaymentPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listPaymentPeriods(episodeId).then(setPeriods).catch(() => undefined);
  }, [episodeId]);

  useEffect(load, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await createPaymentPeriod(episodeId);
      load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not generate the period.');
    } finally {
      setBusy(false);
    }
  }

  async function buildClaim(periodId: number) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await buildClaimForPeriod(periodId);
      setNotice(
        `Built claim ${r.claimNumber} — ${r.isLupa ? `LUPA, ${r.visitCount} visit(s)` : 'full case-mix'}, $${r.amount.toLocaleString()}.`,
      );
      load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not build the claim.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">PDGM Payment Periods</h3>
        <button
          onClick={generate}
          disabled={!canManage || busy}
          title={!canManage ? NO_PERMISSION : undefined}
          className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
        >
          {busy ? 'Generating…' : 'Generate next period'}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div>}

      {periods.length === 0 ? (
        <p className="text-sm text-slate-500">No payment periods yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-1.5">#</th>
              <th className="py-1.5">Dates</th>
              <th className="py-1.5">Timing</th>
              <th className="py-1.5">Functional</th>
              <th className="py-1.5">HIPPS</th>
              <th className="py-1.5">Status</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="py-2 text-slate-700">{p.periodSequence}</td>
                <td className="py-2 text-slate-700">{p.fromDate} → {p.toDate}</td>
                <td className="py-2 text-slate-600 capitalize">{p.admissionTiming}</td>
                <td className="py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_TINT[p.functionalLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                    {p.functionalLevel}
                  </span>
                </td>
                <td className="py-2 font-mono text-slate-800">{p.hippsCode}</td>
                <td className="py-2 text-slate-600 capitalize">{p.status}</td>
                <td className="py-2 text-right">
                  {p.status === 'open' ? (
                    <button
                      onClick={() => buildClaim(p.id)}
                      disabled={!canManage || busy}
                      title={!canManage ? NO_PERMISSION : undefined}
                      className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                    >
                      Build claim
                    </button>
                  ) : p.claimId ? (
                    <Link to={`/claims/${p.claimId}`} className="text-xs font-medium text-teal-700 hover:underline">
                      View claim →
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
