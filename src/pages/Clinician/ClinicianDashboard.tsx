import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { getPatients } from '@/api/patients';
import { listScheduledVisits } from '@/api/scheduling';
import { Breadcrumb } from '@/components/Breadcrumb';

interface Visit {
  id: number;
  patientName: string;
  scheduledTime: string;
  visitType: string;
  address: string | null;
}

interface DashboardData {
  firstName: string;
  assignedPatients: number | null;
  todaysVisits: Visit[];
  pendingDocumentation: number | null;
  visitsThisWeek: number;
}

const DISCIPLINE_LABEL: Record<string, string> = {
  'skilled-nursing': 'Skilled Nursing',
  'social-work': 'Social Work',
  chaplain: 'Chaplain',
  aide: 'Home Health Aide',
  physician: 'Physician',
  other: 'Other',
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function ClinicianDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Each source loads independently — one failing endpoint must not blank the
    // whole dashboard (the previous Promise.all died on a single 404).
    async function load() {
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [patientsR, visitsR, draftsR, meR] = await Promise.allSettled([
        getPatients({ pageSize: 200 }),
        listScheduledVisits(),
        // Accurate pending-documentation count: ask the server for the draft total
        // rather than counting drafts within a capped page (M11).
        apiClient.get<{ pagination: { total: number } }>('/clinician/visits?status=draft&pageSize=1'),
        apiClient.get<{ email: string }>('/me'),
      ]);
      if (cancelled) return;

      const patients = patientsR.status === 'fulfilled' ? patientsR.value : null;
      const nameById = new Map<number, string>(
        (patients?.data ?? []).map((p) => [p.id, `${p.lastName}, ${p.firstName}`]),
      );

      const scheduled = visitsR.status === 'fulfilled' ? visitsR.value.data : [];
      const todaysVisits: Visit[] = scheduled
        .filter((v) => dayKey(v.scheduledStart) === todayKey)
        .map((v) => ({
          id: v.id,
          patientName: nameById.get(v.patientId) ?? `Patient #${v.patientId}`,
          scheduledTime: v.scheduledStart,
          visitType: `${DISCIPLINE_LABEL[v.discipline] ?? v.discipline} · ${v.visitType}`,
          address: null,
        }));
      const visitsThisWeek = scheduled.filter((v) => {
        const d = new Date(v.scheduledStart);
        return d >= today && d <= weekEnd;
      }).length;

      const pendingDocumentation =
        draftsR.status === 'fulfilled' ? draftsR.value.data.pagination.total : null;

      const email = meR.status === 'fulfilled' ? meR.value.data.email : '';
      const firstName = email ? email.split('@')[0] : 'there';

      setData({
        firstName,
        assignedPatients: patients?.pagination.total ?? null,
        todaysVisits,
        pendingDocumentation,
        visitsThisWeek,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data)
    return (
      <div role="status" className="p-4 text-slate-500">
        Loading…
      </div>
    );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const user = { firstName: data.firstName };

  return (
    <div className="mx-auto grid max-w-[640px] gap-6 p-4">
      <Breadcrumb items={[{ label: 'Clinical', to: '/clinical' }, { label: 'My Day' }]} />
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          {greeting}, <span data-testid="user-firstname">{user.firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div
            data-testid="stat-assigned-patients"
            className="text-2xl font-bold text-navy-900"
          >
            {data.assignedPatients ?? '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Patients</div>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div
            data-testid="stat-visits-this-week"
            className="text-2xl font-bold text-navy-900"
          >
            {data.visitsThisWeek}
          </div>
          <div className="mt-1 text-xs text-slate-500">Visits This Week</div>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div
            data-testid="stat-pending-documentation"
            className="text-2xl font-bold text-teal-700"
          >
            {data.pendingDocumentation ?? '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Pending Docs</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/clinician/visits/new"
          data-testid="action-new-visit"
          className="flex min-h-[56px] items-center justify-center rounded-xl bg-teal-600 p-4 font-semibold text-white no-underline transition-colors hover:bg-teal-700"
        >
          New Visit
        </Link>
        <Link
          to="/clinician/patients"
          data-testid="action-my-patients"
          className="flex min-h-[56px] items-center justify-center rounded-xl border border-slate-200 bg-white p-4 font-semibold text-navy-900 no-underline transition-colors hover:bg-slate-50"
        >
          My Patients
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-lg font-semibold">Today&apos;s Visits</h2>
          <Link
            to="/clinician/visits"
            data-testid="action-all-visits"
            className="text-[13px] font-medium text-teal-700 no-underline hover:underline"
          >
            All visits ›
          </Link>
        </div>
        <div data-testid="todays-visits-list">
          {data.todaysVisits.map((visit) => (
            <div
              key={visit.id}
              data-testid="visit-row"
              className="flex min-h-[56px] items-center justify-between border-b border-slate-100 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p
                  data-testid="visit-patient-name"
                  className="text-sm font-medium text-slate-700"
                >
                  {visit.patientName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{visit.visitType}</p>
                <p className="text-xs text-slate-400">{visit.address}</p>
              </div>
              <div className="ml-3 text-right">
                <p className="text-sm font-medium text-teal-700">
                  {new Date(visit.scheduledTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
