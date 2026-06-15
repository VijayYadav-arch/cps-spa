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

const STATUS_COLORS: Record<StatementRunStatus, { bg: string; fg: string }> = {
  draft: { bg: '#f1f5f9', fg: '#475569' },
  sent: { bg: '#dbeafe', fg: '#1e40af' },
  'partial-pay': { bg: '#fef3c7', fg: '#92400e' },
  paid: { bg: '#d1fae5', fg: '#065f46' },
  'written-off': { bg: '#fee2e2', fg: '#991b1b' },
};

function statusBadge(s: StatementRunStatus) {
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.draft;
  return (
    <span
      style={{
        background: c.bg, color: c.fg,
        padding: '2px 8px', borderRadius: 6,
        fontSize: 12, fontWeight: 600,
      }}
    >
      {s}
    </span>
  );
}

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8, padding: 16, background: '#fff', minWidth: 160,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Patient Statements</h2>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Statement runs and dunning cadence (30 / 60 / 90 day notices).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
        >
          + Generate Statement
        </button>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      {dunning && (
        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {metricCard(
            'Cycle 2 Due (30d)',
            dunning.cycle2Eligible.toString(),
            dunning.cycle2Eligible > 0 ? '#b45309' : '#15803d',
          )}
          {metricCard(
            'Cycle 3 Due (60d)',
            dunning.cycle3Eligible.toString(),
            dunning.cycle3Eligible > 0 ? '#b91c1c' : '#15803d',
          )}
        </section>
      )}

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <strong>Filter:</strong>
        {(['all', 'draft', 'sent', 'partial-pay', 'paid', 'written-off'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              fontWeight: statusFilter === s ? 700 : 400,
              background: statusFilter === s ? '#0ea5e9' : '#f1f5f9',
              color: statusFilter === s ? '#fff' : '#0f172a',
              border: 'none', padding: '4px 12px', borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </section>

      {isLoading && <div role="status">Loading…</div>}

      {!isLoading && runs.length === 0 && (
        <p style={{ color: '#64748b' }}>No statement runs match this filter.</p>
      )}

      {!isLoading && runs.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Patient</th>
              <th style={{ padding: '6px 10px' }}>Status</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Cycle</th>
              <th style={{ padding: '6px 10px' }}>Statement Date</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Balance</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Paid</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.patientName}</td>
                <td style={{ padding: '6px 10px' }}>{statusBadge(r.status)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{r.dunningCycle}</td>
                <td style={{ padding: '6px 10px' }}>{r.statementDate.slice(0, 10)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {formatMoney(r.patientBalance)}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {formatMoney(r.amountPaid)}
                </td>
                <td style={{ padding: '6px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    style={{ fontSize: 12 }}
                  >
                    Details
                  </button>
                  {r.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => void handleMarkSent(r)}
                      disabled={!canManage}
                      title={!canManage ? NO_PERMISSION : undefined}
                      style={{ fontSize: 12, cursor: !canManage ? 'not-allowed' : 'pointer' }}
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
                      style={{ fontSize: 12, cursor: !canManage ? 'not-allowed' : 'pointer' }}
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
                        style={{ fontSize: 12, cursor: !canManage ? 'not-allowed' : 'pointer' }}
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
                      style={{ fontSize: 12, color: '#b91c1c', cursor: !canManage ? 'not-allowed' : 'pointer' }}
                    >
                      Write Off
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8, padding: 16, background: '#f8fafc',
            display: 'grid', gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                Run #{selected.id} — {selected.patientName}
              </h3>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                {statusBadge(selected.status)} · Cycle {selected.dunningCycle} ·
                {' '}Statement {selected.statementDate.slice(0, 10)} · Due{' '}
                {selected.dueDate.slice(0, 10)}
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Charges', formatMoney(selected.totalCharges), '#0f172a')}
            {metricCard('Payments', formatMoney(selected.totalPayments), '#0f172a')}
            {metricCard('Adjustments', formatMoney(selected.totalAdjustments), '#0f172a')}
            {metricCard('Balance', formatMoney(selected.patientBalance), '#1e40af')}
            {metricCard('Amount Paid', formatMoney(selected.amountPaid), '#15803d')}
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 600 }}>Line Items</h4>
          {selected.lineItems.length === 0 ? (
            <p style={{ color: '#64748b' }}>No line items.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px' }}>Date</th>
                  <th style={{ padding: '6px 10px' }}>Claim #</th>
                  <th style={{ padding: '6px 10px' }}>Description</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Charges</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {selected.lineItems.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px' }}>{l.serviceDate.slice(0, 10)}</td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 12 }}>
                      {l.claimNumber ?? '—'}
                    </td>
                    <td style={{ padding: '6px 10px' }}>{l.description}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {formatMoney(l.chargeAmount)}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {formatMoney(l.paidAmount)}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(l.patientBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {dunning && dunning.entries.length > 0 && (
        <section style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>
            Dunning Queue ({dunning.entries.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Patient</th>
                <th style={{ padding: '6px 10px' }}>Sent</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Days</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Cycle</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '6px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {dunning.entries.map((e) => (
                <tr key={e.runId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{e.patientName}</td>
                  <td style={{ padding: '6px 10px' }}>{e.sentAt.slice(0, 10)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{e.daysSinceSent}d</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    {e.currentCycle} → {e.nextCycle}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    {formatMoney(e.patientBalance)}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <button
                      type="button"
                      onClick={() => void handleEscalate({ ...runs[0], id: e.runId, dunningCycle: e.currentCycle, patientBalance: e.patientBalance } as StatementRun)}
                      disabled={!canManage}
                      title={!canManage ? NO_PERMISSION : undefined}
                      style={{ fontSize: 12, cursor: !canManage ? 'not-allowed' : 'pointer' }}
                    >
                      Send Cycle {e.nextCycle} Notice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
