import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarePlans, getPriorAuths, type CarePlan, type PriorAuth } from '@/api/clinical';

export function ClinicalOverview() {
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [priorAuths, setPriorAuths] = useState<PriorAuth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCarePlans({ pageSize: 5 }),
      getPriorAuths({ pageSize: 5 }),
    ])
      .then(([cp, pa]) => {
        if (!cancelled) {
          setCarePlans(cp.data);
          setPriorAuths(pa.data);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load clinical data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div role="status">Loading clinical overview…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Clinical Overview</h2>

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 600 }}>Recent Care Plans</h3>
          <Link to="/clinical/care-plans" style={{ color: '#2563eb', fontSize: 14 }}>View all</Link>
        </div>
        {carePlans.length === 0 ? <p style={{ color: '#64748b' }}>No care plans.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {carePlans.map((cp) => (
              <li key={cp.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 500 }}>{cp.title}</span>
                {' — '}
                <span style={{ color: '#64748b', fontSize: 14 }}>{cp.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 600 }}>Recent Prior Authorizations</h3>
          <Link to="/clinical/prior-auth" style={{ color: '#2563eb', fontSize: 14 }}>View all</Link>
        </div>
        {priorAuths.length === 0 ? <p style={{ color: '#64748b' }}>No prior authorizations.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {priorAuths.map((pa) => (
              <li key={pa.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 500 }}>{pa.serviceType}</span>
                {' — '}
                <span style={{ color: '#64748b', fontSize: 14 }}>{pa.payerName} / {pa.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
