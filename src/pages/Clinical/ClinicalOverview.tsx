import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarePlans, getPriorAuths, type CarePlan, type PriorAuth } from '@/api/clinical';
import { useUserRoles } from '@/permissions/useUserRoles';
import { PERMISSIONS } from '@/permissions/permissions';

interface HubCard {
  to: string;
  title: string;
  desc: string;
  perm: string;
}

// The clinician's tools. Several of these were routed but unreachable from the sidebar; this hub
// (and the expanded Clinical nav group) surfaces them. Each card is permission-gated.
const HUB_CARDS: HubCard[] = [
  { to: '/clinician/dashboard', title: 'My Day', desc: "Today's visits, pending documentation, assigned patients.", perm: PERMISSIONS.CLINICAL_VISIT_NOTES },
  { to: '/clinician/visits', title: 'My Visits', desc: 'Schedule, document, and sign visit notes.', perm: PERMISSIONS.CLINICAL_VISIT_NOTES },
  { to: '/clinician/patients', title: 'My Patients', desc: 'Your caseload and each patient’s clinical chart.', perm: PERMISSIONS.CLINICAL_VISIT_NOTES },
  { to: '/clinical/care-plans', title: 'Care Plans', desc: 'Goals, interventions, and the plan of care.', perm: PERMISSIONS.CLINICAL_CARE_PLANS },
  { to: '/admin/medications', title: 'Medications', desc: 'Medication list and administration.', perm: PERMISSIONS.CLINICAL_MEDICATIONS },
  { to: '/admin/orders', title: 'Orders', desc: 'Clinical orders and sign-off.', perm: PERMISSIONS.CLINICAL_ORDERS },
  { to: '/admin/referrals', title: 'Referrals', desc: 'Incoming and outgoing referrals.', perm: PERMISSIONS.CLINICAL_REFERRALS },
  { to: '/clinical/prior-auth', title: 'Prior Authorizations', desc: 'Authorization requests and status.', perm: PERMISSIONS.CLINICAL_PRIOR_AUTH },
];

export function ClinicalOverview() {
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [priorAuths, setPriorAuths] = useState<PriorAuth[]>([]);
  const [error, setError] = useState<string | null>(null);

  const permissions = useUserRoles().data?.permissions ?? [];
  const cards = HUB_CARDS.filter((c) => permissions.includes(c.perm));

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCarePlans({ pageSize: 5 }), getPriorAuths({ pageSize: 5 })])
      .then(([cp, pa]) => {
        if (!cancelled) { setCarePlans(cp.data); setPriorAuths(pa.data); }
      })
      .catch(() => { if (!cancelled) setError('Failed to load clinical data.'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif text-navy-900">Clinical</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">Your clinical workspace — visits, documentation, and the patient chart.</p>
      </header>

      <section data-testid="clinical-hub" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            data-testid={`clinical-hub-${c.title.toLowerCase().replace(/\s+/g, '-')}`}
            className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="font-medium text-navy-900">{c.title}</div>
            <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Care Plans</h3>
            <Link to="/clinical/care-plans" className="text-sm font-medium text-teal-700 hover:underline">View all</Link>
          </div>
          {carePlans.length === 0 ? (
            <p className="text-slate-500">No care plans.</p>
          ) : (
            <ul className="m-0 list-none rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
              {carePlans.map((cp) => (
                <li key={cp.id} className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
                  <span className="font-medium text-slate-700">Care Plan #{cp.id} (v{cp.version})</span>
                  {' — '}
                  <span className="text-sm text-slate-500">{cp.status} · effective {cp.effectiveDate.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Prior Authorizations</h3>
            <Link to="/clinical/prior-auth" className="text-sm font-medium text-teal-700 hover:underline">View all</Link>
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
    </div>
  );
}
