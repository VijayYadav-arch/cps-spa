import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  listUpcomingIdg,
  scheduleIdgMeeting,
  type IdgMeeting,
  type IdgAttendee,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const DEFAULT_ATTENDEES: IdgAttendee[] = [
  { userId: 0, role: 'physician' },
  { userId: 0, role: 'rn' },
  { userId: 0, role: 'social_worker' },
  { userId: 0, role: 'chaplain' },
];

export function HospiceIdgScheduler() {
  const { electionId } = useParams<{ electionId: string }>();
  const [meetings, setMeetings] = useState<IdgMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [submitting, setSubmitting] = useState(false);

  // Schedule hits POST /hospice/idg-meetings → [Authorize(hospice:manage)].
  const canManage = usePermission(PERMISSIONS.HOSPICE_MANAGE);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await listUpcomingIdg(
        electionId ? { electionId: parseInt(electionId, 10) } : undefined,
      );
      setMeetings(r.data);
    } catch {
      setError('Failed to load upcoming IDG meetings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  async function handleSchedule() {
    setSubmitting(true);
    setError(null);
    try {
      await scheduleIdgMeeting({
        meetingDate: new Date(meetingDate).toISOString(),
        hospiceElectionId: electionId ? parseInt(electionId, 10) : null,
        facilitatorUserId: null,
        attendees: DEFAULT_ATTENDEES,
        patientsReviewed: null,
        notes: null,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule meeting.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div role="status" className="text-slate-500">Loading IDG meetings…</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          IDG Meetings
        </h2>
        <div className="section-line" />
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">
          Schedule new meeting
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Date / Time</span>
            <input
              type="datetime-local"
              className="form-input"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </label>
          <button
            className="btn-primary"
            onClick={handleSchedule}
            disabled={submitting || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
          >
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Default attendees: physician + RN + social worker + chaplain (CMS-compliant 4 roles).
        </p>
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Upcoming</h3>
        {meetings.length === 0 ? (
          <p className="text-slate-500">No upcoming meetings.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(m.meetingDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{m.status}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/hospice/idg-meetings/${m.id}`}
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
      </section>
    </div>
  );
}
