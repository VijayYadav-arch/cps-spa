import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface Claim {
  id: number;
  claimNumber: string;
  patientName: string;
  serviceDate: string;
  payer: string;
  amount: number;
  paidAmount: number | null;
  status: string;
  denialReason: string | null;
}

interface ClaimsEnvelope {
  data: Claim[];
  pagination?: { totalCount: number };
}

const currency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Denied', value: 'denied' },
  { label: 'Submitted', value: 'submitted' },
];

export function CommercialClaimsPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'all';

  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const qs = status && status !== 'all' ? `?status=${status}` : '';

    const filteredP = apiClient.get<ClaimsEnvelope>(`/claims${qs}`);
    const allP =
      status && status !== 'all'
        ? apiClient.get<ClaimsEnvelope>('/claims')
        : filteredP;

    Promise.all([filteredP, allP])
      .then(([filteredRes, allRes]) => {
        if (cancelled) return;
        setClaims(filteredRes.data.data ?? []);
        setAllClaims(allRes.data.data ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        Failed to load claims.
      </div>
    );
  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading…
      </div>
    );

  const totalBilled = allClaims.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = allClaims
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
  const totalPending = allClaims
    .filter((c) => c.status === 'submitted' || c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          Claims
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and manage all your billing claims
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Claims
          </p>
          <p
            data-testid="stat-total-claims"
            className="mt-1.5 text-2xl font-bold text-navy-900"
          >
            {allClaims.length}
          </p>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Billed
          </p>
          <p
            data-testid="stat-total-billed"
            className="mt-1.5 text-2xl font-bold text-navy-900"
          >
            {currency(totalBilled)}
          </p>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Paid
          </p>
          <p
            data-testid="stat-total-paid"
            className="mt-1.5 text-2xl font-bold text-teal-700"
          >
            {currency(totalPaid)}
          </p>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Pending
          </p>
          <p
            data-testid="stat-total-pending"
            className="mt-1.5 text-2xl font-bold text-accent-600"
          >
            {currency(totalPending)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = status === f.value;
          const to = f.value === 'all' ? '/portal/claims' : `/portal/claims?status=${f.value}`;
          return (
            <Link
              key={f.value}
              to={to}
              data-testid={`filter-${f.value}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium no-underline ${
                isActive
                  ? 'bg-navy-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div
        data-testid="claims-list"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {claims.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No claims found.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Claim #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Service Date</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr
                  key={claim.id}
                  data-testid="claim-row"
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td
                    data-testid="claim-id"
                    className="px-4 py-3 font-mono text-xs text-slate-700"
                  >
                    {claim.claimNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {claim.patientName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(claim.serviceDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{claim.payer}</td>
                  <td
                    data-testid="claim-amount"
                    className="px-4 py-3 text-right font-medium text-slate-700"
                  >
                    {currency(claim.amount)}
                  </td>
                  <td data-testid="claim-status" className="px-4 py-3 text-slate-700">
                    {claim.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
