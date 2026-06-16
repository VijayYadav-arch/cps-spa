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

  if (isLoading)
    return (
      <div role="status" className="p-6 text-slate-500">
        Loading work queue…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );

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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Hospice Work Queue</h2>
        <div className="section-line" />
      </header>

      <div
        role="tablist"
        className="flex flex-wrap gap-0 border-b-2 border-slate-200"
      >
        {(Object.keys(TAB_META) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-0.5 border-b-2 px-4 py-2 transition-colors ${
              tab === t
                ? 'border-teal-600 font-bold text-navy-900'
                : 'border-transparent font-normal text-slate-600 hover:text-navy-900'
            }`}
          >
            {TAB_META[t].label} ({counts[t]})
          </button>
        ))}
      </div>

      {counts[tab] === 0 ? (
        <p className="text-slate-500">{meta.emptyMessage}</p>
      ) : isDischargeTasksTab ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Days Until Due</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {dischargeTasksDue.map((item, idx) => (
                <tr
                  key={`discharge-task-${item.dischargeId}-${idx}`}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {item.patientName ? (
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {item.patientName}
                      </Link>
                    ) : (
                      <span className="text-slate-500">
                        Patient #{item.patientId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.taskTitle}</td>
                  <td className="px-4 py-3 text-slate-700">{item.dueDate}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.daysUntilDue}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/hospice/discharges/${item.dischargeId}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Open Discharge
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : isSurveyRiskTab ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Effective Date</th>
                <th className="px-4 py-3">Risk Flags</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {surveyRiskDischarges.map((item, idx) => (
                <tr
                  key={`survey-risk-${item.dischargeId}-${idx}`}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {item.patientName ? (
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {item.patientName}
                      </Link>
                    ) : (
                      <span className="text-slate-500">
                        Patient #{item.patientId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.reason}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.effectiveDate}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.surveyRiskFlags.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/hospice/discharges/${item.dischargeId}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : isBereavementTab ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Days Overdue</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {bereavementLists[
                tab as 'bereavementFollowUps' | 'bereavementOverdueContact'
              ].map((item, idx) => (
                <tr
                  key={`${item.type}-${item.programId}-${idx}`}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {item.patientName ? (
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {item.patientName}
                      </Link>
                    ) : (
                      <span className="text-slate-500">
                        Patient #{item.patientId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.dueDate}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.daysOverdue}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/hospice/bereavement/${item.programId}`}
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">
                  {tab === 'recerts' || tab === 'ftf'
                    ? 'Days Until Due'
                    : 'Days Overdue'}
                </th>
                {(tab === 'recerts' || tab === 'ftf') && (
                  <th className="px-4 py-3">Period</th>
                )}
                <th className="px-4 py-3">Action</th>
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
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {item.patientName ? (
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {item.patientName}
                      </Link>
                    ) : (
                      <span className="text-slate-500">
                        Patient #{item.patientId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.dueDate}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {tab === 'recerts' || tab === 'ftf'
                      ? item.daysUntilDue
                      : item.daysOverdue}
                  </td>
                  {(tab === 'recerts' || tab === 'ftf') && (
                    <td className="px-4 py-3 text-slate-700">
                      {item.periodNumber}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {tab === 'addendum' ? (
                      <Link
                        to={`/hospice/elections/${item.electionId}/addendum`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        Open Addendum
                      </Link>
                    ) : item.electionId > 0 ? (
                      <Link
                        to={`/patients/${item.patientId}/hospice/${item.electionId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        View
                      </Link>
                    ) : (
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        Open Patient
                      </Link>
                    )}
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
