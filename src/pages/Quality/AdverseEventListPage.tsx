import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listAdverseEvents,
  type HospiceAdverseEvent,
  type HospiceAdverseEventStatus,
} from '@/api/qapi';
import { AdverseEventBadge } from '@/components/AdverseEventBadge';

const STATUSES: HospiceAdverseEventStatus[] = ['Draft', 'Active', 'UnderReview', 'Closed', 'DismissedAsNonEvent'];

export function AdverseEventListPage() {
  const [events, setEvents] = useState<HospiceAdverseEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<HospiceAdverseEventStatus | ''>('');

  useEffect(() => {
    void listAdverseEvents({ status: statusFilter || undefined }).then(setEvents);
  }, [statusFilter]);

  return (
    <div>
      <header>
        <h1>Adverse Events</h1>
        <Link to="/quality/qapi/adverse-events/new" className="btn btn-primary">+ Report Event</Link>
      </header>
      <div className="filters">
        <label htmlFor="event-status">Status</label>
        <select id="event-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as HospiceAdverseEventStatus | '')}>
          <option value="">All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Severity</th><th>Status</th><th>Summary</th></tr></thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className={e.status === 'Draft' ? 'row-draft' : undefined}>
              <td>{e.eventDate}</td>
              <td>{e.category}</td>
              <td><AdverseEventBadge severity={e.severity} /></td>
              <td>{e.status}</td>
              <td><Link to={`/quality/qapi/adverse-events/${e.id}`}>{e.summary}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
