import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import {
  getPaidTimeSummary,
  importPaidTimeCsv,
  listPaidTime,
  logPaidTime,
  type EmployeePaidTimeLog,
  type EmployeeTimeActivityType,
  type PaidTimeCsvImportResult,
  type PaidTimeSummary,
} from '@/api/time';

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime());
  from.setMonth(from.getMonth() - 1);
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
        minWidth: 160,
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

export function PaidTimeDashboard() {
  const [range, setRange] = useState(defaultRange);
  const [summary, setSummary] = useState<PaidTimeSummary | null>(null);
  const [logs, setLogs] = useState<EmployeePaidTimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Log form — defaults to the signed-in user's id; manager can change to log for another employee.
  const { auth } = useAuth();
  const [userId, setUserId] = useState<string>(() =>
    auth.user?.userId ? String(auth.user.userId) : '',
  );
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [hoursValue, setHoursValue] = useState<string>('8');
  const [activity, setActivity] = useState<EmployeeTimeActivityType>('PatientCare');
  const [description, setDescription] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<PaidTimeCsvImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([
        getPaidTimeSummary(range.from, range.to),
        listPaidTime(range.from, range.to),
      ]);
      setSummary(s);
      setLogs(l.data);
    } catch {
      setError('Failed to load time data.');
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
    if (!userId || Number(userId) <= 0) {
      setActionError('Employee ID is required.');
      return;
    }
    const hours = Number(hoursValue);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setActionError('Hours must be between 0 and 24 per entry.');
      return;
    }
    setIsLogging(true);
    try {
      await logPaidTime({
        userId: Number(userId),
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

  async function handleCsvUpload(file: File) {
    setImportError(null);
    setImportResult(null);
    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importPaidTimeCsv(text);
      setImportResult(result);
      if (result.importedCount > 0) await refresh();
    } catch (err) {
      setImportError(extractError(err, 'CSV import failed.'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Paid Time Tracking</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Per-employee paid hours by activity. The PatientCare total feeds the
          hospice 5% volunteer-compliance denominator automatically.
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
          {metricCard('Employees', String(summary.employeeCount), '#0f172a')}
        </section>
      )}

      <section style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Log Time</h3>
        <form onSubmit={handleLog} style={{ display: 'grid', gap: 8 }}>
          <input
            type="number"
            placeholder="Employee ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            min={1}
            required
          />
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

      <section style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Bulk Import (CSV)</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          Header row required. Columns:{' '}
          <code>userId, serviceDate, hours, activityType, description?, patientId?</code>.
          Each row imports independently — bad rows are reported with line numbers.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleCsvUpload(file);
          }}
          disabled={isImporting}
        />
        {isImporting && <div role="status">Importing…</div>}
        {importError && (
          <div role="alert" style={{ color: '#b91c1c' }}>
            {importError}
          </div>
        )}
        {importResult && (
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: importResult.failedCount === 0 ? '#f0fdf4' : '#fef9c3',
              border: '1px solid #e2e8f0',
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>{importResult.importedCount}</strong> imported ·{' '}
              <strong>{importResult.failedCount}</strong> failed
            </p>
            {importResult.errors.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary>Error detail ({importResult.errors.length})</summary>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Line</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Error</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Raw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((e, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 6px' }}>{e.lineNumber}</td>
                        <td style={{ padding: '4px 6px', color: '#b91c1c' }}>
                          {e.error}
                        </td>
                        <td
                          style={{
                            padding: '4px 6px',
                            color: '#64748b',
                            fontFamily: 'monospace',
                            fontSize: 12,
                          }}
                        >
                          {e.rawLine}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Recent Logs ({logs.length})
        </h3>
        {logs.length === 0 ? (
          <p style={{ color: '#64748b' }}>No paid time logged in this window.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Date</th>
                <th style={{ padding: '6px 10px' }}>Employee</th>
                <th style={{ padding: '6px 10px' }}>Hours</th>
                <th style={{ padding: '6px 10px' }}>Activity</th>
                <th style={{ padding: '6px 10px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{l.serviceDate}</td>
                  <td style={{ padding: '6px 10px' }}>
                    {l.userName || `User #${l.userId}`}
                  </td>
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
