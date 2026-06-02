import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  primaryDiagnosis: string | null;
  primaryDiagnosisDesc: string | null;
  active: boolean;
  updatedAt: string;
}
interface PatientsEnvelope {
  data: Patient[];
}

export function ClinicianPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<PatientsEnvelope>('/patients?limit=50&active=true&orderBy=lastName:asc')
      .then((r) => {
        if (!cancelled) setPatients(r.data.data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load patients.
      </div>
    );
  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.lastName.toLowerCase().includes(query.toLowerCase()) ||
          p.firstName.toLowerCase().includes(query.toLowerCase())
      )
    : patients;

  return (
    <div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
      <div
        style={{
          marginTop: 16,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 data-testid="page-title" style={{ fontSize: 20, fontWeight: 600 }}>
          My Patients
        </h1>
        <span data-testid="patient-count" style={{ fontSize: 14, color: '#64748b' }}>
          {patients.length} total
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Search patients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="patient-search"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontSize: 14,
          }}
        />
      </div>

      <div data-testid="patients-list">
        {filtered.length === 0 ? (
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              color: '#64748b',
              border: '1px solid #f1f5f9',
            }}
          >
            <p style={{ fontSize: 14 }}>
              {query ? 'No patients match your search.' : 'No patients assigned yet.'}
            </p>
          </div>
        ) : (
          filtered.map((patient) => (
            <Link
              key={patient.id}
              to={`/clinician/patients/${patient.id}`}
              data-testid="patient-row"
              style={{
                display: 'block',
                background: 'white',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #f1f5f9',
                textDecoration: 'none',
                color: 'inherit',
                marginBottom: 8,
                minHeight: 56,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    data-testid="patient-name"
                    style={{ fontSize: 14, fontWeight: 500 }}
                  >
                    {patient.lastName}, {patient.firstName}
                  </p>
                  {patient.primaryDiagnosisDesc && (
                    <p
                      data-testid="patient-diagnosis"
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {patient.primaryDiagnosis} - {patient.primaryDiagnosisDesc}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Last updated:{' '}
                    {new Date(patient.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>›</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
