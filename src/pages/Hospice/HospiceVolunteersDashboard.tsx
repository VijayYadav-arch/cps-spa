import { useEffect, useState } from 'react';
import {
  createVolunteer,
  getVolunteerCompliance,
  listVolunteers,
  listVolunteerHours,
  logVolunteerHours,
  type HospiceVolunteer,
  type HospiceVolunteerHoursLog,
  type VolunteerActivityType,
  type VolunteerComplianceReport,
} from '@/api/hospice';

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime());
  from.setMonth(from.getMonth() - 3);
  return { from: from.toISOString().slice(0, 10), to };
}

function metricCard(label: string, value: string, tone: string) {
  return (
    <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

export function HospiceVolunteersDashboard() {
  const [volunteers, setVolunteers] = useState<HospiceVolunteer[]>([]);
  const [hoursLogs, setHoursLogs] = useState<HospiceVolunteerHoursLog[]>([]);
  const [compliance, setCompliance] = useState<VolunteerComplianceReport | null>(null);
  const [range, setRange] = useState(defaultRange);
  // Empty string = auto-compute from paid-time logs; a positive number overrides.
  const [paidHours, setPaidHours] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add-volunteer form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orientationDate, setOrientationDate] = useState('');
  const [isAddingVolunteer, setIsAddingVolunteer] = useState(false);

  // Log-hours form
  const [logVolunteerId, setLogVolunteerId] = useState<string>('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logHours, setLogHoursValue] = useState<string>('2');
  const [logActivity, setLogActivity] = useState<VolunteerActivityType>('DirectPatientCare');
  const [logDescription, setLogDescription] = useState('');
  const [isLoggingHours, setIsLoggingHours] = useState(false);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [vols, hours, comp] = await Promise.all([
        listVolunteers(false),
        listVolunteerHours(range.from, range.to),
        getVolunteerCompliance(
          range.from,
          range.to,
          paidHours.trim() === '' ? undefined : Number(paidHours),
        ),
      ]);
      setVolunteers(vols.data);
      setHoursLogs(hours.data);
      setCompliance(comp);
    } catch {
      setError('Failed to load volunteer data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApplyRange(e: React.FormEvent) {
    e.preventDefault();
    void refresh();
  }

  async function handleAddVolunteer(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setActionError('First and last name are required.');
      return;
    }
    setIsAddingVolunteer(true);
    try {
      await createVolunteer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: null,
        phone: null,
        orientationCompletedDate: orientationDate || null,
        notes: null,
      });
      setFirstName('');
      setLastName('');
      setOrientationDate('');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to add volunteer.'));
    } finally {
      setIsAddingVolunteer(false);
    }
  }

  async function handleLogHours(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (!logVolunteerId) {
      setActionError('Pick a volunteer to log hours for.');
      return;
    }
    const hours = Number(logHours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setActionError('Hours must be between 0 and 24 per entry.');
      return;
    }
    setIsLoggingHours(true);
    try {
      await logVolunteerHours({
        volunteerId: Number(logVolunteerId),
        serviceDate: logDate,
        hours,
        activityType: logActivity,
        description: logDescription.trim() || null,
        patientId: null,
      });
      setLogDescription('');
      setLogHoursValue('2');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to log hours.'));
    } finally {
      setIsLoggingHours(false);
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Hospice Volunteers</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          42 CFR 418.78 — volunteers must provide ≥ 5% of paid patient-care hours.
          Fundraising and board service are excluded.
        </p>
      </header>

      <form
        onSubmit={handleApplyRange}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Reporting from
          </span>
          <input
            type="date"
            className="form-input w-44"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Reporting to
          </span>
          <input
            type="date"
            className="form-input w-44"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Paid patient-care hours (leave blank to auto-compute from time logs)
          </span>
          <input
            type="number"
            className="form-input w-full sm:w-64"
            value={paidHours}
            onChange={(e) => setPaidHours(e.target.value)}
            placeholder="auto-compute"
            min={0}
            step="0.25"
          />
        </label>
        <button type="submit" className="btn-primary">
          Apply
        </button>
      </form>

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
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {actionError}
        </div>
      )}

      {compliance && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {metricCard(
              'Compliance',
              `${compliance.compliancePercentage.toFixed(2)}%`,
              compliance.meetsThreshold ? 'text-success' : 'text-error',
            )}
            {metricCard(
              'Threshold',
              `${compliance.thresholdPercentage}%`,
              'text-teal-700',
            )}
            {metricCard(
              'Qualifying Hours',
              compliance.totalQualifyingVolunteerHours.toString(),
              'text-navy-900',
            )}
            {metricCard(
              'Excluded Hours',
              compliance.excludedVolunteerHours.toString(),
              'text-slate-500',
            )}
            {metricCard(
              'Paid Hours (Denom.)',
              compliance.paidPatientCareHours.toString(),
              'text-navy-900',
            )}
            {metricCard(
              'Volunteers',
              compliance.volunteerCount.toString(),
              'text-navy-900',
            )}
          </section>

          <section
            className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${
              compliance.meetsThreshold
                ? 'border-success bg-green-50 text-green-800'
                : 'border-error bg-red-50 text-red-800'
            }`}
          >
            {compliance.paidPatientCareHours === 0
              ? 'Enter paid patient-care hours from payroll to compute compliance.'
              : compliance.meetsThreshold
                ? `Meets the ${compliance.thresholdPercentage}% threshold.`
                : `Below the ${compliance.thresholdPercentage}% threshold — recruit volunteers or log additional qualifying hours.`}
          </section>

          {compliance.caveats.length > 0 && (
            <section className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {compliance.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Add Volunteer</h3>
          <form onSubmit={handleAddVolunteer} className="grid gap-3">
            <input
              className="form-input"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              className="form-input"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">
                Orientation completed (optional)
              </span>
              <input
                type="date"
                className="form-input"
                value={orientationDate}
                onChange={(e) => setOrientationDate(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={isAddingVolunteer}
            >
              {isAddingVolunteer ? 'Adding…' : 'Add Volunteer'}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Log Hours</h3>
          <form onSubmit={handleLogHours} className="grid gap-3">
            <select
              className="form-input"
              value={logVolunteerId}
              onChange={(e) => setLogVolunteerId(e.target.value)}
              required
            >
              <option value="">— Select volunteer —</option>
              {volunteers
                .filter((v) => v.isActive)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.firstName} {v.lastName}
                  </option>
                ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="form-input"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />
              <input
                type="number"
                className="form-input"
                value={logHours}
                onChange={(e) => setLogHoursValue(e.target.value)}
                min={0.25}
                max={24}
                step={0.25}
                required
              />
            </div>
            <select
              className="form-input"
              value={logActivity}
              onChange={(e) => setLogActivity(e.target.value as VolunteerActivityType)}
            >
              <option value="DirectPatientCare">Direct Patient Care</option>
              <option value="Administrative">Administrative</option>
              <option value="Excluded">Excluded (Fundraising / Board)</option>
            </select>
            <input
              className="form-input"
              placeholder="Description (optional)"
              value={logDescription}
              onChange={(e) => setLogDescription(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoggingHours}
            >
              {isLoggingHours ? 'Saving…' : 'Log Hours'}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">
          Volunteer Roster ({volunteers.length})
        </h3>
        {volunteers.length === 0 ? (
          <p className="text-slate-500">No volunteers yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Orientation</th>
                  <th className="px-4 py-3">Contact</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">
                      {v.firstName} {v.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.isActive ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.orientationCompletedDate ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {v.email ?? v.phone ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">
          Recent Hours ({hoursLogs.length})
        </h3>
        {hoursLogs.length === 0 ? (
          <p className="text-slate-500">No hours logged in this window.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Volunteer</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {hoursLogs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">{l.serviceDate}</td>
                    <td className="px-4 py-3 text-slate-700">{l.volunteerName}</td>
                    <td className="px-4 py-3 text-slate-700">{l.hours}</td>
                    <td
                      className={`px-4 py-3 ${
                        l.activityType === 'Excluded'
                          ? 'text-slate-500'
                          : 'text-navy-900'
                      }`}
                    >
                      {l.activityType}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {l.description ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
