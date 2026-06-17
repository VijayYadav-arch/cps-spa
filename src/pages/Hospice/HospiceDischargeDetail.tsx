import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDischarge, editDischarge, completeDischargeTask,
  addDischargeTask, editDischargeTask, removeDischargeTask,
  type HospiceDischarge, type HospiceDischargeTaskType,
} from '@/api/hospice';
import { HospiceDischargeTaskRow } from '@/components/HospiceDischargeTaskRow';
import { HospiceDischargeReasonBadge } from '@/components/HospiceDischargeReasonBadge';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const TASK_TYPES: HospiceDischargeTaskType[] = [
  'DmeRetrieval',
  'RecordsTransfer',
  'FamilyNotification',
  'PhysicianSignOffConfirmation',
  'Other',
];

interface TaskForm {
  id: number | null;
  taskType: HospiceDischargeTaskType;
  title: string;
  dueDate: string;
  notes: string;
}

export function HospiceDischargeDetail() {
  const { dischargeId } = useParams<{ dischargeId: string }>();
  const [discharge, setDischarge] = useState<HospiceDischarge | null>(null);
  const [editing, setEditing] = useState(false);
  const [idgDate, setIdgDate] = useState('');
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);

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

  function openAddTask() {
    setTaskForm({
      id: null,
      taskType: 'Other',
      title: '',
      dueDate: discharge!.effectiveDate,
      notes: '',
    });
  }

  function openEditTask(taskId: number) {
    const t = discharge!.tasks.find(x => x.id === taskId);
    if (!t) return;
    setTaskForm({
      id: t.id,
      taskType: t.taskType,
      title: t.title,
      dueDate: t.dueDate,
      notes: t.notes ?? '',
    });
  }

  async function handleSaveTask() {
    if (!taskForm || !taskForm.title.trim()) return;
    setTaskBusy(true);
    try {
      if (taskForm.id == null) {
        await addDischargeTask(discharge!.id, {
          taskType: taskForm.taskType,
          title: taskForm.title.trim(),
          dueDate: taskForm.dueDate,
          notes: taskForm.notes || null,
        });
      } else {
        await editDischargeTask(discharge!.id, taskForm.id, {
          title: taskForm.title.trim(),
          dueDate: taskForm.dueDate,
          notes: taskForm.notes || null,
        });
      }
      setTaskForm(null);
      setDischarge(await getDischarge(discharge!.id));
    } finally {
      setTaskBusy(false);
    }
  }

  async function handleRemoveTask(taskId: number) {
    if (!window.confirm('Remove this discharge task? This cannot be undone.')) return;
    await removeDischargeTask(discharge!.id, taskId);
    setDischarge(await getDischarge(discharge!.id));
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tasks</h3>
          {!taskForm && (
            <button
              type="button"
              onClick={openAddTask}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Task
            </button>
          )}
        </div>

        {taskForm && (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="font-semibold">{taskForm.id == null ? 'Add task' : 'Edit task'}</h4>
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Type</span>
                <select
                  value={taskForm.taskType}
                  onChange={e => setTaskForm({ ...taskForm, taskType: e.target.value as HospiceDischargeTaskType })}
                  disabled={taskForm.id != null}
                  className="form-input w-56"
                >
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Due date</span>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="form-input w-44"
                />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Title</span>
              <input
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Notes (optional)</span>
              <textarea
                value={taskForm.notes}
                onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                rows={2}
                className="form-input"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaskForm(null)}
                disabled={taskBusy}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTask}
                disabled={taskBusy || !canManage || !taskForm.title.trim()}
                title={!canManage ? NO_PERMISSION : undefined}
                className="btn-primary disabled:opacity-60"
              >
                {taskBusy ? 'Saving…' : taskForm.id == null ? 'Add task' : 'Save task'}
              </button>
            </div>
          </div>
        )}

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
                  onEdit={openEditTask}
                  onRemove={handleRemoveTask}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
