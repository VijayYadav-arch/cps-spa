import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface PatientDetail {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  mrn: string | null;
  primaryDiagnosis: string | null;
  primaryDiagnosisDesc: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
  admittedAt: string | null;
  updatedAt: string;
}
interface PatientEnvelope {
  data: PatientDetail;
}

function DetailRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | null | undefined;
  testId: string;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-slate-100 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span data-testid={testId} className="text-sm font-medium text-slate-700">
        {value}
      </span>
    </div>
  );
}

export function ClinicianPatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiClient
      .get<PatientEnvelope>(`/patients/${id}`)
      .then((r) => {
        if (!cancelled) setPatient(r.data.data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const status =
          typeof e === 'object' && e !== null && 'response' in e
            ? (e as { response?: { status?: number } }).response?.status
            : undefined;
        if (status === 404) {
          setNotFound(true);
        } else {
          setError(e as Error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound)
    return (
      <div
        className="m-4 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-600"
        role="alert"
      >
        Patient not found.
      </div>
    );
  if (error)
    return (
      <div
        className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        role="alert"
      >
        Failed to load patient.
      </div>
    );
  if (!patient)
    return (
      <div role="status" className="p-4 text-slate-500">
        Loading…
      </div>
    );

  return (
    <div className="mx-auto max-w-[640px] p-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/clinician/patients"
          aria-label="Back to patients"
          data-testid="back-link"
          className="rounded-md p-2 text-slate-600 no-underline transition-colors hover:bg-slate-50"
        >
          ‹
        </Link>
        <h1 data-testid="page-title" className="text-xl">
          <span data-testid="patient-name">
            {patient.lastName}, {patient.firstName}
          </span>
        </h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DetailRow label="MRN" value={patient.mrn} testId="patient-mrn" />
        <DetailRow
          label="Date of Birth"
          value={
            patient.dateOfBirth
              ? new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : null
          }
          testId="patient-dob"
        />
        <DetailRow
          label="Primary Diagnosis"
          value={
            patient.primaryDiagnosis
              ? `${patient.primaryDiagnosis} — ${patient.primaryDiagnosisDesc ?? ''}`
              : null
          }
          testId="patient-diagnosis"
        />
        <DetailRow label="Phone" value={patient.phone} testId="patient-phone" />
        <DetailRow label="Address" value={patient.address} testId="patient-address" />
        <DetailRow
          label="Admitted"
          value={
            patient.admittedAt
              ? new Date(patient.admittedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null
          }
          testId="patient-admitted"
        />
        <DetailRow
          label="Status"
          value={patient.active ? 'Active' : 'Inactive'}
          testId="patient-status"
        />
      </div>

      <div className="mt-4">
        <Link
          to={`/clinician/visits/new?patientId=${patient.id}`}
          data-testid="action-new-visit-note"
          className="flex min-h-[56px] w-full items-center justify-center rounded-xl bg-teal-600 p-4 font-semibold text-white no-underline transition-colors hover:bg-teal-700"
        >
          New Visit Note
        </Link>
      </div>
    </div>
  );
}
