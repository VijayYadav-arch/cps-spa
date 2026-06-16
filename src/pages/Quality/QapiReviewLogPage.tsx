import { useEffect, useState } from 'react';
import { listReviews, logReview, type HospiceQapiReview } from '@/api/qapi';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function QapiReviewLogPage() {
  const [reviews, setReviews] = useState<HospiceQapiReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reviewDate, setReviewDate] = useState('');
  const [attendeeNames, setAttendeeNames] = useState('');
  const [topicsReviewed, setTopicsReviewed] = useState('');
  const [decisionsMade, setDecisionsMade] = useState('');
  const [nextReviewTargetDate, setNextReviewTargetDate] = useState('');

  // Logging a review hits POST /reviews, gated by hospice:qapi_review_manage.
  const canManage = usePermission(PERMISSIONS.HOSPICE_QAPI_REVIEW_MANAGE);

  const reload = async () => { setReviews(await listReviews()); };
  useEffect(() => { void reload(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logReview({ reviewDate, attendeeNames, topicsReviewed, decisionsMade, nextReviewTargetDate });
    setShowForm(false);
    setReviewDate(''); setAttendeeNames(''); setTopicsReviewed('');
    setDecisionsMade(''); setNextReviewTargetDate('');
    await reload();
  };

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">Governing Body Review Log</h2>
        <button
          onClick={() => setShowForm(s => !s)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Log New Review
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} aria-label="Log review" className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Review Date</span>
            <input className="form-input w-auto" type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} required />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Attendees</span>
            <input className="form-input" value={attendeeNames} onChange={e => setAttendeeNames(e.target.value)} required />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Topics Reviewed</span>
            <textarea className="form-input" value={topicsReviewed} onChange={e => setTopicsReviewed(e.target.value)} rows={3} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Decisions Made</span>
            <textarea className="form-input" value={decisionsMade} onChange={e => setDecisionsMade(e.target.value)} rows={3} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Next Review Target</span>
            <input className="form-input w-auto" type="date" value={nextReviewTargetDate} onChange={e => setNextReviewTargetDate(e.target.value)} required />
          </label>
          <button
            type="submit"
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary justify-self-start disabled:cursor-not-allowed disabled:opacity-60"
          >
            Log Review
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Attendees</th>
              <th className="px-4 py-3">Topics</th>
              <th className="px-4 py-3">Decisions</th>
              <th className="px-4 py-3">Next</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{r.reviewDate}</td>
                <td className="px-4 py-3 text-slate-700">{r.attendeeNames}</td>
                <td className="px-4 py-3 text-slate-700">{r.topicsReviewed}</td>
                <td className="px-4 py-3 text-slate-700">{r.decisionsMade}</td>
                <td className="px-4 py-3 text-slate-700">{r.nextReviewTargetDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
