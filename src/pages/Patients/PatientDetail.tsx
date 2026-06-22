import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPatient, type PatientDetail as PatientDetailType } from '@/api/patients';
import { HospiceSummaryCard } from '@/components/HospiceSummaryCard';
import { HomeHealthSummaryCard } from '@/components/HomeHealthSummaryCard';
import { PatientEligibilityCard } from '@/components/PatientEligibilityCard';
import { FamilyAccessCard } from '@/components/FamilyAccessCard';

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

  if (isLoading) return <div role="status" className="text-slate-500">Loading patient…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;
  if (!patient) return null;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <button
        onClick={() => navigate('/patients')}
        className="justify-self-start rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        ← Back to Patients
      </button>
      <div className="flex items-center gap-4">
        <h2 className="text-2xl">
          {patient.firstName} {patient.lastName}
        </h2>
        <Link
          to={`/patients/${id}/history`}
          className="rounded-md border border-teal-700 px-3 py-1 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50"
        >
          View History
        </Link>
      </div>
      <dl className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-[160px_1fr] gap-x-4 gap-y-2">
        <dt className="font-medium text-slate-600">Date of Birth</dt>
        <dd className="text-slate-700">{new Date(patient.dateOfBirth).toLocaleDateString()}</dd>
        <dt className="font-medium text-slate-600">Gender</dt><dd className="text-slate-700">{patient.gender ?? '—'}</dd>
        <dt className="font-medium text-slate-600">Email</dt><dd className="text-slate-700">{patient.email ?? '—'}</dd>
        <dt className="font-medium text-slate-600">Phone</dt><dd className="text-slate-700">{patient.phone ?? '—'}</dd>
        <dt className="font-medium text-slate-600">Address</dt>
        <dd className="text-slate-700">{[patient.address, patient.city, patient.state, patient.zip].filter(Boolean).join(', ') || '—'}</dd>
        <dt className="font-medium text-slate-600">Insurance ID</dt><dd className="text-slate-700">{patient.insuranceId ?? '—'}</dd>
      </dl>
      <PatientEligibilityCard
        patientId={parseInt(id!, 10)}
        firstName={patient.firstName}
        lastName={patient.lastName}
        dateOfBirth={patient.dateOfBirth}
        insuranceId={patient.insuranceId}
      />
      <FamilyAccessCard patientId={parseInt(id!, 10)} />
      {patient.admissionType === 'home_health'
        ? <HomeHealthSummaryCard patientId={parseInt(id!, 10)} />
        : <HospiceSummaryCard patientId={parseInt(id!, 10)} />}
    </div>
  );
}
