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

  if (loading) return <div role="status">Loading IDG meetings…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        IDG Meetings
      </h2>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Schedule new meeting
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label>
            Date / Time
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
          <button
            onClick={handleSchedule}
            disabled={submitting || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            style={{ cursor: (submitting || !canManage) ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
        <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
          Default attendees: physician + RN + social worker + chaplain (CMS-compliant 4 roles).
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Upcoming</h3>
        {meetings.length === 0 ? (
          <p style={{ color: '#64748b' }}>No upcoming meetings.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Date</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
                <th style={{ padding: '8px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    {new Date(m.meetingDate).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{m.status}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/hospice/idg-meetings/${m.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
