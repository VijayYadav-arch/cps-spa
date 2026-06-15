import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getAdverseEvent,
  updateAdverseEventStatus,
  createRca,
  type HospiceAdverseEvent,
  type HospiceAdverseEventStatus,
} from '@/api/qapi';
import { RcaForm, type RcaFormSubmitPayload } from '@/components/RcaForm';
import { AdverseEventBadge } from '@/components/AdverseEventBadge';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const NEXT_STATUSES: Record<HospiceAdverseEventStatus, HospiceAdverseEventStatus[]> = {
  Draft: ['Active', 'DismissedAsNonEvent'],
  Active: ['UnderReview', 'Closed'],
  UnderReview: ['Closed'],
  Closed: [],
  DismissedAsNonEvent: [],
};

export function AdverseEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const [ev, setEv] = useState<HospiceAdverseEvent | null>(null);
  const [notes, setNotes] = useState('');

  // Status transitions hit PATCH /adverse-events/{id}, gated by
  // hospice:qapi_adverse_event_manage. (The RCA create endpoint is gated by the
  // same policy; its submit button lives in the shared RcaForm component.)
  const canManage = usePermission(PERMISSIONS.HOSPICE_QAPI_ADVERSE_EVENT_MANAGE);

  const reload = async () => { setEv(await getAdverseEvent(id)); };
  useEffect(() => { void reload(); }, [id]);

  if (!ev) return <p>Loading…</p>;

  const handleTransition = async (to: HospiceAdverseEventStatus) => {
    await updateAdverseEventStatus(id, { status: to, notes: notes || undefined });
    setNotes('');
    await reload();
  };

  const handleRcaSubmit = async (payload: RcaFormSubmitPayload) => {
    await createRca(id, payload);
    await reload();
  };

  return (
    <div>
      <header>
        <h1>Event #{ev.id}: {ev.category} <AdverseEventBadge severity={ev.severity} /></h1>
        <p>Status: {ev.status} • Source: {ev.source} • Date: {ev.eventDate}</p>
      </header>
      <section>
        <h2>Summary</h2>
        <p>{ev.summary}</p>
        {ev.immediateActionTaken && <><h3>Immediate Action</h3><p>{ev.immediateActionTaken}</p></>}
        {ev.notes && <><h3>Notes</h3><p>{ev.notes}</p></>}
      </section>

      {NEXT_STATUSES[ev.status].length > 0 && (
        <section>
          <h2>Status Transition</h2>
          <label>Notes (required to dismiss auto-derived)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          <div>
            {NEXT_STATUSES[ev.status].map(next => (
              <button
                key={next}
                onClick={() => handleTransition(next)}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
              >
                Move to {next}
              </button>
            ))}
          </div>
        </section>
      )}

      {!ev.rca && ev.status !== 'DismissedAsNonEvent' && (
        <section>
          <h2>Root Cause Analysis</h2>
          <RcaForm onSubmit={handleRcaSubmit} />
        </section>
      )}

      {ev.rca && (
        <section>
          <h2>RCA</h2>
          <p>Method: {ev.rca.rcaMethod}</p>
          <p>Contributing Factors: {ev.rca.contributingFactors}</p>
          <p>Root Cause: {ev.rca.rootCauseSummary}</p>
          {ev.rca.linkedPipId && <p>Linked PIP: #{ev.rca.linkedPipId}</p>}
        </section>
      )}
    </div>
  );
}
