import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDischarge, editDischarge, completeDischargeTask,
  type HospiceDischarge,
} from '@/api/hospice';
import { HospiceDischargeTaskRow } from '@/components/HospiceDischargeTaskRow';
import { HospiceDischargeReasonBadge } from '@/components/HospiceDischargeReasonBadge';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function HospiceDischargeDetail() {
  const { dischargeId } = useParams<{ dischargeId: string }>();
  const [discharge, setDischarge] = useState<HospiceDischarge | null>(null);
  const [editing, setEditing] = useState(false);
  const [idgDate, setIdgDate] = useState('');

  // Save → editDischarge → PATCH /hospice/discharges/{id} [Policy=hospice:discharge_manage]
  const canManage = usePermission(PERMISSIONS.HOSPICE_DISCHARGE_MANAGE);

  useEffect(() => {
    void getDischarge(Number(dischargeId)).then(setDischarge);
  }, [dischargeId]);

  if (!discharge) return <div role="status" className="text-slate-500">Loading…</div>;

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
    <div className="discharge-detail grid max-w-[1200px] gap-6 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">Discharge #{discharge.id}</h2>
        <HospiceDischargeReasonBadge reason={discharge.reason} />
      </header>

      {discharge.isSurveyRisk && (
        <div
          role="alert"
          className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3 font-semibold text-amber-800"
        >
          Survey Risk: {discharge.surveyRiskFlags.length} missing for-cause fields
          <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">
            {discharge.surveyRiskFlags.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="grid gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Receiving agency</dt>
          <dd className="text-slate-800">{discharge.receivingAgencyName ?? '—'}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Effective date</dt>
          <dd className="text-slate-800">{discharge.effectiveDate}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">IDG approval</dt>
          <dd className="text-slate-800">{discharge.idgApprovalDate ?? '—'}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Physician sign-off user</dt>
          <dd className="text-slate-800">{discharge.physicianSignOffUserId ?? '—'}</dd>
        </div>
      </dl>

      <div>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={() => setEditing(true)}
        >
          Edit Discharge
        </button>
      </div>

      {editing && (
        <section className="edit-form grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Edit Discharge</h3>
          <label htmlFor="edit-idg" className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">IDG approval date</span>
            <input
              id="edit-idg"
              type="date"
              className="form-input"
              value={idgDate}
              onChange={e => setIdgDate(e.target.value)}
            />
          </label>
          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveEdit}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              Save
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
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
      </section>
    </div>
  );
}
