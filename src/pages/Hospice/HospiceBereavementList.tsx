import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listBereavementPrograms,
  type BereavementProgram,
  type BereavementProgramStatus,
} from '@/api/hospice';

const STATUSES: BereavementProgramStatus[] = ['Active', 'Completed', 'Closed'];

export function HospiceBereavementList() {
  const [status, setStatus] = useState<BereavementProgramStatus>('Active');
  const [programs, setPrograms] = useState<BereavementProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    listBereavementPrograms(status)
      .then((res) => setPrograms(res.data))
      .catch(() => setError('Failed to load bereavement programs.'))
      .finally(() => setIsLoading(false));
  }, [status]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Bereavement Programs</h2>
        <div className="section-line" />
      </header>
      <div role="tablist" className="flex gap-0 border-b-2 border-slate-200">
        {STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={`-mb-0.5 px-4 py-2 transition-colors ${
              status === s
                ? 'border-b-2 border-teal-600 font-bold text-navy-900'
                : 'font-normal text-slate-600 hover:text-navy-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

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
        <p className="text-slate-500">No programs in this status.</p>
      )}
      {!isLoading && !error && programs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Program #</th>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Date of Death</th>
                <th className="px-4 py-3">Program Ends</th>
                <th className="px-4 py-3">Days Remaining</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">{p.id}</td>
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
                    {p.daysUntilProgramEnd}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.initialRiskLevel ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <Link
                      to={`/hospice/bereavement/${p.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Open
                    </Link>
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
