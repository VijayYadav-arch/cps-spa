import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getVisits, getOrders, getCarePlans,
  type VisitNoteListItem, type PhysicianOrder, type CarePlan,
} from '@/api/clinical';
import { Breadcrumb } from '@/components/Breadcrumb';

function fmt(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

/**
 * Clinical "My Tasks" worklist — the clinical analog of the billing work queue. Aggregates the
 * open clinical work: visit notes awaiting documentation (drafts), orders awaiting signature, and
 * care plans due for review. Reuses existing endpoints; filtering for the review/unsigned buckets
 * is done client-side.
 */
export function ClinicalWorklistPage() {
  const [drafts, setDrafts] = useState<VisitNoteListItem[]>([]);
  const [unsignedOrders, setUnsignedOrders] = useState<PhysicianOrder[]>([]);
  const [reviewPlans, setReviewPlans] = useState<CarePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      getVisits({ status: 'draft' }),
      getOrders({ pageSize: 100 }),
      getCarePlans({ pageSize: 100 }),
    ])
      .then(([visits, orders, plans]) => {
        if (cancelled) return;
        setDrafts(visits);
        setUnsignedOrders(orders.data.filter((o) => !o.signedBy));
        setReviewPlans(plans.data.filter((c) => c.status === 'draft' || (c.reviewDate != null && c.reviewDate.slice(0, 10) <= today)));
      })
      .catch(() => { if (!cancelled) setError('Failed to load your clinical worklist.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const total = drafts.length + unsignedOrders.length + reviewPlans.length;

  return (
    <div className="grid max-w-[1000px] gap-6 p-6">
      <Breadcrumb items={[{ label: 'Clinical', to: '/clinical' }, { label: 'My Tasks' }]} />
      <header className="space-y-2">
        <h1 className="text-2xl font-serif text-navy-900">My Tasks</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">Open clinical work assigned to you — documentation to finish, orders to sign, and care plans to review.</p>
      </header>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}

      {!isLoading && !error && (
        <>
          {total === 0 && <p data-testid="worklist-empty" className="text-slate-500">You're all caught up — no open clinical tasks.</p>}

          <WorklistSection
            testId="worklist-documentation"
            title="Documentation due"
            count={drafts.length}
            empty="No visit notes awaiting documentation."
            rows={drafts.map((v) => ({
              key: v.id, to: `/clinician/visits/${v.id}`,
              primary: v.patientName ?? `Patient #${v.patientId}`,
              secondary: `${v.visitType ? `${v.visitType} · ` : ''}visit ${fmt(v.visitDate)} · draft`,
            }))}
          />

          <WorklistSection
            testId="worklist-orders"
            title="Orders to sign"
            count={unsignedOrders.length}
            empty="No orders awaiting signature."
            rows={unsignedOrders.map((o) => ({
              key: o.id, to: `/admin/orders`,
              primary: `${o.orderType}: ${o.orderText}`,
              secondary: `ordered ${fmt(o.orderDate)}${o.isVerbal ? ' · verbal' : ''} · ${o.status}`,
            }))}
          />

          <WorklistSection
            testId="worklist-care-plans"
            title="Care plans to review"
            count={reviewPlans.length}
            empty="No care plans due for review."
            rows={reviewPlans.map((c) => ({
              key: c.id, to: `/clinical/care-plans`,
              primary: `Care Plan v${c.version}`,
              secondary: c.status === 'draft' ? 'draft' : `review due ${fmt(c.reviewDate)}`,
            }))}
          />
        </>
      )}
    </div>
  );
}

function WorklistSection({ testId, title, count, empty, rows }: {
  testId: string; title: string; count: number; empty: string;
  rows: { key: number; to: string; primary: string; secondary: string }[];
}) {
  return (
    <section data-testid={testId} className="grid gap-2">
      <h3 className="text-lg font-semibold text-slate-800">
        {title} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600">{count}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="m-0 list-none rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
          {rows.map((r) => (
            <li key={r.key} className="border-b border-slate-100 last:border-b-0">
              <Link to={r.to} data-testid={`${testId}-row-${r.key}`} className="block px-4 py-2.5 no-underline hover:bg-slate-50">
                <div className="font-medium text-slate-700">{r.primary}</div>
                <div className="text-sm text-slate-500">{r.secondary}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
