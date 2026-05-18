import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getWorkQueue,
  type BereavementQueueItem,
  type WorkQueueItem,
} from '@/api/hospice';

type Tab =
  | 'recerts'
  | 'noe'
  | 'hope'
  | 'idg'
  | 'reviews'
  | 'bereavementFollowUps'
  | 'bereavementOverdueContact'
  | 'addendum';

const TAB_META: Record<Tab, { label: string; emptyMessage: string }> = {
  recerts: { label: 'Recerts Due', emptyMessage: 'No recerts due in the next 15 days.' },
  noe: { label: 'NOE Overdue', emptyMessage: 'No overdue NOEs.' },
  hope: { label: 'HOPE Overdue', emptyMessage: 'No overdue HOPE assessments.' },
  idg: { label: 'IDG Overdue', emptyMessage: 'No elections with overdue IDG meetings.' },
  reviews: { label: 'Care Plan Reviews Due', emptyMessage: 'No care plan reviews past due.' },
  bereavementFollowUps: {
    label: 'Bereavement Follow-Ups',
    emptyMessage: 'No bereavement follow-ups due.',
  },
  bereavementOverdueContact: {
    label: 'Bereavement Overdue',
    emptyMessage: 'All active bereavement programs are within the 30-day cadence.',
  },
  addendum: {
    label: 'Addendum Due',
    emptyMessage: 'All active elections have an issued addendum within the 5-day window.',
  },
};

export function HospiceWorkQueue() {
  const [recerts, setRecerts] = useState<WorkQueueItem[]>([]);
  const [noe, setNoe] = useState<WorkQueueItem[]>([]);
  const [hope, setHope] = useState<WorkQueueItem[]>([]);
  const [idg, setIdg] = useState<WorkQueueItem[]>([]);
  const [reviews, setReviews] = useState<WorkQueueItem[]>([]);
  const [bereavementFollowUps, setBereavementFollowUps] = useState<
    BereavementQueueItem[]
  >([]);
  const [bereavementOverdueContact, setBereavementOverdueContact] = useState<
    BereavementQueueItem[]
  >([]);
  const [addendum, setAddendum] = useState<WorkQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('recerts');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getWorkQueue()
      .then((res) => {
        setRecerts(res.recertsDue);
        setNoe(res.noeOverdue);
        setHope(res.hopeOverdue ?? []);
        setIdg(res.idgOverdue ?? []);
        setReviews(res.carePlanReviewsDue ?? []);
        setBereavementFollowUps(res.bereavementFollowUps ?? []);
        setBereavementOverdueContact(res.bereavementOverdueContact ?? []);
        setAddendum(res.addendumDue ?? []);
      })
      .catch(() => setError('Failed to load work queue.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div role="status">Loading work queue…</div>;
  if (error) return <div role="alert">{error}</div>;

  const electionLists: Record<
    'recerts' | 'noe' | 'hope' | 'idg' | 'reviews' | 'addendum',
    WorkQueueItem[]
  > = { recerts, noe, hope, idg, reviews, addendum };
  const bereavementLists: Record<
    'bereavementFollowUps' | 'bereavementOverdueContact',
    BereavementQueueItem[]
  > = { bereavementFollowUps, bereavementOverdueContact };
  const counts: Record<Tab, number> = {
    recerts: recerts.length,
    noe: noe.length,
    hope: hope.length,
    idg: idg.length,
    reviews: reviews.length,
    bereavementFollowUps: bereavementFollowUps.length,
    bereavementOverdueContact: bereavementOverdueContact.length,
    addendum: addendum.length,
  };
  const meta = TAB_META[tab];
  const isBereavementTab =
    tab === 'bereavementFollowUps' || tab === 'bereavementOverdueContact';

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Hospice Work Queue
      </h2>

      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {(Object.keys(TAB_META) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: tab === t ? '2px solid #2563eb' : 'none',
              marginBottom: -2,
              fontWeight: tab === t ? 700 : 400,
            }}
          >
            {TAB_META[t].label} ({counts[t]})
          </button>
        ))}
      </div>

      {counts[tab] === 0 ? (
        <p style={{ color: '#64748b' }}>{meta.emptyMessage}</p>
      ) : isBereavementTab ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Due Date</th>
              <th style={{ padding: '8px 12px' }}>Days Overdue</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bereavementLists[
              tab as 'bereavementFollowUps' | 'bereavementOverdueContact'
            ].map((item, idx) => (
              <tr
                key={`${item.type}-${item.programId}-${idx}`}
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                <td style={{ padding: '8px 12px' }}>
                  {item.patientName ? (
                    <Link to={`/patients/${item.patientId}`}>{item.patientName}</Link>
                  ) : (
                    <span style={{ color: '#64748b' }}>Patient #{item.patientId}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>{item.dueDate}</td>
                <td style={{ padding: '8px 12px' }}>{item.daysOverdue}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/hospice/bereavement/${item.programId}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Due Date</th>
              <th style={{ padding: '8px 12px' }}>
                {tab === 'recerts' ? 'Days Until Due' : 'Days Overdue'}
              </th>
              {tab === 'recerts' && (
                <th style={{ padding: '8px 12px' }}>Period</th>
              )}
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {electionLists[
              tab as 'recerts' | 'noe' | 'hope' | 'idg' | 'reviews' | 'addendum'
            ].map((item, idx) => (
              <tr
                key={`${item.type}-${item.electionId}-${idx}`}
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                <td style={{ padding: '8px 12px' }}>
                  {item.patientName ? (
                    <Link to={`/patients/${item.patientId}`}>{item.patientName}</Link>
                  ) : (
                    <span style={{ color: '#64748b' }}>Patient #{item.patientId}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>{item.dueDate}</td>
                <td style={{ padding: '8px 12px' }}>
                  {tab === 'recerts' ? item.daysUntilDue : item.daysOverdue}
                </td>
                {tab === 'recerts' && (
                  <td style={{ padding: '8px 12px' }}>{item.periodNumber}</td>
                )}
                <td style={{ padding: '8px 12px' }}>
                  {tab === 'addendum' ? (
                    <Link to={`/hospice/elections/${item.electionId}/addendum`}>
                      Open Addendum
                    </Link>
                  ) : item.electionId > 0 ? (
                    <Link to={`/patients/${item.patientId}/hospice/${item.electionId}`}>
                      View
                    </Link>
                  ) : (
                    <Link to={`/patients/${item.patientId}`}>Open Patient</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
