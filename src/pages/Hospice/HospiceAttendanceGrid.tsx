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

  if (isLoading) return <div role="status">Loading attendance…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!election || !period) return <div>No active benefit period.</div>;

  async function handleRecord(req: Parameters<typeof recordAttendance>[1]) {
    await recordAttendance(election!.id, req);
    setActiveDate(null);
    await reload();
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <button
        onClick={() => navigate(`/patients/${patientId}/hospice/${election.id}`)}
        style={{ marginBottom: 16 }}
      >
        ← Back to Election
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Hospice Attendance — Period {period.periodNumber}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        {period.startDate} – {period.endDate}
      </p>

      {dateRange.length === 0 ? (
        <p>No attendance recorded for this period.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 24,
          }}
        >
          {dateRange.map((date) => {
            const day = daysByDate[date];
            return (
              <button
                key={date}
                onClick={() => setActiveDate(date)}
                style={{
                  textAlign: 'left',
                  padding: 8,
                  background: day ? '#f8fafc' : '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minHeight: 64,
                }}
              >
                <span style={{ fontSize: 11, color: '#64748b' }}>{date.slice(5)}</span>
                {day ? (
                  <HospiceLevelOfCareBadge loc={day.levelOfCare} />
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minWidth: 420,
            }}
          >
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
