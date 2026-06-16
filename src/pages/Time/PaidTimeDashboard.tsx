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

function metricCard(label: string, value: string, toneClass: string) {
  return (
    <div className="card-hover min-w-[160px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${toneClass}`}>
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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Paid Time Tracking</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Per-employee paid hours by activity. The PatientCare total feeds the
          hospice 5% volunteer-compliance denominator automatically.
        </p>
      </header>

      <form
        onSubmit={handleApply}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">From</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
            className="form-input"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">To</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
            className="form-input"
          />
        </label>
        <button type="submit" className="btn-primary">Apply</button>
      </form>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}

      {summary && !isLoading && (
        <section className="flex flex-wrap gap-4">
          {metricCard('Patient Care', `${summary.patientCareHours}h`, 'text-success')}
          {metricCard('Administrative', `${summary.administrativeHours}h`, 'text-teal-700')}
          {metricCard('Training', `${summary.trainingHours}h`, 'text-purple-700')}
          {metricCard('Non-Billable', `${summary.nonBillableHours}h`, 'text-slate-500')}
          {metricCard('Total', `${summary.totalHours}h`, 'text-navy-900')}
          {metricCard('Employees', String(summary.employeeCount), 'text-navy-900')}
        </section>
      )}

      <section className="grid max-w-[600px] gap-3">
        <h3 className="text-lg font-semibold">Log Time</h3>
        <form onSubmit={handleLog} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="number"
            placeholder="Employee ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            min={1}
            required
            className="form-input"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
              className="form-input"
            />
            <input
              type="number"
              value={hoursValue}
              onChange={(e) => setHoursValue(e.target.value)}
              min={0.25}
              max={24}
              step={0.25}
              required
              className="form-input"
            />
          </div>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as EmployeeTimeActivityType)}
            className="form-input"
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
            className="form-input"
          />
          {actionError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              {actionError}
            </div>
          )}
          <button type="submit" disabled={isLogging} className="btn-primary justify-self-start disabled:cursor-not-allowed disabled:opacity-60">
            {isLogging ? 'Saving…' : 'Log Time'}
          </button>
        </form>
      </section>

      <section className="grid max-w-[600px] gap-3">
        <h3 className="text-lg font-semibold">Bulk Import (CSV)</h3>
        <p className="text-sm text-slate-500">
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
        {isImporting && <div role="status" className="text-slate-500">Importing…</div>}
        {importError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {importError}
          </div>
        )}
        {importResult && (
          <div
            className={`rounded-lg border-l-4 px-4 py-3 ${
              importResult.failedCount === 0
                ? 'border-success bg-green-50 text-green-800'
                : 'border-warning bg-amber-50 text-amber-800'
            }`}
          >
            <p className="m-0">
              <strong>{importResult.importedCount}</strong> imported ·{' '}
              <strong>{importResult.failedCount}</strong> failed
            </p>
            {importResult.errors.length > 0 && (
              <details className="mt-2">
                <summary>Error detail ({importResult.errors.length})</summary>
                <table className="mt-2 w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-1.5 py-1">Line</th>
                      <th className="px-1.5 py-1">Error</th>
                      <th className="px-1.5 py-1">Raw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-1.5 py-1">{e.lineNumber}</td>
                        <td className="px-1.5 py-1 text-red-700">
                          {e.error}
                        </td>
                        <td className="px-1.5 py-1 font-mono text-xs text-slate-500">
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

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">
          Recent Logs ({logs.length})
        </h3>
        {logs.length === 0 ? (
          <p className="text-slate-500">No paid time logged in this window.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{l.serviceDate}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {l.userName || `User #${l.userId}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.hours}</td>
                    <td className="px-4 py-3 text-slate-700">{l.activityType}</td>
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
