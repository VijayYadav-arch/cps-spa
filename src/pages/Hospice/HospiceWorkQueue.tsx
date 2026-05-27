import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getWorkQueue,
  type BereavementQueueItem,
  type WorkQueueItem,
  type DischargeTaskQueueItem,
  type SurveyRiskDischargeQueueItem,
} from '@/api/hospice';

type Tab =
  | 'recerts'
  | 'noe'
  | 'hope'
  | 'idg'
  | 'reviews'
  | 'bereavementFollowUps'
  | 'bereavementOverdueContact'
  | 'addendum'
  | 'notr'
  | 'ftf'
  | 'dischargeTasksDue'
  | 'surveyRiskDischarges';

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
  notr: {
    label: 'NOTR Overdue',
    emptyMessage: 'No NOTR (8XB) filings past the 5-day deadline.',
  },
  ftf: {
    label: 'FTF Due',
    emptyMessage:
      'No Face-to-Face encounters due (period 3+ within 30-day window).',
  },
  dischargeTasksDue: {
    label: 'Discharge Tasks Due',
    emptyMessage: 'No discharge tasks due in the next 7 days.',
  },
  surveyRiskDischarges: {
    label: 'Survey Risk Discharges',
    emptyMessage: 'No survey-risk discharges.',
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
  const [notr, setNotr] = useState<WorkQueueItem[]>([]);
  const [ftf, setFtf] = useState<WorkQueueItem[]>([]);
  const [dischargeTasksDue, setDischargeTasksDue] = useState<DischargeTaskQueueItem[]>([]);
  const [surveyRiskDischarges, setSurveyRiskDischarges] = useState<SurveyRiskDischargeQueueItem[]>([]);
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
        setNotr(res.notrOverdue ?? []);
        setFtf(res.ftfDue ?? []);
        setDischargeTasksDue(res.dischargeTasksDue ?? []);
        setSurveyRiskDischarges(res.surveyRiskDischarges ?? []);
      })
      .catch(() => setError('Failed to load work queue.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div role="status">Loading work queue…</div>;
  if (error) return <div role="alert">{error}</div>;

  const electionLists: Record<
    'recerts' | 'noe' | 'hope' | 'idg' | 'reviews' | 'addendum' | 'notr' | 'ftf',
    WorkQueueItem[]
  > = { recerts, noe, hope, idg, reviews, addendum, notr, ftf };
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
    notr: notr.length,
    ftf: ftf.length,
    dischargeTasksDue: dischargeTasksDue.length,
    surveyRiskDischarges: surveyRiskDischarges.length,
  };
  const meta = TAB_META[tab];
  const isBereavementTab =
    tab === 'bereavementFollowUps' || tab === 'bereavementOverdueContact';
  const isDischargeTasksTab = tab === 'dischargeTasksDue';
  const isSurveyRiskTab = tab === 'surveyRiskDischarges';

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
      ) : isDischargeTasksTab ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Task</th>
              <th style={{ padding: '8px 12px' }}>Due Date</th>
              <th style={{ padding: '8px 12px' }}>Days Until Due</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {dischargeTasksDue.map((item, idx) => (
              <tr
                key={`discharge-task-${item.dischargeId}-${idx}`}
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                <td style={{ padding: '8px 12px' }}>
                  {item.patientName ? (
                    <Link to={`/patients/${item.patientId}`}>{item.patientName}</Link>
                  ) : (
                    <span style={{ color: '#64748b' }}>Patient #{item.patientId}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>{item.taskTitle}</td>
                <td style={{ padding: '8px 12px' }}>{item.dueDate}</td>
                <td style={{ padding: '8px 12px' }}>{item.daysUntilDue}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/hospice/discharges/${item.dischargeId}`}>Open Discharge</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : isSurveyRiskTab ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Reason</th>
              <th style={{ padding: '8px 12px' }}>Effective Date</th>
              <th style={{ padding: '8px 12px' }}>Risk Flags</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {surveyRiskDischarges.map((item, idx) => (
              <tr
                key={`survey-risk-${item.dischargeId}-${idx}`}
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                <td style={{ padding: '8px 12px' }}>
                  {item.patientName ? (
                    <Link to={`/patients/${item.patientId}`}>{item.patientName}</Link>
                  ) : (
                    <span style={{ color: '#64748b' }}>Patient #{item.patientId}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>{item.reason}</td>
                <td style={{ padding: '8px 12px' }}>{item.effectiveDate}</td>
                <td style={{ padding: '8px 12px' }}>{item.surveyRiskFlags.join(', ')}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/hospice/discharges/${item.dischargeId}`}>Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                {tab === 'recerts' || tab === 'ftf'
                  ? 'Days Until Due'
                  : 'Days Overdue'}
              </th>
              {(tab === 'recerts' || tab === 'ftf') && (
                <th style={{ padding: '8px 12px' }}>Period</th>
              )}
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {electionLists[
              tab as
                | 'recerts'
                | 'noe'
                | 'hope'
                | 'idg'
                | 'reviews'
                | 'addendum'
                | 'notr'
                | 'ftf'
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
                  {tab === 'recerts' || tab === 'ftf'
                    ? item.daysUntilDue
                    : item.daysOverdue}
                </td>
                {(tab === 'recerts' || tab === 'ftf') && (
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
