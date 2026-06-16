import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientHistory, type PatientHistoryEvent } from '@/api/patients';

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'encounter', label: 'Encounters' },
  { value: 'visit', label: 'Visits' },
  { value: 'medication', label: 'Medications' },
  { value: 'admission', label: 'Admissions' },
  { value: 'hospice', label: 'Hospice (all)' },
  { value: 'hospice-election', label: 'Elections' },
  { value: 'hospice-noe', label: 'NOEs' },
  { value: 'hospice-hope', label: 'HOPE' },
  { value: 'hospice-cert', label: 'Certifications' },
  { value: 'hospice-ftf', label: 'FTF' },
  { value: 'hospice-addendum', label: 'Addenda' },
  { value: 'hospice-notr', label: 'NOTR' },
  { value: 'bereavement', label: 'Bereavement' },
];

const TYPE_BADGE_COLOR: Record<string, string> = {
  encounter: 'bg-teal-100 text-teal-700',
  visit: 'bg-purple-100 text-purple-800',
  medication: 'bg-green-100 text-green-800',
  admission: 'bg-amber-100 text-amber-800',
  'hospice-election': 'bg-blue-100 text-blue-800',
  'hospice-noe': 'bg-blue-100 text-blue-800',
  'hospice-hope': 'bg-blue-100 text-blue-800',
  'hospice-cert': 'bg-blue-100 text-blue-800',
  'hospice-ftf': 'bg-blue-100 text-blue-800',
  'hospice-addendum': 'bg-blue-100 text-blue-800',
  'hospice-notr': 'bg-red-100 text-red-800',
  bereavement: 'bg-purple-100 text-purple-800',
};

function formatDate(iso: string) {
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? iso : dt.toLocaleDateString();
}

export function PatientHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<PatientHistoryEvent[]>([]);
  const [pagination, setPagination] = useState<{ totalPages: number; page: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getPatientHistory(parseInt(id, 10), { type: typeFilter || undefined, page })
      .then((res) => {
        if (!cancelled) {
          setEvents(res.data);
          setPagination(res.pagination);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load patient history.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, typeFilter, page]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <button
        onClick={() => navigate(`/patients/${id}`)}
        className="justify-self-start rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        ← Back to Patient
      </button>
      <h2 className="text-2xl">Patient History</h2>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTypeFilter(t.value); setPage(1); }}
            className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors ${
              typeFilter === t.value
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div role="status" className="text-slate-500">Loading history…</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}

      {!isLoading && !error && events.length === 0 && (
        <p className="text-slate-500">No history events found.</p>
      )}

      {!isLoading && !error && events.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={`${e.type}-${e.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        TYPE_BADGE_COLOR[e.type] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
