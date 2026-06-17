import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface Statement {
  id: number;
  status: string;
  statementDate: string;
  dueDate: string;
  patientBalance: number;
  amountPaid: number;
  balanceRemaining: number;
  paidAt: string | null;
}

interface PaymentItem {
  id: number;
  statementRunId: number;
  amount: number;
  method: string;
  last4: string | null;
  confirmationNumber: string;
  paidAtUtc: string;
}

interface PayResult {
  confirmationNumber: string;
  amount: number;
  newStatus: string;
  newBalanceRemaining: number;
}

const usd = (n: number) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function FamilyPayments() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Pay dialog
  const [paying, setPaying] = useState<Statement | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'demo' | 'card' | 'ach'>('demo');
  const [cardNumber, setCardNumber] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  function load() {
    if (!patientId) return;
    familyApi
      .get<{ data: Statement[] }>(`/patients/${patientId}/statements`)
      .then((r) => setStatements(r.data.data ?? []))
      .catch(() => setError('Unable to load statements. Please refresh or contact your care team.'));
    familyApi
      .get<{ data: PaymentItem[] }>(`/patients/${patientId}/payments`)
      .then((r) => setPayments(r.data.data ?? []))
      .catch(() => undefined);
  }

  useEffect(load, [patientId]);

  function openPay(s: Statement) {
    setConfirmation(null);
    setPaying(s);
    setAmount(String(s.balanceRemaining));
    setMethod('demo');
    setCardNumber('');
    setNameOnCard('');
  }

  async function submitPayment() {
    if (!patientId || !paying) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await familyApi.post<PayResult>(
        `/patients/${patientId}/statements/${paying.id}/pay`,
        {
          amount: Number(amount),
          method,
          cardNumber: method === 'card' ? cardNumber : null,
          nameOnCard: method === 'card' ? nameOnCard : null,
        },
      );
      setConfirmation(r.data.confirmationNumber);
      setPaying(null);
      load();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Payment could not be processed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (error && statements === null) {
    return (
      <p data-testid="family-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {error}
      </p>
    );
  }
  if (statements === null) {
    return <p data-testid="family-loading" role="status" className="p-4 text-slate-500">Loading…</p>;
  }

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 data-testid="page-title" className="text-2xl">Statements &amp; Payments</h1>
        <Link to="/family/billing" className="text-sm font-medium text-teal-700 hover:underline">
          View billing →
        </Link>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}
      {confirmation && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Payment received — confirmation <strong>{confirmation}</strong>. Thank you.
        </p>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Statements</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Statement Date</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{new Date(s.statementDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(s.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-700">{usd(s.balanceRemaining)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{s.status}</td>
                  <td className="px-4 py-3 text-right">
                    {s.balanceRemaining > 0 && (
                      <button onClick={() => openPay(s)} className="btn-primary px-3 py-1 text-xs">
                        Make a payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {statements.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No statements.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Payment history</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{new Date(p.paidAtUtc).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-700">{usd(p.amount)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">
                    {p.method}{p.last4 ? ` ••${p.last4}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.confirmationNumber}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paying && (
        <div role="dialog" aria-label="Make a payment" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-lg grid gap-4">
            <h2 className="text-lg font-semibold">Pay statement</h2>
            <p className="text-sm text-slate-500">Balance due {usd(paying.balanceRemaining)}</p>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Amount</span>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input w-40" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as 'demo' | 'card' | 'ach')} className="form-input w-40">
                <option value="demo">Demo</option>
                <option value="card">Card</option>
                <option value="ach">Bank (ACH)</option>
              </select>
            </label>
            {method === 'card' && (
              <>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Card number</span>
                  <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="form-input" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">Name on card</span>
                  <input value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} className="form-input" />
                </label>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setPaying(null)} disabled={submitting}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
              <button onClick={submitPayment} disabled={submitting || !(Number(amount) > 0)} className="btn-primary disabled:opacity-60">
                {submitting ? 'Processing…' : `Pay ${usd(Number(amount) || 0)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
