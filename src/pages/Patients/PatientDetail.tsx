import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, type PatientDetail as PatientDetailType } from '@/api/patients';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getPatient(parseInt(id, 10))
      .then((p) => { if (!cancelled) setPatient(p); })
      .catch(() => { if (!cancelled) setError('Patient not found.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) return <div role="status">Loading patient…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!patient) return null;

  return (
    <div>
      <button onClick={() => navigate('/patients')} style={{ marginBottom: 16 }}>← Back to Patients</button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        {patient.firstName} {patient.lastName}
      </h2>
      <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px' }}>
        <dt style={{ fontWeight: 500 }}>Date of Birth</dt>
        <dd>{new Date(patient.dateOfBirth).toLocaleDateString()}</dd>
        <dt style={{ fontWeight: 500 }}>Gender</dt><dd>{patient.gender ?? '—'}</dd>
        <dt style={{ fontWeight: 500 }}>Email</dt><dd>{patient.email ?? '—'}</dd>
        <dt style={{ fontWeight: 500 }}>Phone</dt><dd>{patient.phone ?? '—'}</dd>
        <dt style={{ fontWeight: 500 }}>Address</dt>
        <dd>{[patient.address, patient.city, patient.state, patient.zip].filter(Boolean).join(', ') || '—'}</dd>
        <dt style={{ fontWeight: 500 }}>Insurance ID</dt><dd>{patient.insuranceId ?? '—'}</dd>
      </dl>
    </div>
  );
}
