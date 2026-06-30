import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  downloadClaimPdf, getClaim, submitClaim, scrubClaimById, predictClaimDenial,
  type ClaimDetail as ClaimDetailType,
  type ScrubResult,
  type DenialPrediction,
} from '@/api/claims';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';
import { isClaimSubmittable } from './claimStatus';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ClaimDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [scrub, setScrub] = useState<ScrubResult | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [prediction, setPrediction] = useState<DenialPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Button-level permission gates. Each maps to the policy on the endpoint the
  // handler calls: submit→claims:submit, scrub→billing:scrub, print→claims:print.
  // Predict-denial is gated by claims:view (the route guard already covers it).
  const canSubmit = usePermission(PERMISSIONS.CLAIMS_SUBMIT);
  const canScrub = usePermission(PERMISSIONS.BILLING_SCRUB);
  const canPrint = usePermission(PERMISSIONS.CLAIMS_PRINT);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getClaim(parseInt(id, 10))
      .then((c) => { if (!cancelled) setClaim(c); })
      .catch(() => { if (!cancelled) setError('Claim not found.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async () => {
    if (!claim) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await submitClaim(claim.id);
      setClaim(updated);
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
      if (res?.status === 409 || res?.data?.code === 'ALREADY_SUBMITTING') {
        setError('Claim is already being submitted.');
      } else {
        setError('Failed to submit claim.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!claim) return;
    setIsScrubbing(true);
    setError(null);
    try {
      const result = await scrubClaimById(claim.id);
      setScrub(result);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Validation failed';
      setError(message);
    } finally {
      setIsScrubbing(false);
    }
  };

  const handlePredictDenial = async () => {
    if (!claim) return;
    setIsPredicting(true);
    setError(null);
    try {
      const result = await predictClaimDenial(claim.id);
      setPrediction(result);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'AI denial prediction failed';
      setError(message);
    } finally {
      setIsPredicting(false);
    }
  };

  const handlePrint = async () => {
    if (!claim) return;
    setIsPrinting(true);
    try {
      const blob = await downloadClaimPdf(claim.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `claim-${claim.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download claim PDF.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) return <div role="status" className="p-6 text-slate-500">Loading claim…</div>;
  if (error) return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;
  if (!claim) return null;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div>
        <button
          onClick={() => navigate('/claims')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back to Claims
        </button>
      </div>
      <h2 className="text-2xl">Claim #{claim.id}</h2>
      <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2">
        <dt className="font-medium text-slate-600">Patient</dt><dd className="text-slate-700">{claim.patientName}</dd>
        <dt className="font-medium text-slate-600">Status</dt><dd className="text-slate-700">{claim.status}</dd>
        <dt className="font-medium text-slate-600">Amount</dt><dd className="text-slate-700">${claim.amount.toFixed(2)}</dd>
        {claim.paidAmount != null && (<><dt className="font-medium text-slate-600">Paid Amount</dt><dd className="text-slate-700">${claim.paidAmount.toFixed(2)}</dd></>)}
        {claim.denialReason && (<><dt className="font-medium text-slate-600">Denial Reason</dt><dd className="text-slate-700">{claim.denialReason}</dd></>)}
        <dt className="font-medium text-slate-600">Submitted</dt>
        <dd className="text-slate-700">{claim.submittedDate ? new Date(claim.submittedDate).toLocaleDateString() : 'Not yet submitted'}</dd>
      </dl>
      {claim.serviceLines.length > 0 && (
        <div className="grid gap-3">
          <h3 className="text-lg font-semibold">Service Lines</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Procedure</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Charge</th>
                </tr>
              </thead>
              <tbody>
                {claim.serviceLines.map((sl) => (
                  <tr key={sl.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{sl.procedureCode}</td>
                    <td className="px-4 py-3 text-slate-700">{sl.diagnosisCode ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{sl.units}</td>
                    <td className="px-4 py-3 text-slate-700">${sl.chargeAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {scrub && (
        <div
          className={`rounded-lg border px-4 py-3 ${
            scrub.passed
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className={`font-semibold ${scrub.passed ? 'text-green-800' : 'text-red-800'}`}>
            {scrub.passed
              ? `Validation passed${scrub.findings.length > 0 ? ` (${scrub.findings.length} warning${scrub.findings.length === 1 ? '' : 's'})` : ''}`
              : `Validation failed · ${scrub.findings.filter((f) => f.severity === 'error').length} error${scrub.findings.filter((f) => f.severity === 'error').length === 1 ? '' : 's'}`}
          </div>
          {scrub.findings.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {scrub.findings.map((f, i) => (
                <li key={`${f.rule}-${f.field}-${i}`} className="mb-1 text-sm">
                  <span className={`mr-1.5 font-semibold ${f.severity === 'error' ? 'text-red-700' : 'text-accent-600'}`}>
                    {f.severity}
                  </span>
                  <code className="text-xs text-slate-500">{f.rule}</code>
                  <span className="ml-2 text-slate-700">{f.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {prediction && (
        <div
          aria-label={`AI denial risk prediction for claim ${claim.id}`}
          className="rounded-lg border p-4"
          style={{
            borderColor: riskBorder(prediction.riskLevel),
            background: riskBackground(prediction.riskLevel),
            borderLeft: `4px solid ${riskBadge(prediction.riskLevel)}`,
          }}
        >
          <div className="mb-2 flex items-center gap-2.5">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase text-white"
              style={{ background: riskBadge(prediction.riskLevel) }}
            >
              {prediction.riskLevel} risk
            </span>
            {prediction.likelyDenialCode && (
              <code className="text-sm text-slate-600">
                Likely denial: {prediction.likelyDenialCode}
              </code>
            )}
          </div>
          <div className="mb-2 text-sm text-slate-800">
            {prediction.rationale || '(no rationale provided)'}
          </div>
          {prediction.suggestedFixes.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">
                Suggested fixes
              </div>
              <ul className="list-disc pl-5">
                {prediction.suggestedFixes.map((fix, i) => (
                  <li key={i} className="text-sm text-slate-700">{fix}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-2.5 text-[11px] text-slate-400">
            AI advisory — review independently before submission.
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => { void handleValidate(); }}
          disabled={isScrubbing || !canScrub}
          aria-busy={isScrubbing}
          title={!canScrub ? NO_PERMISSION : undefined}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isScrubbing ? 'Validating…' : 'Validate'}
        </button>
        <button
          onClick={() => { void handlePredictDenial(); }}
          disabled={isPredicting}
          aria-busy={isPredicting}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPredicting
            ? 'Predicting…'
            : prediction
            ? 'Re-run AI prediction'
            : 'Predict denial risk (AI)'}
        </button>
        {isClaimSubmittable(claim.status) && (
          <button
            onClick={() => { void handleSubmit(); }}
            disabled={isSubmitting || !canSubmit}
            aria-busy={isSubmitting}
            title={!canSubmit ? NO_PERMISSION : undefined}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        )}
        <button
          onClick={() => { void handlePrint(); }}
          disabled={isPrinting || !canPrint}
          aria-busy={isPrinting}
          title={!canPrint ? NO_PERMISSION : undefined}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPrinting ? 'Generating…' : 'Print Claim Form'}
        </button>
        <button
          onClick={() => navigate(`/claims/${claim.id}/lifecycle`)}
          className="btn-outline-dark"
        >
          View Lifecycle
        </button>
      </div>
    </div>
  );
}

function riskBadge(level: DenialPrediction['riskLevel']): string {
  switch (level) {
    case 'low': return '#16a34a';      // green
    case 'moderate': return '#d97706'; // amber
    case 'high': return '#dc2626';     // red
    default: return '#64748b';         // slate (unknown)
  }
}

function riskBorder(level: DenialPrediction['riskLevel']): string {
  switch (level) {
    case 'low': return '#bbf7d0';
    case 'moderate': return '#fed7aa';
    case 'high': return '#fecaca';
    default: return '#e2e8f0';
  }
}

function riskBackground(level: DenialPrediction['riskLevel']): string {
  switch (level) {
    case 'low': return '#f0fdf4';
    case 'moderate': return '#fffbeb';
    case 'high': return '#fef2f2';
    default: return '#f8fafc';
  }
}
