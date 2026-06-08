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
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load dashboard.
      </div>
    );
  if (!data) return <div style={{ padding: '1rem' }}>Loading…</div>;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          {greeting}, <span data-testid="user-firstname">{data.user.firstName}</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            border: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <div
            data-testid="stat-assigned-patients"
            style={{ fontSize: 24, fontWeight: 700 }}
          >
            {data.assignedPatients}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Patients</div>
        </div>
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            border: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <div
            data-testid="stat-visits-this-week"
            style={{ fontSize: 24, fontWeight: 700 }}
          >
            {data.visitsThisWeek}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Visits This Week
          </div>
        </div>
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            border: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <div
            data-testid="stat-pending-documentation"
            style={{ fontSize: 24, fontWeight: 700, color: '#0d9488' }}
          >
            {data.pendingDocumentation}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Pending Docs</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Link
          to="/clinician/visits/new"
          data-testid="action-new-visit"
          style={{
            background: '#0d9488',
            color: 'white',
            borderRadius: 12,
            padding: 16,
            textDecoration: 'none',
            fontWeight: 600,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          New Visit
        </Link>
        <Link
          to="/clinician/patients"
          data-testid="action-my-patients"
          style={{
            background: 'white',
            color: '#0f172a',
            borderRadius: 12,
            padding: 16,
            border: '1px solid #f1f5f9',
            textDecoration: 'none',
            fontWeight: 600,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          My Patients
        </Link>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontWeight: 600 }}>Today&apos;s Visits</h2>
          <Link
            to="/clinician/visits"
            data-testid="action-all-visits"
            style={{
              fontSize: 13,
              color: '#0d9488',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            All visits ›
          </Link>
        </div>
        <div data-testid="todays-visits-list">
          {data.todaysVisits.map((visit) => (
            <div
              key={visit.id}
              data-testid="visit-row"
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 56,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  data-testid="visit-patient-name"
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  {visit.patientName}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {visit.visitType}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{visit.address}</p>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#0d9488' }}>
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
