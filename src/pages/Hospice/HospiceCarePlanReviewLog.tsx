import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listCarePlanReviews,
  recordCarePlanReview,
  listUpcomingIdg,
  type CarePlanReview,
  type CarePlanReviewOutcome,
  type IdgMeeting,
} from '@/api/hospice';

const OUTCOMES: CarePlanReviewOutcome[] = [
  'NoChange',
  'MinorRevision',
  'MajorRevision',
  'Discontinued',
];

export function HospiceCarePlanReviewLog() {
  const { electionId, carePlanId } = useParams<{
    electionId: string;
    carePlanId: string;
  }>();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<CarePlanReview[]>([]);
  const [meetings, setMeetings] = useState<IdgMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = useState<CarePlanReviewOutcome>('NoChange');
  const [summary, setSummary] = useState('');
  const [idgMeetingId, setIdgMeetingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    // Offer the election's IDG meetings so a review can be linked to where it happened.
    listUpcomingIdg({ electionId: parseInt(electionId, 10) })
      .then((r) => setMeetings(r.data))
      .catch(() => undefined);
  }, [electionId]);

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
        idgMeetingId,
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

  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading reviews…
      </div>
    );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back
        </button>
        <h2 className="text-2xl">Care Plan #{carePlanId} — Review Log</h2>
        <div className="section-line" />
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary justify-self-start"
        >
          Record New Review
        </button>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">New review</h3>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">
                Review Date
              </span>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="form-input w-48"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Outcome</span>
              <select
                value={outcome}
                onChange={(e) =>
                  setOutcome(e.target.value as CarePlanReviewOutcome)
                }
                className="form-input w-48"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">
                IDG Meeting (optional)
              </span>
              <select
                value={idgMeetingId ?? ''}
                onChange={(e) =>
                  setIdgMeetingId(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className="form-input w-72"
              >
                <option value="">— Independent review (no meeting) —</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meetingDate} · #{m.id} ({m.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">
                Changes Summary (optional)
              </span>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="form-input"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Recording…' : 'Record'}
              </button>
            </div>
          </div>
        </section>
      )}

      {reviews.length === 0 ? (
        <p className="text-slate-500">No reviews recorded.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Review Date</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Next Review</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">{r.reviewDate}</td>
                  <td className="px-4 py-3 text-slate-700">{r.outcome}</td>
                  <td className="px-4 py-3 text-slate-700">{r.nextReviewDate}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.changesSummary ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
