import { useEffect, useMemo, useState } from 'react';
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

const NO_PERMISSION = 'You do not have permission to perform this action';

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
  const canManage = usePermission(PERMISSIONS.CLINICAL_VISIT_NOTES);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    const groups = new Map<string, ScheduledVisit[]>();
    for (const v of visits) {
      const day = v.scheduledStart.slice(0, 10);
      (groups.get(day) ?? groups.set(day, []).get(day)!).push(v);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visits]);

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

  async function setStatus(v: ScheduledVisit, status: ScheduledVisit['status']) {
    try {
      await updateScheduledVisit(v.id, { status });
      refresh();
    } catch {
      setError('Could not update the visit.');
    }
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
                              onClick={() => setStatus(v, 'completed')}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
