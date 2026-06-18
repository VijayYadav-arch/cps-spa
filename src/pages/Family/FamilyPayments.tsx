import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export function FamilyPayments() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en-US';
  const usd = (n: number) =>
    Number(n).toLocaleString(locale, { style: 'currency', currency: 'USD' });
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
      .catch(() => setError(t('family.payments.loadFailed')));
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
          t('family.payments.failed'),
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
    return <p data-testid="family-loading" role="status" className="p-4 text-slate-500">{t('common.loading')}</p>;
  }

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 data-testid="page-title" className="text-2xl">{t('family.payments.title')}</h1>
        <Link to="/family/billing" className="text-sm font-medium text-teal-700 hover:underline">
          {t('family.payments.billingLink')}
        </Link>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}
      {confirmation && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t('family.payments.received', { code: confirmation })}
        </p>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">{t('family.payments.statementsHeading')}</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">{t('family.payments.columnStatementDate')}</th>
                <th className="px-4 py-3">{t('family.payments.columnDue')}</th>
                <th className="px-4 py-3">{t('family.payments.columnBalance')}</th>
                <th className="px-4 py-3">{t('family.payments.columnStatus')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{new Date(s.statementDate).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(s.dueDate).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3 text-slate-700">{usd(s.balanceRemaining)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{s.status}</td>
                  <td className="px-4 py-3 text-right">
                    {s.balanceRemaining > 0 && (
                      <button onClick={() => openPay(s)} className="btn-primary px-3 py-1 text-xs">
                        {t('family.payments.makePayment')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {statements.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">{t('family.payments.noStatements')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">{t('family.payments.historyHeading')}</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">{t('family.payments.columnDate')}</th>
                <th className="px-4 py-3">{t('family.payments.columnAmount')}</th>
                <th className="px-4 py-3">{t('family.payments.columnMethod')}</th>
                <th className="px-4 py-3">{t('family.payments.columnConfirmation')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{new Date(p.paidAtUtc).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3 text-slate-700">{usd(p.amount)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">
                    {p.method}{p.last4 ? ` ••${p.last4}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.confirmationNumber}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">{t('family.payments.noPayments')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paying && (
        <div role="dialog" aria-label={t('family.payments.dialogTitle')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-lg grid gap-4">
            <h2 className="text-lg font-semibold">{t('family.payments.dialogTitle')}</h2>
            <p className="text-sm text-slate-500">{t('family.payments.balanceDue', { amount: usd(paying.balanceRemaining) })}</p>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">{t('family.payments.amountLabel')}</span>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input w-40" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">{t('family.payments.methodLabel')}</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as 'demo' | 'card' | 'ach')} className="form-input w-40">
                <option value="demo">{t('family.payments.methodDemo')}</option>
                <option value="card">{t('family.payments.methodCard')}</option>
                <option value="ach">{t('family.payments.methodAch')}</option>
              </select>
            </label>
            {method === 'card' && (
              <>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">{t('family.payments.cardNumberLabel')}</span>
                  <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="form-input" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-600">{t('family.payments.nameOnCardLabel')}</span>
                  <input value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} className="form-input" />
                </label>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setPaying(null)} disabled={submitting}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">{t('family.payments.cancel')}</button>
              <button onClick={submitPayment} disabled={submitting || !(Number(amount) > 0)} className="btn-primary disabled:opacity-60">
                {submitting ? t('family.payments.processing') : t('family.payments.payAmount', { amount: usd(Number(amount) || 0) })}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
