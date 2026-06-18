import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getIdgMeeting,
  completeIdgMeeting,
  cancelIdgMeeting,
  type IdgMeeting,
} from '@/api/hospice';
import { useAnyPermission } from '@/permissions/useAnyPermission';
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
  // → IdgManage policy (hospice:manage OR hospice:idg_manage).
  const canManage = useAnyPermission([PERMISSIONS.HOSPICE_MANAGE, PERMISSIONS.HOSPICE_IDG_MANAGE]);

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

  if (loading) return <div role="status" className="text-slate-500">Loading…</div>;
  if (error && !meeting) return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;
  if (!meeting) return null;

  return (
    <div className="grid max-w-3xl gap-6 p-6">
      <div>
        <button
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>
      <header className="space-y-2">
        <h2 className="text-2xl">
          IDG Meeting #{meeting.id}
        </h2>
        <div className="section-line" />
        <p className="text-slate-500">
          {new Date(meeting.meetingDate).toLocaleString()} • Status:{' '}
          <strong className="text-slate-800">{meeting.status}</strong>
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Notes</span>
          <textarea
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            disabled={meeting.status !== 'Scheduled'}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Action items</span>
          <textarea
            className="form-input"
            value={actionItems}
            onChange={(e) => setActionItems(e.target.value)}
            rows={3}
            disabled={meeting.status !== 'Scheduled'}
          />
        </label>

        {meeting.status === 'Scheduled' && (
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={handleComplete}
              disabled={working || !canManage}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              Mark Completed
            </button>
            <button
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={handleCancel}
              disabled={working || !canManage}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              Cancel Meeting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
