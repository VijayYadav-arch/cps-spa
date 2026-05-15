import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClaim, submitClaim, type ClaimDetail as ClaimDetailType } from '@/api/claims';

export function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ClaimDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    try {
      const updated = await submitClaim(claim.id);
      setClaim(updated);
    } catch {
      setError('Failed to submit claim.');
    } finally {
      setIsSubmitting(false);
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
      {claim.status !== 'submitted' && claim.status !== 'paid' && (
        <button
          onClick={() => { void handleSubmit(); }}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Submitting…' : 'Submit Claim'}
        </button>
      )}
    </div>
  );
}
