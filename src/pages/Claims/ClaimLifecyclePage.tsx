import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClaimLifecycle,
  type ClaimLifecycle,
  type ClaimLifecycleEvent,
} from '@/api/claims';

const EVENT_COLOR: Record<ClaimLifecycleEvent['eventType'], string> = {
  'created': '#64748b',
  'submitted': '#0369a1',
  'status-checked': '#475569',
  'ack': '#0284c7',
  'era-posted': '#15803d',
};

function badge(text: string, bg: string, color = '#fff') {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {text}
    </span>
  );
}

function statusBadge(status: string) {
  const tone =
    status === 'paid' ? '#15803d'
      : status === 'submitted' ? '#0369a1'
      : status === 'rejected' || status === 'denied' ? '#b91c1c'
      : '#64748b';
  return badge(status, tone);
}

export function ClaimLifecyclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lifecycle, setLifecycle] = useState<ClaimLifecycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getClaimLifecycle(parseInt(id, 10))
      .then((data) => { if (!cancelled) setLifecycle(data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(status === 404 ? 'Claim not found' : 'Failed to load lifecycle');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) return <div role="status" className="p-6 text-slate-500">Loading…</div>;
  if (error) return (
    <div className="grid gap-4 p-6">
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      <div>
        <button
          type="button"
          onClick={() => navigate('/claims')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to claims
        </button>
      </div>
    </div>
  );
  if (!lifecycle) return null;

  const { header, submissions, eraPostings, serviceLines, events } = lifecycle;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/claims/${header.id}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back to claim
        </button>
        <h2 className="text-2xl">Claim {header.claimNumber} lifecycle</h2>
      </div>

      {/* Header card */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</div>
          <div className="mt-1">{statusBadge(header.status)}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient</div>
          <div className="mt-1 font-semibold text-slate-700">{header.patientName}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Payer</div>
          <div className="mt-1 font-semibold text-slate-700">{header.payer}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Service date</div>
          <div className="mt-1 text-slate-700">{new Date(header.serviceDate).toLocaleDateString()}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Charged</div>
          <div className="mt-1 font-semibold text-slate-700">${header.amount.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid</div>
          <div className="mt-1 font-semibold text-success">
            {header.paidAmount != null ? `$${header.paidAmount.toFixed(2)}` : '—'}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <h3 className="text-lg font-semibold">Timeline</h3>
      {events.length === 0 ? (
        <div className="text-slate-500">No events yet.</div>
      ) : (
        <ol className="list-none p-0">
          {events.map((e, i) => (
            <li
              key={`${e.eventType}-${e.atUtc}-${i}`}
              className="grid grid-cols-[170px_auto_1fr] items-baseline gap-3 border-b border-slate-100 py-1.5"
            >
              <div className="text-sm text-slate-500">
                {new Date(e.atUtc).toLocaleString()}
              </div>
              <div>{badge(e.eventType, EVENT_COLOR[e.eventType])}</div>
              <div className="text-slate-700">{e.description}</div>
            </li>
          ))}
        </ol>
      )}

      {/* Submissions */}
      <h3 className="text-lg font-semibold">Submissions ({submissions.length})</h3>
      {submissions.length === 0 ? (
        <div className="text-slate-500">No submissions yet.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Clearinghouse</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Ack</th>
                <th className="px-4 py-3">EDI</th>
                <th className="px-4 py-3">Order</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{s.clearinghouse}</td>
                  <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {s.clearinghouseTrackingId ?? s.trackingId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{s.ackStatus ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {s.hasEdi837 && <span title="837 generated">837</span>}
                    {s.hasEdi837 && s.hasEdi835 && ' · '}
                    {s.hasEdi835 && <span title="835 received">835</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{s.payerOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ERA Postings */}
      <h3 className="text-lg font-semibold">ERA postings ({eraPostings.length})</h3>
      {eraPostings.length === 0 ? (
        <div className="text-slate-500">No ERA postings yet.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3">Check</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Matched</th>
              </tr>
            </thead>
            <tbody>
              {eraPostings.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{new Date(e.postedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{e.payerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {e.checkNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-success">
                    ${e.paymentAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {e.matchedClaims}/{e.totalClaims}
                    {e.unmatchedClaims > 0 && (
                      <span className="ml-1.5 text-accent-600">
                        ({e.unmatchedClaims} unmatched)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Service lines */}
      <h3 className="text-lg font-semibold">Service lines ({serviceLines.length})</h3>
      {serviceLines.length === 0 ? (
        <div className="text-slate-500">No service lines.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">CPT</th>
                <th className="px-4 py-3">Service date</th>
                <th className="px-4 py-3 text-right">Charges</th>
              </tr>
            </thead>
            <tbody>
              {serviceLines.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{l.lineNumber}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {l.procedureCode}{l.modifier1 ? `-${l.modifier1}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(l.serviceDateFrom).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    ${Number(l.charges).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
