import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getStatementRun,
  recordStatementPayment,
  type StatementRun,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

/**
 * Patient-portal-style payment preview. Renders the patient-facing UX
 * (no left nav, big "Pay Your Statement" header, card form) but uses the
 * existing staff /billing/statements/runs/{id}/record-payment endpoint so
 * staff can demo / preview the patient portal flow without standing up the
 * separate family-portal app.
 *
 * In a production patient portal, the same component would hit the
 * /family-api/patients/{patientId}/statements/{runId}/pay endpoint
 * authenticated with FamilyJwt.
 */
function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  });
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

interface ConfirmationState {
  amount: number;
  newStatus: string;
  newBalance: number;
}

export function PortalPaymentPage() {
  const { runId } = useParams<{ runId: string }>();
  const id = Number(runId);
  const [run, setRun] = useState<StatementRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  // Form state
  const [amount, setAmount] = useState<string>('');
  const [cardNumber, setCardNumber] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // record-payment hits POST /billing/statements/runs/{id}/record-payment,
  // gated by [Authorize(Policy = "billing:statements")].
  const canPay = usePermission(PERMISSIONS.BILLING_STATEMENTS);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setError('Invalid statement id.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await getStatementRun(id);
        if (!cancelled) {
          setRun(r);
          // Pre-fill with full balance
          setAmount((r.patientBalance - r.amountPaid).toFixed(2));
        }
      } catch {
        if (!cancelled) setError('Statement not found or no longer payable.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!run) return;
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a payment amount.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await recordStatementPayment(run.id, amt);
      setConfirmation({
        amount: amt,
        newStatus: updated.status,
        newBalance: updated.patientBalance - updated.amountPaid,
      });
    } catch (err) {
      setError(extractError(err, 'Payment failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className="mx-auto max-w-[480px] p-12">
        <h1 className="text-2xl">Statement Not Found</h1>
        <p className="mt-2 text-red-800">{error}</p>
        <p className="mt-4 text-slate-500">
          Please contact the hospice billing department for assistance.
        </p>
      </div>
    );
  }

  if (!run) return null;

  if (confirmation) {
    return (
      <div className="mx-auto max-w-[560px] p-12">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <h1 className="text-2xl text-green-800">Thank you!</h1>
          <p className="mt-3 text-lg">
            We received your payment of{' '}
            <strong>{formatMoney(confirmation.amount)}</strong>.
          </p>
          <p className="mt-2 text-slate-600">
            Account status: <strong>{confirmation.newStatus}</strong>
          </p>
          {confirmation.newBalance > 0 ? (
            <p className="text-slate-600">
              Remaining balance: <strong>{formatMoney(confirmation.newBalance)}</strong>
            </p>
          ) : (
            <p className="mt-2 text-green-800">Your balance is paid in full.</p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          A confirmation email will be sent shortly. Reference statement #{run.id}.
        </p>
      </div>
    );
  }

  const balanceRemaining = run.patientBalance - run.amountPaid;

  return (
    <div className="mx-auto max-w-[560px] p-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl">Pay Your Statement</h1>
        <p className="mt-1 text-slate-500">Hospice billing payment portal</p>
      </header>

      <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex justify-between">
          <div>
            <strong>{run.patientName}</strong>
            <div className="mt-0.5 text-sm text-slate-500">
              Statement #{run.id} · Issued {run.statementDate.slice(0, 10)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Amount Due</div>
            <div className="text-2xl font-bold">{formatMoney(balanceRemaining)}</div>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="mb-4 text-red-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="text-lg font-semibold">Payment Information</h2>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Payment Amount *</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0.01}
            step={0.01}
            max={balanceRemaining}
            required
            className="form-input"
          />
          <span className="text-xs text-slate-500">
            Max: {formatMoney(balanceRemaining)}
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Name on Card *</span>
          <input
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value)}
            required
            className="form-input"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Card Number *</span>
          <input
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            required
            placeholder="4111 1111 1111 1111"
            className="form-input"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Expiration *</span>
            <input
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
              placeholder="MM/YY"
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">CVV *</span>
            <input
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              required
              inputMode="numeric"
              maxLength={4}
              className="form-input"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || !canPay}
          title={!canPay ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Processing…' : `Pay ${formatMoney(Number(amount) || 0)}`}
        </button>

        <p className="mt-1 text-center text-xs text-slate-500">
          Demo environment — no real charge is processed. Card details
          are not transmitted to a payment gateway.
        </p>
      </form>
    </div>
  );
}
