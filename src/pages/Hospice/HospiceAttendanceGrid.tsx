import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getElection,
  getAttendance,
  recordAttendance,
  type HospiceAttendanceDay,
  type HospiceElection,
} from '@/api/hospice';
import { HospiceLevelOfCareBadge } from '@/components/HospiceLevelOfCareBadge';
import { HospiceAttendanceDayForm } from '@/components/HospiceAttendanceDayForm';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    out.push(isoDate(cursor));
  }
  return out;
}

export function HospiceAttendanceGrid() {
  const { id: patientId, electionId } = useParams<{ id: string; electionId: string }>();
  const navigate = useNavigate();
  const [election, setElection] = useState<HospiceElection | null>(null);
  const [days, setDays] = useState<HospiceAttendanceDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  async function reload() {
    if (!electionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const e = await getElection(parseInt(electionId, 10));
      setElection(e);
      if (e.currentPeriod) {
        const list = await getAttendance(e.id, {
          from: e.currentPeriod.startDate,
          to: e.currentPeriod.endDate,
          pageSize: 100,
        });
        setDays(list.data);
      } else {
        setDays([]);
      }
    } catch {
      setError('Failed to load attendance data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  const period = election?.currentPeriod ?? null;
  const dateRange = useMemo(
    () => (period ? buildDateRange(period.startDate, period.endDate) : []),
    [period],
  );
  const daysByDate = useMemo(
    () => Object.fromEntries(days.map((d) => [d.serviceDate, d])),
    [days],
  );

  if (isLoading) return <div role="status" className="text-slate-500">Loading attendance…</div>;
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );
  if (!election || !period)
    return <div className="text-slate-500">No active benefit period.</div>;

  async function handleRecord(req: Parameters<typeof recordAttendance>[1]) {
    await recordAttendance(election!.id, req);
    setActiveDate(null);
    await reload();
  }

  return (
    <div className="grid max-w-[900px] gap-6 p-6">
      <div>
        <button
          onClick={() => navigate(`/patients/${patientId}/hospice/${election.id}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back to Election
        </button>
      </div>
      <header className="space-y-2">
        <h2 className="text-2xl">
          Hospice Attendance — Period {period.periodNumber}
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          {period.startDate} – {period.endDate}
        </p>
      </header>

      {dateRange.length === 0 ? (
        <p className="text-slate-500">No attendance recorded for this period.</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {dateRange.map((date) => {
            const day = daysByDate[date];
            return (
              <button
                key={date}
                onClick={() => setActiveDate(date)}
                className={`flex min-h-16 cursor-pointer flex-col gap-1 rounded-md border border-slate-200 p-2 text-left transition-colors hover:bg-slate-50 ${
                  day ? 'bg-slate-50' : 'bg-white'
                }`}
              >
                <span className="text-[11px] text-slate-500">{date.slice(5)}</span>
                {day ? (
                  <HospiceLevelOfCareBadge loc={day.levelOfCare} />
                ) : (
                  <span className="text-[11px] text-slate-400">—</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeDate && (
        <div
          role="dialog"
          aria-label="Attendance Day Form"
          className="fixed inset-0 flex items-center justify-center bg-black/40"
        >
          <div className="min-w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <HospiceAttendanceDayForm
              serviceDate={activeDate}
              initial={daysByDate[activeDate]}
              onSubmit={handleRecord}
              onCancel={() => setActiveDate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
