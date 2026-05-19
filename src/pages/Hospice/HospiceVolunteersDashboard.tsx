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

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 180,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>
        {value}
      </div>
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
  const [paidHours, setPaidHours] = useState<string>('1000');
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
        getVolunteerCompliance(range.from, range.to, Number(paidHours) || 0),
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Hospice Volunteers</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          42 CFR 418.78 — volunteers must provide ≥ 5% of paid patient-care hours.
          Fundraising and board service are excluded.
        </p>
      </header>

      <form
        onSubmit={handleApplyRange}
        style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Reporting from</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Reporting to</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Paid patient-care hours (from payroll)</span>
          <input
            type="number"
            value={paidHours}
            onChange={(e) => setPaidHours(e.target.value)}
            min={0}
            step="0.25"
          />
        </label>
        <button type="submit">Apply</button>
      </form>

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}
      {actionError && (
        <div role="alert" style={{ color: '#b91c1c' }}>
          {actionError}
        </div>
      )}

      {compliance && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard(
              'Compliance',
              `${compliance.compliancePercentage.toFixed(2)}%`,
              compliance.meetsThreshold ? '#15803d' : '#b91c1c',
            )}
            {metricCard(
              'Threshold',
              `${compliance.thresholdPercentage}%`,
              '#0e7490',
            )}
            {metricCard(
              'Qualifying Hours',
              compliance.totalQualifyingVolunteerHours.toString(),
              '#0f172a',
            )}
            {metricCard(
              'Excluded Hours',
              compliance.excludedVolunteerHours.toString(),
              '#64748b',
            )}
            {metricCard(
              'Paid Hours (Denom.)',
              compliance.paidPatientCareHours.toString(),
              '#0f172a',
            )}
            {metricCard(
              'Volunteers',
              compliance.volunteerCount.toString(),
              '#0f172a',
            )}
          </section>

          <section
            style={{
              padding: 12,
              borderRadius: 6,
              background: compliance.meetsThreshold ? '#f0fdf4' : '#fef2f2',
              color: compliance.meetsThreshold ? '#166534' : '#991b1b',
              fontWeight: 600,
            }}
          >
            {compliance.paidPatientCareHours === 0
              ? 'Enter paid patient-care hours from payroll to compute compliance.'
              : compliance.meetsThreshold
                ? `Meets the ${compliance.thresholdPercentage}% threshold.`
                : `Below the ${compliance.thresholdPercentage}% threshold — recruit volunteers or log additional qualifying hours.`}
          </section>

          {compliance.caveats.length > 0 && (
            <section
              style={{
                background: '#fef9c3',
                border: '1px solid #fde68a',
                borderRadius: 6,
                padding: 12,
              }}
            >
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {compliance.caveats.map((c, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Add Volunteer
          </h3>
          <form onSubmit={handleAddVolunteer} style={{ display: 'grid', gap: 8 }}>
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Orientation completed (optional)
              </span>
              <input
                type="date"
                value={orientationDate}
                onChange={(e) => setOrientationDate(e.target.value)}
              />
            </label>
            <button type="submit" disabled={isAddingVolunteer}>
              {isAddingVolunteer ? 'Adding…' : 'Add Volunteer'}
            </button>
          </form>
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Log Hours
          </h3>
          <form onSubmit={handleLogHours} style={{ display: 'grid', gap: 8 }}>
            <select
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />
              <input
                type="number"
                value={logHours}
                onChange={(e) => setLogHoursValue(e.target.value)}
                min={0.25}
                max={24}
                step={0.25}
                required
              />
            </div>
            <select
              value={logActivity}
              onChange={(e) => setLogActivity(e.target.value as VolunteerActivityType)}
            >
              <option value="DirectPatientCare">Direct Patient Care</option>
              <option value="Administrative">Administrative</option>
              <option value="Excluded">Excluded (Fundraising / Board)</option>
            </select>
            <input
              placeholder="Description (optional)"
              value={logDescription}
              onChange={(e) => setLogDescription(e.target.value)}
            />
            <button type="submit" disabled={isLoggingHours}>
              {isLoggingHours ? 'Saving…' : 'Log Hours'}
            </button>
          </form>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Volunteer Roster ({volunteers.length})
        </h3>
        {volunteers.length === 0 ? (
          <p style={{ color: '#64748b' }}>No volunteers yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Name</th>
                <th style={{ padding: '6px 10px' }}>Active</th>
                <th style={{ padding: '6px 10px' }}>Orientation</th>
                <th style={{ padding: '6px 10px' }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>
                    {v.firstName} {v.lastName}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {v.isActive ? 'Yes' : 'No'}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {v.orientationCompletedDate ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                    {v.email ?? v.phone ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Recent Hours ({hoursLogs.length})
        </h3>
        {hoursLogs.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            No hours logged in this window.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Date</th>
                <th style={{ padding: '6px 10px' }}>Volunteer</th>
                <th style={{ padding: '6px 10px' }}>Hours</th>
                <th style={{ padding: '6px 10px' }}>Activity</th>
                <th style={{ padding: '6px 10px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {hoursLogs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{l.serviceDate}</td>
                  <td style={{ padding: '6px 10px' }}>{l.volunteerName}</td>
                  <td style={{ padding: '6px 10px' }}>{l.hours}</td>
                  <td
                    style={{
                      padding: '6px 10px',
                      color: l.activityType === 'Excluded' ? '#64748b' : '#0f172a',
                    }}
                  >
                    {l.activityType}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                    {l.description ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
