import { useEffect, useState } from 'react';
import {
  escalateStatement,
  generateStatementRun,
  getStatementDunningQueue,
  listStatementRuns,
  markStatementSent,
  recordStatementPayment,
  writeOffStatement,
  type DunningQueueResponse,
  type StatementRun,
  type StatementRunStatus,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_BADGE: Record<StatementRunStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-800',
  'partial-pay': 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  'written-off': 'bg-red-100 text-red-800',
};

function statusBadge(s: StatementRunStatus) {
  const cls = STATUS_BADGE[s] ?? STATUS_BADGE.draft;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {s}
    </span>
  );
}

function metricCard(label: string, value: string, toneClass: string) {
  return (
    <div className="card-hover min-w-40 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

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

export function StatementsPage() {
  const [runs, setRuns] = useState<StatementRun[]>([]);
  const [dunning, setDunning] = useState<DunningQueueResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatementRunStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<StatementRun | null>(null);

  // All state-changing actions hit /billing/statements/runs/* → billing:statements.
  const canManage = usePermission(PERMISSIONS.BILLING_STATEMENTS);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const [list, queue] = await Promise.all([
        listStatementRuns(filter),
        getStatementDunningQueue(),
      ]);
      setRuns(list.data);
      setDunning(queue);
    } catch {
      setError('Failed to load statement runs.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [statusFilter]);

  async function handleGenerate() {
    setError(null);
    const idStr = window.prompt('Patient ID to generate statement for:');
    if (!idStr) return;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) {
      setError('Invalid patient id.');
      return;
    }
    try {
      const run = await generateStatementRun(id);
      setActionMsg(`Generated statement run #${run.id} for ${run.patientName} (${formatMoney(run.patientBalance)}).`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to generate statement.'));
    }
  }

  async function handleMarkSent(r: StatementRun) {
    setError(null);
    try {
      await markStatementSent(r.id);
      setActionMsg(`Marked run #${r.id} as sent.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to mark sent.'));
    }
  }

  async function handleRecordPayment(r: StatementRun) {
    setError(null);
    const amtStr = window.prompt(`Payment amount (balance ${formatMoney(r.patientBalance - r.amountPaid)}):`);
    if (!amtStr) return;
    const amt = Number(amtStr);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Invalid amount.');
      return;
    }
    try {
      const updated = await recordStatementPayment(r.id, amt);
      setActionMsg(`Recorded ${formatMoney(amt)} on run #${r.id}; new status: ${updated.status}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to record payment.'));
    }
  }

  async function handleWriteOff(r: StatementRun) {
    if (!window.confirm(`Write off ${formatMoney(r.patientBalance - r.amountPaid)} on run #${r.id}?`)) return;
    setError(null);
    try {
      await writeOffStatement(r.id);
      setActionMsg(`Wrote off run #${r.id}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to write off.'));
    }
  }

  async function handleEscalate(r: StatementRun) {
    setError(null);
    try {
      const next = await escalateStatement(r.id);
      setActionMsg(`Escalated to dunning cycle ${next.dunningCycle} (new run #${next.id}).`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to escalate.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-baseline justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl">Patient Statements</h2>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            Statement runs and dunning cadence (30 / 60 / 90 day notices).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          + Generate Statement
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>}

      {dunning && (
        <section className="flex flex-wrap gap-4">
          {metricCard(
            'Cycle 2 Due (30d)',
            dunning.cycle2Eligible.toString(),
            dunning.cycle2Eligible > 0 ? 'text-accent-600' : 'text-success',
          )}
          {metricCard(
            'Cycle 3 Due (60d)',
            dunning.cycle3Eligible.toString(),
            dunning.cycle3Eligible > 0 ? 'text-error' : 'text-success',
          )}
        </section>
      )}

      <section className="flex flex-wrap items-center gap-2">
        <strong className="text-slate-700">Filter:</strong>
        {(['all', 'draft', 'sent', 'partial-pay', 'paid', 'written-off'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-teal-600 font-semibold text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </section>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}

      {!isLoading && runs.length === 0 && (
        <p className="text-slate-500">No statement runs match this filter.</p>
      )}

      {!isLoading && runs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Cycle</th>
                <th className="px-4 py-3">Statement Date</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">{r.patientName}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.dunningCycle}</td>
                  <td className="px-4 py-3 text-slate-700">{r.statementDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatMoney(r.patientBalance)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatMoney(r.amountPaid)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Details
                      </button>
                      {r.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => void handleMarkSent(r)}
                          disabled={!canManage}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Mark Sent
                        </button>
                      )}
                      {(r.status === 'sent' || r.status === 'partial-pay' || r.status === 'draft') && (
                        <button
                          type="button"
                          onClick={() => void handleRecordPayment(r)}
                          disabled={!canManage}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Record Payment
                        </button>
                      )}
                      {(r.status === 'sent' || r.status === 'partial-pay')
                        && r.dunningCycle < 3 && (
                          <button
                            type="button"
                            onClick={() => void handleEscalate(r)}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Escalate
                          </button>
                        )}
                      {r.status !== 'paid' && r.status !== 'written-off' && (
                        <button
                          type="button"
                          onClick={() => void handleWriteOff(r)}
                          disabled={!canManage}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Write Off
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Run #{selected.id} — {selected.patientName}
              </h3>
              <div className="mt-1 text-sm text-slate-500">
                {statusBadge(selected.status)} · Cycle {selected.dunningCycle} ·
                {' '}Statement {selected.statementDate.slice(0, 10)} · Due{' '}
                {selected.dueDate.slice(0, 10)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {metricCard('Charges', formatMoney(selected.totalCharges), 'text-navy-900')}
            {metricCard('Payments', formatMoney(selected.totalPayments), 'text-navy-900')}
            {metricCard('Adjustments', formatMoney(selected.totalAdjustments), 'text-navy-900')}
            {metricCard('Balance', formatMoney(selected.patientBalance), 'text-blue-800')}
            {metricCard('Amount Paid', formatMoney(selected.amountPaid), 'text-success')}
          </div>
          <h4 className="text-sm font-semibold text-slate-700">Line Items</h4>
          {selected.lineItems.length === 0 ? (
            <p className="text-slate-500">No line items.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Claim #</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Charges</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lineItems.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{l.serviceDate.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {l.claimNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{l.description}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(l.chargeAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(l.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {formatMoney(l.patientBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {dunning && dunning.entries.length > 0 && (
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold">
            Dunning Queue ({dunning.entries.length})
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3 text-right">Days</th>
                  <th className="px-4 py-3 text-right">Cycle</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {dunning.entries.map((e) => (
                  <tr key={e.runId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{e.patientName}</td>
                    <td className="px-4 py-3 text-slate-700">{e.sentAt.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{e.daysSinceSent}d</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {e.currentCycle} → {e.nextCycle}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(e.patientBalance)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleEscalate({ ...runs[0], id: e.runId, dunningCycle: e.currentCycle, patientBalance: e.patientBalance } as StatementRun)}
                        disabled={!canManage}
                        title={!canManage ? NO_PERMISSION : undefined}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Send Cycle {e.nextCycle} Notice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
