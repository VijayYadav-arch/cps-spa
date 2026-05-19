import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getStatementRun,
  recordStatementPayment,
  type StatementRun,
} from '@/api/billing';

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
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div role="status">Loading…</div>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div style={{ padding: 48, maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24 }}>Statement Not Found</h1>
        <p style={{ color: '#b91c1c', marginTop: 8 }}>{error}</p>
        <p style={{ color: '#64748b', marginTop: 16 }}>
          Please contact the hospice billing department for assistance.
        </p>
      </div>
    );
  }

  if (!run) return null;

  if (confirmation) {
    return (
      <div style={{ padding: 48, maxWidth: 560, margin: '0 auto' }}>
        <div
          style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 8, padding: 24, textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 26, color: '#15803d' }}>Thank you!</h1>
          <p style={{ marginTop: 12, fontSize: 18 }}>
            We received your payment of{' '}
            <strong>{formatMoney(confirmation.amount)}</strong>.
          </p>
          <p style={{ color: '#475569', marginTop: 8 }}>
            Account status: <strong>{confirmation.newStatus}</strong>
          </p>
          {confirmation.newBalance > 0 ? (
            <p style={{ color: '#475569' }}>
              Remaining balance: <strong>{formatMoney(confirmation.newBalance)}</strong>
            </p>
          ) : (
            <p style={{ color: '#15803d', marginTop: 8 }}>
              Your balance is paid in full.
            </p>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24, textAlign: 'center' }}>
          A confirmation email will be sent shortly. Reference statement #{run.id}.
        </p>
      </div>
    );
  }

  const balanceRemaining = run.patientBalance - run.amountPaid;

  return (
    <div style={{ padding: 48, maxWidth: 560, margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28 }}>Pay Your Statement</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Hospice billing payment portal
        </p>
      </header>

      <section
        style={{
          border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
          background: '#f8fafc', marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{run.patientName}</strong>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
              Statement #{run.id} · Issued {run.statementDate.slice(0, 10)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64748b', fontSize: 13 }}>Amount Due</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {formatMoney(balanceRemaining)}
            </div>
          </div>
        </div>
      </section>

      {error && <div role="alert" style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</div>}

      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
          background: '#fff', display: 'grid', gap: 12,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Payment Information</h2>

        <label>
          <div>Payment Amount *</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0.01}
            step={0.01}
            max={balanceRemaining}
            required
            style={{ width: '100%', fontSize: 16 }}
          />
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Max: {formatMoney(balanceRemaining)}
          </div>
        </label>

        <label>
          <div>Name on Card *</div>
          <input
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </label>

        <label>
          <div>Card Number *</div>
          <input
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            required
            placeholder="4111 1111 1111 1111"
            style={{ width: '100%' }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <div>Expiration *</div>
            <input
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
              placeholder="MM/YY"
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>CVV *</div>
            <input
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              required
              inputMode="numeric"
              maxLength={4}
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            fontSize: 16, fontWeight: 600, padding: '12px 24px',
            background: '#0ea5e9', color: '#fff', border: 'none',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          {submitting ? 'Processing…' : `Pay ${formatMoney(Number(amount) || 0)}`}
        </button>

        <p style={{ color: '#64748b', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
          Demo environment — no real charge is processed. Card details
          are not transmitted to a payment gateway.
        </p>
      </form>
    </div>
  );
}
