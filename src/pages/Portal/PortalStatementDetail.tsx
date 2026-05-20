import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import {
  portalStatement,
  portalPayStatement,
  type PortalStatement,
  type PortalPaymentResult,
} from '@/portal/portalApi';

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function PortalStatementDetail() {
  const { me } = usePortalAuth();
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [statement, setStatement] = useState<PortalStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<PortalPaymentResult | null>(null);

  useEffect(() => {
    if (!me || !runId) return;
    portalStatement(me.patientId, Number(runId))
      .then((s) => {
        setStatement(s);
        setAmount((s.balanceRemaining ?? s.patientBalance - s.amountPaid).toFixed(2));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [me, runId]);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!me || !statement) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a positive payment amount');
      return;
    }
    if (cardNumber.replace(/\D/g, '').length < 12) {
      setError('Card number must be at least 12 digits');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await portalPayStatement(me.patientId, statement.id, {
        amount: numericAmount,
        method: 'card',
        cardNumber: cardNumber.replace(/\D/g, ''),
        nameOnCard,
      });
      setConfirmation(result);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!me) return null;
  if (loading) return <div>Loading…</div>;
  if (error && !statement) return <div style={{ color: '#dc2626' }}>{error}</div>;
  if (!statement) return <div>Statement not found.</div>;

  if (confirmation) {
    return (
      <div>
        <h1 style={{ marginTop: 0, color: '#16a34a' }}>Payment received</h1>
        <div style={{ fontSize: 16, marginBottom: 16 }}>
          Thank you! We received your payment of <strong>{money(confirmation.amount)}</strong>.
        </div>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, fontSize: 13 }}>
          <div>Confirmation number: <strong>{confirmation.confirmationNumber}</strong></div>
          <div>Method: {confirmation.method} {confirmation.last4 && `· ending ${confirmation.last4}`}</div>
          <div>New balance: <strong>{money(confirmation.newBalanceRemaining)}</strong></div>
          <div>Status: {confirmation.newStatus}</div>
        </div>
        <button
          onClick={() => navigate('/portal/statements')}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Back to statements
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Statement {statement.statementDate.slice(0, 10)}</h1>
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Balance due</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>
            {money(statement.balanceRemaining)}
          </div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Due by</div>
          <div style={{ fontSize: 16 }}>{statement.dueDate.slice(0, 10)}</div>
        </div>
      </div>

      {statement.lineItems.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16 }}>Charges</h2>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: 6 }}>Date</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Description</th>
                <th style={{ textAlign: 'right', padding: 6 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {statement.lineItems.map((li, i) => (
                <tr key={`${li.claimId}-${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}>{li.serviceDate.slice(0, 10)}</td>
                  <td style={{ padding: 6 }}>{li.description}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{money(li.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 16 }}>Make a payment</h2>
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
          <label htmlFor="amount" style={{ fontSize: 13 }}>Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
          <label htmlFor="cardNumber" style={{ fontSize: 13 }}>Card number</label>
          <input
            id="cardNumber"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="4111 1111 1111 1111"
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
          <label htmlFor="nameOnCard" style={{ fontSize: 13 }}>Name on card</label>
          <input
            id="nameOnCard"
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
          {error && <div role="alert" style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 8,
              padding: '10px 16px',
              background: submitting ? '#94a3b8' : '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Processing…' : `Pay ${money(Number(amount) || 0)}`}
          </button>
        </form>
      </section>
    </div>
  );
}
