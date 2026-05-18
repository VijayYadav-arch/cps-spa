import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatientElections, type HospiceElection } from '@/api/hospice';

export function HospiceSummaryCard({ patientId }: { patientId: number }) {
  const [elections, setElections] = useState<HospiceElection[] | null>(null);

  useEffect(() => {
    getPatientElections(patientId)
      .then((res) => setElections(res.data))
      .catch(() => setElections([]));
  }, [patientId]);

  if (elections === null) return null;

  const active = elections.find((e) => e.status === 'Active');

  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        background: active ? '#f8fafc' : '#fff',
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Hospice</h3>
      {active && active.currentPeriod ? (
        <div>
          <p style={{ marginBottom: 4 }}>
            <strong>Status:</strong> {active.status} •{' '}
            <strong>Period {active.currentPeriod.periodNumber}</strong> (
            {active.currentPeriod.daysUntilRecertDue} days until recert)
          </p>
          {active.noe && (
            <p style={{ marginBottom: 8, color: '#64748b' }}>
              NOE: {active.noe.status}
              {active.noe.status === 'Pending' &&
                ` (deadline ${active.noe.deadlineDate})`}
            </p>
          )}
          <Link to={`/patients/${patientId}/hospice/${active.id}`}>
            Manage Hospice Election
          </Link>
        </div>
      ) : (
        <div>
          <p style={{ color: '#64748b', marginBottom: 8 }}>
            No active hospice election.
          </p>
          <Link to={`/patients/${patientId}/hospice/new`}>
            Start Hospice Election
          </Link>
        </div>
      )}
    </section>
  );
}
