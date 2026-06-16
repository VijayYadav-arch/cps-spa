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

  if (!ev) return <div role="status" className="text-slate-500">Loading…</div>;

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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="flex flex-wrap items-center gap-2 text-2xl">
          Event #{ev.id}: {ev.category} <AdverseEventBadge severity={ev.severity} />
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Status: {ev.status} • Source: {ev.source} • Date: {ev.eventDate}
        </p>
      </header>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Summary</h3>
        <p className="text-slate-700">{ev.summary}</p>
        {ev.immediateActionTaken && (
          <>
            <h4 className="text-sm font-semibold text-slate-700">Immediate Action</h4>
            <p className="text-slate-700">{ev.immediateActionTaken}</p>
          </>
        )}
        {ev.notes && (
          <>
            <h4 className="text-sm font-semibold text-slate-700">Notes</h4>
            <p className="text-slate-700">{ev.notes}</p>
          </>
        )}
      </section>

      {NEXT_STATUSES[ev.status].length > 0 && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Status Transition</h3>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Notes (required to dismiss auto-derived)</span>
            <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </label>
          <div className="flex flex-wrap gap-2">
            {NEXT_STATUSES[ev.status].map(next => (
              <button
                key={next}
                onClick={() => handleTransition(next)}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Move to {next}
              </button>
            ))}
          </div>
        </section>
      )}

      {!ev.rca && ev.status !== 'DismissedAsNonEvent' && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Root Cause Analysis</h3>
          <RcaForm onSubmit={handleRcaSubmit} />
        </section>
      )}

      {ev.rca && (
        <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">RCA</h3>
          <p className="text-slate-700">Method: {ev.rca.rcaMethod}</p>
          <p className="text-slate-700">Contributing Factors: {ev.rca.contributingFactors}</p>
          <p className="text-slate-700">Root Cause: {ev.rca.rootCauseSummary}</p>
          {ev.rca.linkedPipId && <p className="text-slate-700">Linked PIP: #{ev.rca.linkedPipId}</p>}
        </section>
      )}
    </div>
  );
}
