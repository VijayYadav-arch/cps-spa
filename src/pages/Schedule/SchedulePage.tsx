import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listScheduledVisits,
  createScheduledVisit,
  updateScheduledVisit,
  type ScheduledVisit,
  type VisitDiscipline,
  type VisitType,
} from '@/api/scheduling';
import { getPatients, type PatientSummary } from '@/api/patients';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';
import { useAuth } from '@/auth/useAuth';

const NO_PERMISSION = 'You do not have permission to perform this action';

const LEVELS_OF_CARE: { value: string; label: string }[] = [
  { value: 'RHC', label: 'Routine Home Care' },
  { value: 'CHC', label: 'Continuous Home Care' },
  { value: 'IRC', label: 'Inpatient Respite Care' },
  { value: 'GIP', label: 'General Inpatient' },
];

const DISCIPLINES: { value: VisitDiscipline; label: string }[] = [
  { value: 'skilled-nursing', label: 'Skilled Nursing' },
  { value: 'social-work', label: 'Social Work' },
  { value: 'chaplain', label: 'Chaplain' },
  { value: 'aide', label: 'Home Health Aide' },
  { value: 'physician', label: 'Physician' },
  { value: 'other', label: 'Other' },
];
const VISIT_TYPES: VisitType[] = ['routine', 'admission', 'recert', 'prn', 'discharge'];

const STATUS_TINT: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-100 text-slate-600',
  missed: 'bg-red-100 text-red-800',
};

function disciplineLabel(d: string) {
  return DISCIPLINES.find((x) => x.value === d)?.label ?? d;
}

export function SchedulePage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const myUserId = auth.user?.userId ?? null;
  const [mineOnly, setMineOnly] = useState(false);
  const canManage = usePermission(PERMISSIONS.CLINICAL_VISIT_NOTES);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Completion modal: the nurse picks the per-diem level of care before the
  // visit is marked complete (it used to silently auto-charge Routine Home Care).
  const [completing, setCompleting] = useState<ScheduledVisit | null>(null);
  const [completingLoc, setCompletingLoc] = useState('RHC');

  // Create-form state
  const [patientId, setPatientId] = useState('');
  const [discipline, setDiscipline] = useState<VisitDiscipline>('skilled-nursing');
  const [visitType, setVisitType] = useState<VisitType>('routine');
  const [start, setStart] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    setLoading(true);
    listScheduledVisits()
      .then((r) => setVisits(r.data))
      .catch(() => setError('Failed to load the schedule.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    getPatients({ pageSize: 200 })
      .then((r) => setPatients(r.data))
      .catch(() => undefined);
  }, []);

  const patientName = useMemo(() => {
    const map = new Map(patients.map((p) => [p.id, `${p.lastName}, ${p.firstName}`]));
    return (id: number) => map.get(id) ?? `Patient #${id}`;
  }, [patients]);

  const grouped = useMemo(() => {
    const source = mineOnly && myUserId != null
      ? visits.filter((v) => v.assignedUserId === myUserId)
      : visits;
    const groups = new Map<string, ScheduledVisit[]>();
    for (const v of source) {
      const day = v.scheduledStart.slice(0, 10);
      (groups.get(day) ?? groups.set(day, []).get(day)!).push(v);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visits, mineOnly, myUserId]);

  async function handleCreate() {
    if (!patientId || !start) return;
    setSubmitting(true);
    setError(null);
    try {
      await createScheduledVisit({
        patientId: parseInt(patientId, 10),
        discipline,
        visitType,
        scheduledStart: new Date(start).toISOString(),
        notes: notes || null,
      });
      setShowForm(false);
      setPatientId('');
      setStart('');
      setNotes('');
      refresh();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not schedule the visit.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(
    v: ScheduledVisit,
    status: ScheduledVisit['status'],
    levelOfCare?: string,
  ) {
    try {
      await updateScheduledVisit(v.id, { status, ...(levelOfCare ? { levelOfCare } : {}) });
      refresh();
    } catch {
      setError('Could not update the visit.');
    }
  }

  async function confirmComplete() {
    if (!completing) return;
    const visit = completing;
    setCompleting(null);
    await setStatus(visit, 'completed', completingLoc);
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Visit Schedule</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Schedule a Visit
            </button>
          )}
        </div>
        <p className="text-slate-500">Upcoming visits across the agency (next 30 days).</p>
        {myUserId != null && (
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
            />
            My visits only
          </label>
        )}
        <div className="section-line" />
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">New scheduled visit</h3>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Patient</span>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="form-input w-72"
            >
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Discipline</span>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as VisitDiscipline)}
                className="form-input w-56"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Visit Type</span>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
                className="form-input w-40"
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Start</span>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="form-input w-56"
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="form-input"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !patientId || !start}
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div role="status" className="text-slate-500">Loading schedule…</div>
      ) : grouped.length === 0 ? (
        <p className="text-slate-500">No upcoming visits scheduled.</p>
      ) : (
        grouped.map(([day, dayVisits]) => (
          <section key={day} className="grid gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {dayVisits.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 text-slate-700 w-20">
                        {new Date(v.scheduledStart).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {patientName(v.patientId)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {disciplineLabel(v.discipline)} · {v.visitType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            STATUS_TINT[v.status] ?? STATUS_TINT.scheduled
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {v.status === 'scheduled' && canManage && (
                          <span className="flex justify-end gap-2">
                            <button
                              onClick={() => { setCompleting(v); setCompletingLoc('RHC'); }}
                              className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => setStatus(v, 'cancelled')}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </span>
                        )}
                        {v.status === 'completed' && canManage && (
                          <button
                            onClick={() => navigate(`/clinician/visits/new?patientId=${v.patientId}`)}
                            className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                          >
                            Document visit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {completing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Complete visit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCompleting(null)}
        >
          <div
            className="grid w-full max-w-sm gap-4 rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">Complete visit</h3>
            <p className="text-sm text-slate-500">
              For a hospice patient this records a billable attendance day. Confirm the level of
              care for {new Date(completing.scheduledStart).toLocaleDateString()}.
            </p>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Level of care</span>
              <select
                value={completingLoc}
                onChange={(e) => setCompletingLoc(e.target.value)}
                className="form-input"
              >
                {LEVELS_OF_CARE.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCompleting(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button onClick={confirmComplete} className="btn-primary">
                Complete visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
