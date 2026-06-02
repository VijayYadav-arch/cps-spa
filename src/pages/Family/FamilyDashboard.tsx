import { useEffect, useState } from 'react';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface Summary {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  primaryDiagnosis: string | null;
}

export function FamilyDashboard() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<Summary>(`/patients/${patientId}/summary`)
      .then((r) => setSummary(r.data))
      .catch(() => setError('Failed to load summary. Please refresh the page.'));
  }, [patientId]);

  if (error) {
    return (
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {error}
      </p>
    );
  }
  if (!summary) {
    return (
      <p data-testid="family-loading" style={{ color: '#94a3b8', padding: 16 }}>
        Loading…
      </p>
    );
  }

  return (
    <section style={{ padding: 16 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}
      >
        {summary.firstName} {summary.lastName}
      </h1>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
        }}
      >
        {summary.dateOfBirth && (
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Date of Birth:</span>{' '}
            <span data-testid="patient-dob">
              {new Date(summary.dateOfBirth).toLocaleDateString()}
            </span>
          </p>
        )}
        {summary.primaryDiagnosis && (
          <p style={{ fontSize: 14, color: '#475569' }}>
            <span style={{ fontWeight: 500 }}>Primary Diagnosis:</span>{' '}
            <span data-testid="patient-diagnosis">{summary.primaryDiagnosis}</span>
          </p>
        )}
      </div>
    </section>
  );
}
