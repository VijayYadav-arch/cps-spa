import { useEffect, useState } from 'react';
import { listReviews, logReview, type HospiceQapiReview } from '@/api/qapi';

export function QapiReviewLogPage() {
  const [reviews, setReviews] = useState<HospiceQapiReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reviewDate, setReviewDate] = useState('');
  const [attendeeNames, setAttendeeNames] = useState('');
  const [topicsReviewed, setTopicsReviewed] = useState('');
  const [decisionsMade, setDecisionsMade] = useState('');
  const [nextReviewTargetDate, setNextReviewTargetDate] = useState('');

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
    <div>
      <header>
        <h1>Governing Body Review Log</h1>
        <button onClick={() => setShowForm(s => !s)}>Log New Review</button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} aria-label="Log review">
          <label>Review Date <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} required /></label>
          <label>Attendees <input value={attendeeNames} onChange={e => setAttendeeNames(e.target.value)} required /></label>
          <label>Topics Reviewed <textarea value={topicsReviewed} onChange={e => setTopicsReviewed(e.target.value)} rows={3} /></label>
          <label>Decisions Made <textarea value={decisionsMade} onChange={e => setDecisionsMade(e.target.value)} rows={3} /></label>
          <label>Next Review Target <input type="date" value={nextReviewTargetDate} onChange={e => setNextReviewTargetDate(e.target.value)} required /></label>
          <button type="submit">Log Review</button>
        </form>
      )}

      <table>
        <thead><tr><th>Date</th><th>Attendees</th><th>Topics</th><th>Decisions</th><th>Next</th></tr></thead>
        <tbody>
          {reviews.map(r => (
            <tr key={r.id}>
              <td>{r.reviewDate}</td>
              <td>{r.attendeeNames}</td>
              <td>{r.topicsReviewed}</td>
              <td>{r.decisionsMade}</td>
              <td>{r.nextReviewTargetDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
