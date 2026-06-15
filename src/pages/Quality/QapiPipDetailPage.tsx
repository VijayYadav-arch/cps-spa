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

  if (!pip) return <p>Loading…</p>;

  return (
    <div>
      <PipScorecard pip={pip} />
      <p>{pip.description}</p>
      <p>Status: {pip.status}</p>

      <section>
        <h2>Update Measurements</h2>
        <form onSubmit={handleUpdate}>
          <label>Baseline <input type="number" step="0.01" value={baseline} onChange={e => setBaseline(e.target.value as unknown as number)} /></label>
          <label>Target <input type="number" step="0.01" value={target} onChange={e => setTarget(e.target.value as unknown as number)} /></label>
          <label>Current <input type="number" step="0.01" value={current} onChange={e => setCurrent(e.target.value as unknown as number)} /></label>
          <button
            type="submit"
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
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
          style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
        >
          Move to Active
        </button>
      )}

      {pip.status !== 'Completed' && (
        <section>
          <h2>Complete PIP</h2>
          <form onSubmit={handleComplete}>
            <label>Outcome Summary</label>
            <textarea value={outcomeSummary} onChange={e => setOutcomeSummary(e.target.value)} rows={4} required />
            <button
              type="submit"
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
            >
              Complete
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
