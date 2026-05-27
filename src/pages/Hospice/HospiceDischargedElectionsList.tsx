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
    <div>
      <h1>Discharged elections</h1>
      <label htmlFor="reason-filter">Filter by reason</label>
      <select id="reason-filter" value={filter} onChange={e => setFilter(e.target.value as any)}>
        <option value="">All</option>
        <option value="Transfer">Transfer</option>
        <option value="OutOfServiceArea">Out of Area</option>
        <option value="NoLongerTerminal">No Longer Terminal</option>
        <option value="ForCause">For Cause</option>
        <option value="AgencyClosure">Agency Closure</option>
      </select>
      <table>
        <thead><tr><th>ID</th><th>Reason</th><th>Effective</th></tr></thead>
        <tbody>
          {discharges.map(d => (
            <tr key={d.id}>
              <td><Link to={`/hospice/discharges/${d.id}`}>#{d.id}</Link></td>
              <td><HospiceDischargeReasonBadge reason={d.reason} /></td>
              <td>{d.effectiveDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
