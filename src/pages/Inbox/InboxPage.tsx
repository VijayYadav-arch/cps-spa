import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getInbox,
  claimWorkItem,
  completeWorkItem,
  snoozeWorkItem,
  wakeWorkItem,
  type WorkQueueItem,
  type WorkQueueStats,
} from '@/api/billing';

const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  critical: { bg: '#fee2e2', fg: '#991b1b' },
  high: { bg: '#ffedd5', fg: '#9a3412' },
  medium: { bg: '#dbeafe', fg: '#1e40af' },
  low: { bg: '#f1f5f9', fg: '#475569' },
};

const TYPE_LABELS: Record<string, string> = {
  'claim-review': 'Claim Review',
  denial: 'Denial',
  'prior-auth': 'Prior Auth',
  'era-posting': 'ERA Posting',
  rebill: 'Rebill',
  'follow-up': 'Follow-Up',
  'eligibility-recheck': 'Eligibility',
  'breach-escalation': 'Breach',
};

const SNOOZE_OPTIONS = [
  { label: '1 hour', deltaMs: 1 * 60 * 60 * 1000 },
  { label: 'Tomorrow', deltaMs: 24 * 60 * 60 * 1000 },
  { label: 'Next week', deltaMs: 7 * 24 * 60 * 60 * 1000 },
];

function priorityBadge(p: string) {
  const c = PRIORITY_COLORS[p] ?? PRIORITY_COLORS.medium;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        background: c.bg,
        color: c.fg,
      }}
    >
      {p}
    </span>
  );
}

function typeChip(t: string) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: '#f1f5f9',
        color: '#334155',
      }}
    >
      {TYPE_LABELS[t] ?? t}
    </span>
  );
}

function isOverdue(item: WorkQueueItem, now: Date): boolean {
  if (!item.dueDate) return false;
  return new Date(item.dueDate) < now && item.status !== 'completed';
}

export function InboxPage() {
  const [items, setItems] = useState<WorkQueueItem[]>([]);
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload(currentTab: 'mine' | 'all' = tab) {
    setLoading(true);
    try {
      const res = await getInbox(currentTab === 'mine');
      setItems(res.data);
      setStats(res.stats);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleClaim(id: number) {
    setNotice(null);
    setError(null);
    try {
      await claimWorkItem(id);
      setNotice(`Claimed work item #${id}`);
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not claim item');
    }
  }

  async function handleComplete(id: number) {
    if (!confirm(`Mark work item #${id} as completed?`)) return;
    setNotice(null);
    setError(null);
    try {
      await completeWorkItem(id);
      setNotice(`Completed work item #${id}`);
      await reload();
    } catch {
      setError('Could not complete item');
    }
  }

  async function handleSnooze(id: number, deltaMs: number, label: string) {
    setNotice(null);
    setError(null);
    const untilUtc = new Date(Date.now() + deltaMs).toISOString();
    try {
      await snoozeWorkItem(id, untilUtc);
      setNotice(`Snoozed #${id} until ${label.toLowerCase()}`);
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not snooze item');
    }
  }

  async function handleWake(id: number) {
    setNotice(null);
    setError(null);
    try {
      await wakeWorkItem(id);
      setNotice(`Woke up #${id}`);
      await reload();
    } catch {
      setError('Could not wake item');
    }
  }

  const now = new Date();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Inbox</h1>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {statCard('Open', stats.pending + stats.inProgress)}
          {statCard('Critical', stats.critical, stats.critical > 0 ? '#dc2626' : undefined)}
          {statCard('Overdue', stats.overdue, stats.overdue > 0 ? '#f59e0b' : undefined)}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['mine', 'all'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px',
              background: tab === t ? '#0ea5e9' : '#fff',
              color: tab === t ? '#fff' : '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            {t === 'mine' ? 'My work' : 'All open'}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" style={{ marginBottom: 12, color: '#166534', background: '#dcfce7', padding: 10, borderRadius: 6 }}>
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginBottom: 12, color: '#991b1b', background: '#fee2e2', padding: 10, borderRadius: 6 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#64748b', padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
          🎉 Inbox zero. Nothing assigned to you right now.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Priority</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Description</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Linked</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Due</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '8px 6px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const overdue = isOverdue(item, now);
              const snoozed = item.snoozeUntilUtc && new Date(item.snoozeUntilUtc) > now;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 6px' }}>{priorityBadge(item.priority)}</td>
                  <td style={{ padding: '8px 6px' }}>{typeChip(item.type)}</td>
                  <td style={{ padding: '8px 6px' }}>{item.description}</td>
                  <td style={{ padding: '8px 6px', fontSize: 12 }}>
                    {item.claimId && (
                      <Link to={`/claims/${item.claimId}`} style={{ color: '#0ea5e9', marginRight: 8 }}>
                        Claim #{item.claimId}
                      </Link>
                    )}
                    {item.patientId && (
                      <Link to={`/patients/${item.patientId}`} style={{ color: '#0ea5e9' }}>
                        Patient #{item.patientId}
                      </Link>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', color: overdue ? '#dc2626' : '#475569', fontWeight: overdue ? 600 : 400 }}>
                    {item.dueDate ? item.dueDate.slice(0, 10) : '—'}
                    {overdue && ' (overdue)'}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    {item.status}
                    {snoozed && <span style={{ color: '#64748b' }}> · snoozed</span>}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!item.assignedTo && (
                      <button
                        type="button"
                        onClick={() => handleClaim(item.id)}
                        style={btnStyle('primary')}
                      >
                        Claim
                      </button>
                    )}
                    {snoozed ? (
                      <button
                        type="button"
                        onClick={() => handleWake(item.id)}
                        style={btnStyle('default')}
                      >
                        Wake
                      </button>
                    ) : (
                      <select
                        onChange={(e) => {
                          const opt = SNOOZE_OPTIONS.find((o) => o.label === e.target.value);
                          if (opt) handleSnooze(item.id, opt.deltaMs, opt.label);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        style={{
                          padding: '2px 4px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          fontSize: 12,
                          marginRight: 4,
                          background: '#fff',
                        }}
                        aria-label={`Snooze item ${item.id}`}
                      >
                        <option value="" disabled>Snooze…</option>
                        {SNOOZE_OPTIONS.map((o) => (
                          <option key={o.label} value={o.label}>{o.label}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => handleComplete(item.id)}
                      style={btnStyle('success')}
                    >
                      Complete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function statCard(label: string, value: number, color = '#0f172a') {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 12,
        minWidth: 120,
        background: '#fff',
      }}
    >
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function btnStyle(kind: 'primary' | 'success' | 'default') {
  const colors = {
    primary: { bg: '#0ea5e9', fg: '#fff', border: '#0ea5e9' },
    success: { bg: '#16a34a', fg: '#fff', border: '#16a34a' },
    default: { bg: '#fff', fg: '#475569', border: '#cbd5e1' },
  }[kind];
  return {
    padding: '4px 10px',
    background: colors.bg,
    color: colors.fg,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    marginLeft: 4,
  };
}
