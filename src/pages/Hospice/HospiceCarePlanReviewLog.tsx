import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listCarePlanReviews,
  recordCarePlanReview,
  type CarePlanReview,
  type CarePlanReviewOutcome,
} from '@/api/hospice';

const OUTCOMES: CarePlanReviewOutcome[] = [
  'NoChange',
  'MinorRevision',
  'MajorRevision',
  'Discontinued',
];

export function HospiceCarePlanReviewLog() {
  const { carePlanId } = useParams<{ carePlanId: string }>();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<CarePlanReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = useState<CarePlanReviewOutcome>('NoChange');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!carePlanId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await listCarePlanReviews(parseInt(carePlanId, 10));
      setReviews(r.data);
    } catch {
      setError('Failed to load care plan reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carePlanId]);

  async function handleSubmit() {
    if (!carePlanId) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordCarePlanReview(parseInt(carePlanId, 10), {
        reviewDate,
        idgMeetingId: null,
        outcome,
        changesSummary: summary || null,
      });
      setShowForm(false);
      setSummary('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record review.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div role="status">Loading reviews…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Care Plan #{carePlanId} — Review Log
      </h2>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ marginBottom: 16 }}>
          Record New Review
        </button>
      ) : (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            New review
          </h3>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Review Date
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Outcome
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CarePlanReviewOutcome)}
              style={{ display: 'block', marginTop: 4 }}
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Changes Summary (optional)
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              style={{ display: 'block', marginTop: 4, width: '100%' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Recording…' : 'Record'}
            </button>
          </div>
        </section>
      )}

      {reviews.length === 0 ? (
        <p style={{ color: '#64748b' }}>No reviews recorded.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Review Date</th>
              <th style={{ padding: '8px 12px' }}>Outcome</th>
              <th style={{ padding: '8px 12px' }}>Next Review</th>
              <th style={{ padding: '8px 12px' }}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>{r.reviewDate}</td>
                <td style={{ padding: '8px 12px' }}>{r.outcome}</td>
                <td style={{ padding: '8px 12px' }}>{r.nextReviewDate}</td>
                <td style={{ padding: '8px 12px', color: '#64748b' }}>
                  {r.changesSummary ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
