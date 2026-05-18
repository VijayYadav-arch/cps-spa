import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getElection,
  buildPerDiemClaim,
  type HospiceElection,
  type HospicePerDiemClaimDraft,
} from '@/api/hospice';
import { HospiceLevelOfCareBadge } from '@/components/HospiceLevelOfCareBadge';

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

  if (isLoading) return <div role="status">Loading…</div>;
  if (error && !draft) return <div role="alert">{error}</div>;
  if (!election) return null;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <button
        onClick={() => navigate(`/patients/${patientId}/hospice/${election.id}`)}
        style={{ marginBottom: 16 }}
      >
        ← Back to Election
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Generate Per-Diem Claim
      </h2>

      {error && draft == null && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {draft == null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBuild();
          }}
          style={{ display: 'grid', gap: 12, maxWidth: 480 }}
        >
          <label style={{ display: 'block' }}>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
              required
            />
          </label>
          <label style={{ display: 'block' }}>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
              required
            />
          </label>
          <button type="submit" disabled={submitting || !from || !to}>
            {submitting ? 'Building…' : 'Build Per-Diem Claim'}
          </button>
        </form>
      ) : (
        <section>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              Claim {draft.claimNumber}
            </h3>
            <p style={{ color: '#64748b' }}>
              Total: <strong>${draft.totalCharges.toFixed(2)}</strong> across{' '}
              {draft.attendanceDayIds.length} attendance day(s)
            </p>
          </div>

          {draft.warnings.length > 0 && (
            <div
              role="alert"
              style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#92400e',
                padding: 12,
                borderRadius: 4,
                marginBottom: 16,
              }}
            >
              {draft.warnings.map((w, i) => (
                <p key={i} style={{ margin: i > 0 ? '8px 0 0 0' : 0 }}>
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Level of Care</th>
                <th style={{ padding: '8px 12px' }}>Tier</th>
                <th style={{ padding: '8px 12px' }}>Revenue Code</th>
                <th style={{ padding: '8px 12px' }}>Units</th>
                <th style={{ padding: '8px 12px' }}>Unit Amount</th>
                <th style={{ padding: '8px 12px' }}>Line Charges</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <HospiceLevelOfCareBadge loc={line.levelOfCare} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>{line.tier}</td>
                  <td style={{ padding: '8px 12px' }}>{line.revenueCode}</td>
                  <td style={{ padding: '8px 12px' }}>{line.units}</td>
                  <td style={{ padding: '8px 12px' }}>${line.unitAmount.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px' }}>${line.lineCharges.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={() => navigate(`/claims/${draft.claimId}`)}>View Claim</button>
        </section>
      )}
    </div>
  );
}
