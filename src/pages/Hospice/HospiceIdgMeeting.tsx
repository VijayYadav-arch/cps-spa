import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getIdgMeeting,
  completeIdgMeeting,
  cancelIdgMeeting,
  type IdgMeeting,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function HospiceIdgMeeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<IdgMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [working, setWorking] = useState(false);

  // Complete & cancel hit POST /hospice/idg-meetings/{id}/{complete|cancel}
  // → [Authorize(hospice:manage)].
  const canManage = usePermission(PERMISSIONS.HOSPICE_MANAGE);

  useEffect(() => {
    if (!meetingId) return;
    getIdgMeeting(parseInt(meetingId, 10))
      .then((m) => {
        setMeeting(m);
        setNotes(m.notes ?? '');
        setActionItems(m.actionItems ?? '');
      })
      .catch(() => setError('Failed to load IDG meeting.'))
      .finally(() => setLoading(false));
  }, [meetingId]);

  async function handleComplete() {
    if (!meeting) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await completeIdgMeeting(meeting.id, {
        patientsReviewed: null,
        notes: notes || null,
        actionItems: actionItems || null,
        nextMeetingDate: null,
      });
      setMeeting(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete meeting.');
    } finally {
      setWorking(false);
    }
  }

  async function handleCancel() {
    if (!meeting) return;
    const reason = window.prompt('Cancellation reason?');
    if (!reason) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await cancelIdgMeeting(meeting.id, reason);
      setMeeting(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel meeting.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <div role="status">Loading…</div>;
  if (error && !meeting) return <div role="alert">{error}</div>;
  if (!meeting) return null;

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        IDG Meeting #{meeting.id}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 16 }}>
        {new Date(meeting.meetingDate).toLocaleString()} • Status:{' '}
        <strong>{meeting.status}</strong>
      </p>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: 12 }}>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          disabled={meeting.status !== 'Scheduled'}
          style={{ display: 'block', marginTop: 4, width: '100%' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Action items
        <textarea
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
          rows={3}
          disabled={meeting.status !== 'Scheduled'}
          style={{ display: 'block', marginTop: 4, width: '100%' }}
        />
      </label>

      {meeting.status === 'Scheduled' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleComplete}
            disabled={working || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            style={{ cursor: (working || !canManage) ? 'not-allowed' : 'pointer' }}
          >
            Mark Completed
          </button>
          <button
            onClick={handleCancel}
            disabled={working || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            style={{ cursor: (working || !canManage) ? 'not-allowed' : 'pointer' }}
          >
            Cancel Meeting
          </button>
        </div>
      )}
    </div>
  );
}
