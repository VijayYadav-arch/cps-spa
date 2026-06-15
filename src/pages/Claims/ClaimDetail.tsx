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

  if (isLoading) return <div role="status">Loading claim…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!claim) return null;

  return (
    <div>
      <button onClick={() => navigate('/claims')} style={{ marginBottom: 16 }}>← Back to Claims</button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Claim #{claim.id}</h2>
      <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', marginBottom: 24 }}>
        <dt style={{ fontWeight: 500 }}>Patient</dt><dd>{claim.patientName}</dd>
        <dt style={{ fontWeight: 500 }}>Status</dt><dd>{claim.status}</dd>
        <dt style={{ fontWeight: 500 }}>Amount</dt><dd>${claim.amount.toFixed(2)}</dd>
        {claim.paidAmount != null && (<><dt style={{ fontWeight: 500 }}>Paid Amount</dt><dd>${claim.paidAmount.toFixed(2)}</dd></>)}
        {claim.denialReason && (<><dt style={{ fontWeight: 500 }}>Denial Reason</dt><dd>{claim.denialReason}</dd></>)}
        <dt style={{ fontWeight: 500 }}>Submitted</dt>
        <dd>{claim.submittedDate ? new Date(claim.submittedDate).toLocaleDateString() : 'Not yet submitted'}</dd>
      </dl>
      {claim.serviceLines.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Service Lines</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Procedure</th>
                <th style={{ padding: '6px 10px' }}>Diagnosis</th>
                <th style={{ padding: '6px 10px' }}>Units</th>
                <th style={{ padding: '6px 10px' }}>Charge</th>
              </tr>
            </thead>
            <tbody>
              {claim.serviceLines.map((sl) => (
                <tr key={sl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{sl.procedureCode}</td>
                  <td style={{ padding: '6px 10px' }}>{sl.diagnosisCode ?? '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{sl.units}</td>
                  <td style={{ padding: '6px 10px' }}>${sl.chargeAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {scrub && (
        <div
          style={{
            border: '1px solid ' + (scrub.passed ? '#bbf7d0' : '#fecaca'),
            background: scrub.passed ? '#f0fdf4' : '#fef2f2',
            borderRadius: 8, padding: 16, marginTop: 16,
          }}
        >
          <div style={{ fontWeight: 600, color: scrub.passed ? '#166534' : '#991b1b' }}>
            {scrub.passed
              ? `Validation passed${scrub.findings.length > 0 ? ` (${scrub.findings.length} warning${scrub.findings.length === 1 ? '' : 's'})` : ''}`
              : `Validation failed · ${scrub.findings.filter((f) => f.severity === 'error').length} error${scrub.findings.filter((f) => f.severity === 'error').length === 1 ? '' : 's'}`}
          </div>
          {scrub.findings.length > 0 && (
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              {scrub.findings.map((f, i) => (
                <li key={`${f.rule}-${f.field}-${i}`} style={{ fontSize: 13, marginBottom: 4 }}>
                  <span style={{
                    color: f.severity === 'error' ? '#b91c1c' : '#b45309',
                    fontWeight: 600, marginRight: 6,
                  }}>
                    {f.severity}
                  </span>
                  <code style={{ fontSize: 12, color: '#64748b' }}>{f.rule}</code>
                  <span style={{ marginLeft: 8 }}>{f.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {prediction && (
        <div
          aria-label={`AI denial risk prediction for claim ${claim.id}`}
          style={{
            border: '1px solid ' + riskBorder(prediction.riskLevel),
            background: riskBackground(prediction.riskLevel),
            borderLeft: `4px solid ${riskBadge(prediction.riskLevel)}`,
            borderRadius: 8, padding: 16, marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: riskBadge(prediction.riskLevel),
                color: '#fff', fontWeight: 700, fontSize: 12, padding: '2px 10px',
                borderRadius: 999, textTransform: 'uppercase',
              }}
            >
              {prediction.riskLevel} risk
            </span>
            {prediction.likelyDenialCode && (
              <code style={{ fontSize: 13, color: '#475569' }}>
                Likely denial: {prediction.likelyDenialCode}
              </code>
            )}
          </div>
          <div style={{ fontSize: 14, color: '#1f2937', marginBottom: 8 }}>
            {prediction.rationale || '(no rationale provided)'}
          </div>
          {prediction.suggestedFixes.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Suggested fixes
              </div>
              <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 20 }}>
                {prediction.suggestedFixes.map((fix, i) => (
                  <li key={i} style={{ fontSize: 13, marginBottom: 2 }}>{fix}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
            AI advisory — review independently before submission.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => { void handleValidate(); }}
          disabled={isScrubbing || !canScrub}
          aria-busy={isScrubbing}
          title={!canScrub ? NO_PERMISSION : undefined}
          style={{ padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: (isScrubbing || !canScrub) ? 'not-allowed' : 'pointer' }}
        >
          {isScrubbing ? 'Validating…' : 'Validate'}
        </button>
        <button
          onClick={() => { void handlePredictDenial(); }}
          disabled={isPredicting}
          aria-busy={isPredicting}
          style={{ padding: '10px 24px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: isPredicting ? 'not-allowed' : 'pointer' }}
        >
          {isPredicting
            ? 'Predicting…'
            : prediction
            ? 'Re-run AI prediction'
            : 'Predict denial risk (AI)'}
        </button>
        {claim.status !== 'submitted' && claim.status !== 'paid' && (
          <button
            onClick={() => { void handleSubmit(); }}
            disabled={isSubmitting || !canSubmit}
            aria-busy={isSubmitting}
            title={!canSubmit ? NO_PERMISSION : undefined}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: (isSubmitting || !canSubmit) ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        )}
        <button
          onClick={() => { void handlePrint(); }}
          disabled={isPrinting || !canPrint}
          aria-busy={isPrinting}
          title={!canPrint ? NO_PERMISSION : undefined}
          style={{ padding: '10px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: (isPrinting || !canPrint) ? 'not-allowed' : 'pointer' }}
        >
          {isPrinting ? 'Generating…' : 'Print Claim Form'}
        </button>
        <button
          onClick={() => navigate(`/claims/${claim.id}/lifecycle`)}
          style={{ padding: '10px 24px', background: '#475569', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
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
