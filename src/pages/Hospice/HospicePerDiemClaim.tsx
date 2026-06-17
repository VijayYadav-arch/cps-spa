import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getElection,
  buildPerDiemClaim,
  type HospiceElection,
  type HospicePerDiemClaimDraft,
} from '@/api/hospice';
import { HospiceLevelOfCareBadge } from '@/components/HospiceLevelOfCareBadge';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function HospicePerDiemClaim() {
  const { id: patientId, electionId } = useParams<{ id: string; electionId: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<HospiceElection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<HospicePerDiemClaimDraft | null>(null);

  // Build-per-diem-claim hits POST /hospice/elections/{id}/per-diem-claim,
  // gated by hospice:per_diem_billing on the backend.
  const canBuild = usePermission(PERMISSIONS.HOSPICE_PER_DIEM_BILLING);

  useEffect(() => {
    let cancelled = false;
    if (!electionId) return;
    (async () => {
      try {
        const e = await getElection(parseInt(electionId, 10));
        if (cancelled) return;
        setElection(e);
        if (e.currentPeriod) {
          setFrom(e.currentPeriod.startDate);
          setTo(e.currentPeriod.endDate);
        }
      } catch {
        if (!cancelled) setError('Failed to load election.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  async function handleBuild() {
    if (!election) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await buildPerDiemClaim(election.id, { from, to });
      setDraft(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build per-diem claim.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <div role="status" className="text-slate-500">Loading…</div>;
  if (error && !draft)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );
  if (!election) return null;

  return (
    <div className="grid max-w-[900px] gap-6 p-6">
      <div>
        <button
          onClick={() => navigate(`/patients/${patientId}/hospice/${election.id}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back to Election
        </button>
      </div>
      <header className="space-y-2">
        <h2 className="text-2xl">Generate Per-Diem Claim</h2>
        <div className="section-line" />
      </header>

      {error && draft == null && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      {draft == null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBuild();
          }}
          className="grid max-w-[480px] gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">From</span>
            <input
              type="date"
              className="form-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">To</span>
            <input
              type="date"
              className="form-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !from || !to || !canBuild}
            title={!canBuild ? NO_PERMISSION : undefined}
            className="btn-primary justify-self-start"
          >
            {submitting ? 'Building…' : 'Build Per-Diem Claim'}
          </button>
        </form>
      ) : (
        <section className="grid gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              Claim {draft.claimNumber}
              {draft.isFinalClaim && (
                <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  Final claim · TOB {draft.typeOfBill}
                </span>
              )}
            </h3>
            <p className="text-slate-500">
              Total: <strong>${draft.totalCharges.toFixed(2)}</strong> across{' '}
              {draft.attendanceDayIds.length} attendance day(s)
            </p>
          </div>

          {draft.warnings.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3 font-semibold text-amber-800"
            >
              {draft.warnings.map((w, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : undefined}>
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Level of Care</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Revenue Code</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Unit Amount</th>
                  <th className="px-4 py-3">Line Charges</th>
                </tr>
              </thead>
              <tbody>
                {draft.lines.map((line, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <HospiceLevelOfCareBadge loc={line.levelOfCare} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{line.tier}</td>
                    <td className="px-4 py-3 text-slate-700">{line.revenueCode}</td>
                    <td className="px-4 py-3 text-slate-700">{line.units}</td>
                    <td className="px-4 py-3 text-slate-700">${line.unitAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-700">${line.lineCharges.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/claims/${draft.claimId}`)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              View Claim
            </button>
            <button
              onClick={() => navigate(`/hospice/claims/${draft.claimId}/submissions`)}
              className="btn-primary"
            >
              Submit 837I →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
