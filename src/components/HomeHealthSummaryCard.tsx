import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listHomeHealthEpisodesForPatient, type HomeHealthEpisode } from '@/api/homehealth';

export function HomeHealthSummaryCard({ patientId }: { patientId: number }) {
  const [episodes, setEpisodes] = useState<HomeHealthEpisode[] | null>(null);

  useEffect(() => {
    listHomeHealthEpisodesForPatient(patientId)
      .then(setEpisodes)
      .catch(() => setEpisodes([]));
  }, [patientId]);

  if (episodes === null) return null;

  const active = episodes.find((e) => e.status === 'active');

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
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Home Health</h3>
      {active ? (
        <div>
          <p style={{ marginBottom: 8 }}>
            <strong>Status:</strong> {active.status} • <strong>Period {active.periodNumber}</strong> •{' '}
            cert {active.certFromDate} → {active.certToDate}
          </p>
          <Link to={`/patients/${patientId}/home-health/${active.id}`}>Manage Home-Health Episode</Link>
        </div>
      ) : (
        <div>
          <p style={{ color: '#64748b', marginBottom: 8 }}>No active home-health episode.</p>
          <Link to={`/patients/${patientId}/home-health/new`}>Admit to Home Health</Link>
        </div>
      )}
    </section>
  );
}
