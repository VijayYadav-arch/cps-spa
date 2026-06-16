import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listHopeOverdue, type HopeAssessment } from '@/api/hospice';

export function HospiceHopeOverdue() {
  const [items, setItems] = useState<HopeAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listHopeOverdue()
      .then((r) => setItems(r.data))
      .catch(() => setError('Failed to load overdue HOPE assessments.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading overdue HOPE…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Overdue HOPE Assessments</h2>
        <div className="section-line" />
      </header>
      {items.length === 0 ? (
        <p className="text-slate-500">No HOPE assessments overdue.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Submission Type</th>
                <th className="px-4 py-3">Target Date</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Days Overdue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 bg-red-50">
                  <td className="px-4 py-3 text-slate-700">{a.submissionType}</td>
                  <td className="px-4 py-3 text-slate-700">{a.targetDate}</td>
                  <td className="px-4 py-3 text-slate-700">{a.deadlineDate}</td>
                  <td className="px-4 py-3 font-semibold text-error">
                    {Math.max(0, -a.daysUntilDeadline)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.status}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <Link
                      to={`/patients/${a.hospiceElectionId}/hospice/${a.hospiceElectionId}/hope/${a.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Open
                    </Link>
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
