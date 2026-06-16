import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDischarges, type HospiceDischarge, type HospiceDischargeReason } from '@/api/hospice';
import { HospiceDischargeReasonBadge } from '@/components/HospiceDischargeReasonBadge';

export function HospiceDischargedElectionsList() {
  const [discharges, setDischarges] = useState<HospiceDischarge[]>([]);
  const [filter, setFilter] = useState<HospiceDischargeReason | ''>('');

  useEffect(() => {
    void listDischarges(filter || undefined).then(setDischarges);
  }, [filter]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl">Discharged elections</h1>
        <div className="section-line" />
      </header>
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="reason-filter" className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Filter by reason</span>
          <select
            id="reason-filter"
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="form-input w-56"
          >
            <option value="">All</option>
            <option value="Transfer">Transfer</option>
            <option value="OutOfServiceArea">Out of Area</option>
            <option value="NoLongerTerminal">No Longer Terminal</option>
            <option value="ForCause">For Cause</option>
            <option value="AgencyClosure">Agency Closure</option>
          </select>
        </label>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Effective</th>
            </tr>
          </thead>
          <tbody>
            {discharges.map(d => (
              <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">
                  <Link
                    to={`/hospice/discharges/${d.id}`}
                    className="font-medium text-teal-700 hover:underline"
                  >
                    #{d.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <HospiceDischargeReasonBadge reason={d.reason} />
                </td>
                <td className="px-4 py-3 text-slate-700">{d.effectiveDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
