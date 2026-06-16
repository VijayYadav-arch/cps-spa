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
      <div
        className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        role="alert"
      >
        Failed to load patients.
      </div>
    );
  if (loading)
    return (
      <div role="status" className="p-4 text-slate-500">
        Loading…
      </div>
    );

  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.lastName.toLowerCase().includes(query.toLowerCase()) ||
          p.firstName.toLowerCase().includes(query.toLowerCase())
      )
    : patients;

  return (
    <div className="mx-auto max-w-[640px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 data-testid="page-title" className="text-xl">
          My Patients
        </h1>
        <span data-testid="patient-count" className="text-sm text-slate-500">
          {patients.length} total
        </span>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search patients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="patient-search"
          className="form-input"
        />
      </div>

      <div data-testid="patients-list">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <p className="text-sm">
              {query ? 'No patients match your search.' : 'No patients assigned yet.'}
            </p>
          </div>
        ) : (
          filtered.map((patient) => (
            <Link
              key={patient.id}
              to={`/clinician/patients/${patient.id}`}
              data-testid="patient-row"
              className="mb-2 block min-h-[56px] rounded-xl border border-slate-200 bg-white p-4 text-inherit no-underline shadow-sm transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p
                    data-testid="patient-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    {patient.lastName}, {patient.firstName}
                  </p>
                  {patient.primaryDiagnosisDesc && (
                    <p
                      data-testid="patient-diagnosis"
                      className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500"
                    >
                      {patient.primaryDiagnosis} - {patient.primaryDiagnosisDesc}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    Last updated:{' '}
                    {new Date(patient.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className="ml-2 text-slate-400">›</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
