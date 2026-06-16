import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  active: boolean;
}
interface Visit {
  id: number;
  patientName: string;
  scheduledTime: string;
  visitType: string;
  address: string | null;
}
interface Encounter {
  id: number;
  pendingDocumentation: boolean;
}
interface PatientsEnvelope {
  data: Patient[];
  pagination?: { totalCount: number };
}
interface VisitsEnvelope {
  data: Visit[];
}
interface EncountersEnvelope {
  data: Encounter[];
  pagination?: { totalCount: number };
}
interface UserEnvelope {
  data: { firstName: string; lastName: string; role: string };
}

interface DashboardData {
  user: { firstName: string; lastName: string; role: string };
  assignedPatients: number;
  todaysVisits: Visit[];
  pendingDocumentation: number;
  visitsThisWeek: number;
}

export function ClinicianDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<PatientsEnvelope>('/patients?limit=12&active=true'),
      apiClient.get<VisitsEnvelope>('/visits?upcoming=true&limit=5'),
      apiClient.get<EncountersEnvelope>('/encounters?pending_documentation=true&limit=10'),
      apiClient.get<UserEnvelope>('/users/me'),
    ])
      .then(([patientsRes, visitsRes, encountersRes, meRes]) => {
        if (cancelled) return;
        const user = meRes.data.data;
        const assignedPatients =
          patientsRes.data.pagination?.totalCount ?? patientsRes.data.data.length;
        const todaysVisits = visitsRes.data.data;
        const pendingDocumentation =
          encountersRes.data.pagination?.totalCount ?? encountersRes.data.data.length;
        const visitsThisWeek = todaysVisits.length;
        setData({
          user,
          assignedPatients,
          todaysVisits,
          pendingDocumentation,
          visitsThisWeek,
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div
        className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        role="alert"
      >
        Failed to load dashboard.
      </div>
    );
  if (!data)
    return (
      <div role="status" className="p-4 text-slate-500">
        Loading…
      </div>
    );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto grid max-w-[640px] gap-6 p-4">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          {greeting}, <span data-testid="user-firstname">{data.user.firstName}</span>
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
            {data.assignedPatients}
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
            {data.pendingDocumentation}
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
