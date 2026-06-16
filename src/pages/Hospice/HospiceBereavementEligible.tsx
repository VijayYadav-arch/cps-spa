import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  completeBereavementProgram,
  listEligibleForCompletion,
  type BereavementProgram,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function HospiceBereavementEligible() {
  const [programs, setPrograms] = useState<BereavementProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Complete hits POST /hospice/bereavement/programs/{id}/complete
  // → [Authorize(hospice:bereavement)].
  const canManage = usePermission(PERMISSIONS.HOSPICE_BEREAVEMENT);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listEligibleForCompletion();
      setPrograms(res.data);
    } catch {
      setError('Failed to load eligible-for-completion list.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleComplete(id: number) {
    setBusyId(id);
    try {
      await completeBereavementProgram(id);
      await refresh();
    } catch {
      setError('Failed to complete program.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Bereavement — Eligible for Completion</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Programs whose 13-month window has elapsed and are ready for completion.
        </p>
      </header>
      {isLoading && (
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}
      {!isLoading && !error && programs.length === 0 && (
        <p className="text-slate-500">No programs eligible for completion.</p>
      )}
      {!isLoading && !error && programs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Program #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Date of Death</th>
                <th className="px-4 py-3">Ends</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">
                    <Link
                      to={`/hospice/bereavement/${p.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      #{p.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <Link
                      to={`/patients/${p.patientId}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      #{p.patientId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.dateOfDeath}</td>
                  <td className="px-4 py-3 text-slate-700">{p.programEndDate}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <button
                      disabled={busyId === p.id || !canManage}
                      onClick={() => void handleComplete(p.id)}
                      title={!canManage ? NO_PERMISSION : undefined}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === p.id ? 'Completing…' : 'Complete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
