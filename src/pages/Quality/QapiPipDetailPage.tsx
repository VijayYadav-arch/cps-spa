import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  listPips,
  updatePipMeasurement,
  activatePip,
  completePip,
  type HospiceQapiPip,
} from '@/api/qapi';
import { PipScorecard } from '@/components/PipScorecard';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function QapiPipDetailPage() {
  const { pipId } = useParams<{ pipId: string }>();
  const id = Number(pipId);
  const [pip, setPip] = useState<HospiceQapiPip | null>(null);

  const reload = async () => {
    // No GET /pips/{id} endpoint — list and filter by id (cheap for MVP)
    const all = await listPips();
    const found = all.find(p => p.id === id) ?? null;
    setPip(found);
  };

  useEffect(() => { void reload(); }, [id]);

  const [baseline, setBaseline] = useState<number | ''>('');
  const [target, setTarget] = useState<number | ''>('');
  const [current, setCurrent] = useState<number | ''>('');
  const [outcomeSummary, setOutcomeSummary] = useState('');

  // Update-measurement, activate, and complete all hit endpoints gated by
  // hospice:qapi_pip_manage.
  const canManage = usePermission(PERMISSIONS.HOSPICE_QAPI_PIP_MANAGE);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePipMeasurement(id, {
      baseline: baseline === '' ? undefined : Number(baseline),
      target: target === '' ? undefined : Number(target),
      current: current === '' ? undefined : Number(current),
    });
    await reload();
  };

  const handleActivate = async () => {
    await activatePip(id);
    await reload();
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    await completePip(id, outcomeSummary);
    await reload();
  };

  if (!pip) return <div role="status" className="text-slate-500">Loading…</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <PipScorecard pip={pip} />
      <p className="text-slate-700">{pip.description}</p>
      <p className="text-slate-700">Status: {pip.status}</p>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Update Measurements</h3>
        <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Baseline</span>
            <input className="form-input w-auto" type="number" step="0.01" value={baseline} onChange={e => setBaseline(e.target.value as unknown as number)} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Target</span>
            <input className="form-input w-auto" type="number" step="0.01" value={target} onChange={e => setTarget(e.target.value as unknown as number)} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Current</span>
            <input className="form-input w-auto" type="number" step="0.01" value={current} onChange={e => setCurrent(e.target.value as unknown as number)} />
          </label>
          <button
            type="submit"
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </form>
      </section>

      {pip.status === 'Planning' && (
        <button
          onClick={handleActivate}
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          className="justify-self-start rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Move to Active
        </button>
      )}

      {pip.status !== 'Completed' && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Complete PIP</h3>
          <form onSubmit={handleComplete} className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Outcome Summary</span>
              <textarea className="form-input" value={outcomeSummary} onChange={e => setOutcomeSummary(e.target.value)} rows={4} required />
            </label>
            <button
              type="submit"
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary justify-self-start disabled:cursor-not-allowed disabled:opacity-60"
            >
              Complete
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
