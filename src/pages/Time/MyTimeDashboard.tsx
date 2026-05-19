import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import {
  getMyPaidTimeSummary,
  listMyPaidTime,
  logMyPaidTime,
  type EmployeePaidTimeLog,
  type EmployeeTimeActivityType,
  type PaidTimeSummary,
} from '@/api/time';

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime());
  from.setDate(from.getDate() - 7);
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
        minWidth: 140,
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
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    fallback
  );
}

export function MyTimeDashboard() {
  const { auth } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const [summary, setSummary] = useState<PaidTimeSummary | null>(null);
  const [logs, setLogs] = useState<EmployeePaidTimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Log form (no userId — backend uses authenticated identity)
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [hoursValue, setHoursValue] = useState<string>('8');
  const [activity, setActivity] = useState<EmployeeTimeActivityType>('PatientCare');
  const [description, setDescription] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([
        getMyPaidTimeSummary(range.from, range.to),
        listMyPaidTime(range.from, range.to),
      ]);
      setSummary(s);
      setLogs(l.data);
    } catch {
      setError('Failed to load your time data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    void refresh();
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    const hours = Number(hoursValue);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setActionError('Hours must be between 0 and 24 per entry.');
      return;
    }
    setIsLogging(true);
    try {
      await logMyPaidTime({
        serviceDate,
        hours,
        activityType: activity,
        description: description.trim() || null,
        patientId: null,
      });
      setDescription('');
      setHoursValue('8');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to log time.'));
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>My Time</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Log and review your paid hours by activity. The authenticated identity is
          used automatically — no employee ID required.
          {auth.user?.userId ? ` Signed in as user #${auth.user.userId}.` : ''}
        </p>
      </header>

      <form
        onSubmit={handleApply}
        style={{ display: 'flex', gap: 12, alignItems: 'end' }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>From</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>To</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <button type="submit">Apply</button>
      </form>

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}

      {summary && !isLoading && (
        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {metricCard('Patient Care', `${summary.patientCareHours}h`, '#15803d')}
          {metricCard('Administrative', `${summary.administrativeHours}h`, '#0e7490')}
          {metricCard('Training', `${summary.trainingHours}h`, '#7c3aed')}
          {metricCard('Non-Billable', `${summary.nonBillableHours}h`, '#64748b')}
          {metricCard('Total', `${summary.totalHours}h`, '#0f172a')}
        </section>
      )}

      <section style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Log My Time</h3>
        <form onSubmit={handleLog} style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
            />
            <input
              type="number"
              value={hoursValue}
              onChange={(e) => setHoursValue(e.target.value)}
              min={0.25}
              max={24}
              step={0.25}
              required
            />
          </div>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as EmployeeTimeActivityType)}
          >
            <option value="PatientCare">Patient Care</option>
            <option value="Administrative">Administrative</option>
            <option value="Training">Training</option>
            <option value="NonBillable">Non-Billable</option>
          </select>
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {actionError && (
            <div role="alert" style={{ color: '#b91c1c' }}>
              {actionError}
            </div>
          )}
          <button type="submit" disabled={isLogging}>
            {isLogging ? 'Saving…' : 'Log Time'}
          </button>
        </form>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          My Recent Logs ({logs.length})
        </h3>
        {logs.length === 0 ? (
          <p style={{ color: '#64748b' }}>No logs in this window.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Date</th>
                <th style={{ padding: '6px 10px' }}>Hours</th>
                <th style={{ padding: '6px 10px' }}>Activity</th>
                <th style={{ padding: '6px 10px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{l.serviceDate}</td>
                  <td style={{ padding: '6px 10px' }}>{l.hours}</td>
                  <td style={{ padding: '6px 10px' }}>{l.activityType}</td>
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
