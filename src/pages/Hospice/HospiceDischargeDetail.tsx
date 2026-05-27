import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDischarge, editDischarge, completeDischargeTask,
  type HospiceDischarge,
} from '@/api/hospice';
import { HospiceDischargeTaskRow } from '@/components/HospiceDischargeTaskRow';
import { HospiceDischargeReasonBadge } from '@/components/HospiceDischargeReasonBadge';

export function HospiceDischargeDetail() {
  const { dischargeId } = useParams<{ dischargeId: string }>();
  const [discharge, setDischarge] = useState<HospiceDischarge | null>(null);
  const [editing, setEditing] = useState(false);
  const [idgDate, setIdgDate] = useState('');

  useEffect(() => {
    void getDischarge(Number(dischargeId)).then(setDischarge);
  }, [dischargeId]);

  if (!discharge) return <div>Loading…</div>;

  async function handleComplete(taskId: number) {
    await completeDischargeTask(discharge!.id, taskId, undefined);
    const fresh = await getDischarge(discharge!.id);
    setDischarge(fresh);
  }

  async function handleSaveEdit() {
    await editDischarge(discharge!.id, { idgApprovalDate: idgDate || null });
    const fresh = await getDischarge(discharge!.id);
    setDischarge(fresh);
    setEditing(false);
  }

  return (
    <div className="discharge-detail">
      <header>
        <h1>Discharge #{discharge.id}</h1>
        <HospiceDischargeReasonBadge reason={discharge.reason} />
      </header>

      {discharge.isSurveyRisk && (
        <div role="alert" className="alert alert-warning">
          Survey Risk: {discharge.surveyRiskFlags.length} missing for-cause fields
          <ul>
            {discharge.surveyRiskFlags.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}

      <dl>
        <dt>Receiving agency</dt><dd>{discharge.receivingAgencyName ?? '—'}</dd>
        <dt>Effective date</dt><dd>{discharge.effectiveDate}</dd>
        <dt>IDG approval</dt><dd>{discharge.idgApprovalDate ?? '—'}</dd>
        <dt>Physician sign-off user</dt><dd>{discharge.physicianSignOffUserId ?? '—'}</dd>
      </dl>

      <button type="button" onClick={() => setEditing(true)}>Edit Discharge</button>

      {editing && (
        <section className="edit-form">
          <h2>Edit Discharge</h2>
          <label htmlFor="edit-idg">IDG approval date</label>
          <input id="edit-idg" type="date" value={idgDate} onChange={e => setIdgDate(e.target.value)} />
          <button type="button" onClick={handleSaveEdit}>Save</button>
        </section>
      )}

      <h2>Tasks</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Title</th><th>Due</th><th>Completed</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {discharge.tasks.map(t => (
            <HospiceDischargeTaskRow
              key={t.id}
              task={t}
              onComplete={handleComplete}
              onEdit={() => {/* TODO: inline edit modal */}}
              onRemove={() => {/* TODO: confirm + removeDischargeTask */}}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
