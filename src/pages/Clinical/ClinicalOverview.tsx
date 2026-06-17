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

  if (isLoading)
    return (
      <div role="status" className="text-slate-500">
        Loading clinical overview…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Clinical Overview</h2>
        <div className="section-line" />
      </header>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Care Plans</h3>
          <Link
            to="/clinical/care-plans"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            View all
          </Link>
        </div>
        {carePlans.length === 0 ? (
          <p className="text-slate-500">No care plans.</p>
        ) : (
          <ul className="m-0 list-none rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
            {carePlans.map((cp) => (
              <li key={cp.id} className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
                <span className="font-medium text-slate-700">
                  Care Plan #{cp.id} (v{cp.version})
                </span>
                {' — '}
                <span className="text-sm text-slate-500">
                  {cp.status} · effective {cp.effectiveDate.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Prior Authorizations</h3>
          <Link
            to="/clinical/prior-auth"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            View all
          </Link>
        </div>
        {priorAuths.length === 0 ? (
          <p className="text-slate-500">No prior authorizations.</p>
        ) : (
          <ul className="m-0 list-none rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
            {priorAuths.map((pa) => (
              <li key={pa.id} className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
                <span className="font-medium text-slate-700">{pa.serviceType}</span>
                {' — '}
                <span className="text-sm text-slate-500">{pa.payerName} / {pa.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
