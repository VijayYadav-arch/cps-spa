import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { IdgMeeting } from '@/api/hospice';

function safeJsonArrayLen(s: string | null | undefined): number {
  if (!s) return 0;
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export function IdgMeetingsPage() {
  const [meetings, setMeetings] = useState<IdgMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: IdgMeeting[] }>('/hospice/idg-meetings/upcoming')
      .then((res) => {
        if (!cancelled) setMeetings(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load IDG meetings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">IDG Meetings</h1>
        <p className="text-slate-600 mt-1">Interdisciplinary Group meeting management</p>
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading IDG meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No IDG meetings scheduled</p>
            <p className="text-sm">Schedule an IDG meeting to review patient care plans.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Meeting Date</th>
                <th className="px-5 py-3">Attendees</th>
                <th className="px-5 py-3">Patients Reviewed</th>
                <th className="px-5 py-3">Action Items</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Next Meeting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meetings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium">
                    {new Date(m.meetingDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-sm">{safeJsonArrayLen(m.attendees)} attendees</td>
                  <td className="px-5 py-4 text-sm">
                    {safeJsonArrayLen(m.patientsReviewed)} patients
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {safeJsonArrayLen(m.actionItems)} items
                  </td>
                  <td className="px-5 py-4 text-sm">{m.status}</td>
                  <td className="px-5 py-4 text-sm">
                    {m.nextMeetingDate ? new Date(m.nextMeetingDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
