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
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span style={{ fontSize: 14, color: '#64748b' }}>{label}</span>
      <span data-testid={testId} style={{ fontSize: 14, fontWeight: 500 }}>
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
      <div style={{ padding: '1rem' }} role="alert">
        Patient not found.
      </div>
    );
  if (error)
    return (
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load patient.
      </div>
    );
  if (!patient) return <div style={{ padding: '1rem' }}>Loading…</div>;

  return (
    <div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
      <div
        style={{
          marginTop: 16,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          to="/clinician/patients"
          aria-label="Back to patients"
          data-testid="back-link"
          style={{
            padding: 8,
            borderRadius: 8,
            textDecoration: 'none',
            color: '#475569',
          }}
        >
          ‹
        </Link>
        <h1 data-testid="page-title" style={{ fontSize: 20, fontWeight: 600 }}>
          <span data-testid="patient-name">
            {patient.lastName}, {patient.firstName}
          </span>
        </h1>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #f1f5f9',
        }}
      >
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

      <div style={{ marginTop: 16 }}>
        <Link
          to={`/clinician/visits/new?patientId=${patient.id}`}
          data-testid="action-new-visit-note"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: 16,
            background: '#0d9488',
            color: 'white',
            fontWeight: 600,
            borderRadius: 12,
            textDecoration: 'none',
            minHeight: 56,
          }}
        >
          New Visit Note
        </Link>
      </div>
    </div>
  );
}
