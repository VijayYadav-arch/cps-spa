import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getInbox,
  claimWorkItem,
  completeWorkItem,
  snoozeWorkItem,
  wakeWorkItem,
  bulkWorkItem,
  getAssignableUsers,
  assignWorkItem,
  getSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
  type AssignableUser,
  type BulkAction,
  type InboxFilterSpec,
  type InboxSavedFilter,
  type WorkQueueItem,
  type WorkQueueStats,
} from '@/api/billing';
import { InboxItemDrawer } from '@/pages/Inbox/InboxItemDrawer';

function formatUserName(u: AssignableUser): string {
  const full = `${u.firstName} ${u.lastName}`.trim();
  return full || u.email;
}

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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSnoozeLabel, setBulkSnoozeLabel] = useState<string>('');
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>('');
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [drawerItem, setDrawerItem] = useState<WorkQueueItem | null>(null);
  const [savedFilters, setSavedFilters] = useState<InboxSavedFilter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<number | null>(null);
  const [filter, setFilter] = useState<InboxFilterSpec>({});

  // Load saved filters once; silent on failure (user may lack billing:queue
  // in some scopes — chip strip just stays empty).
  useEffect(() => {
    let cancelled = false;
    getSavedFilters()
      .then((rows) => { if (!cancelled) setSavedFilters(rows); })
      .catch(() => { /* leave empty */ });
    return () => { cancelled = true; };
  }, []);

  function applyFilter(saved: InboxSavedFilter) {
    setActiveFilterId(saved.id);
    try {
      const spec = JSON.parse(saved.filterJson) as InboxFilterSpec;
      setFilter(spec);
      if (spec.tab && spec.tab !== tab) setTab(spec.tab);
    } catch {
      setError(`Saved filter "${saved.name}" is corrupt`);
    }
  }

  function clearFilter() {
    setActiveFilterId(null);
    setFilter({});
  }

  async function handleSaveCurrentFilter() {
    const name = window.prompt('Name for this filter:');
    if (!name || !name.trim()) return;
    setError(null);
    try {
      const spec: InboxFilterSpec = { ...filter, tab };
      const saved = await createSavedFilter(name.trim(), spec);
      setSavedFilters((prev) => [...prev, saved]);
      setActiveFilterId(saved.id);
      setNotice(`Saved filter "${saved.name}"`);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not save filter');
    }
  }

  async function handleDeleteFilter(id: number) {
    if (!confirm('Delete this saved filter?')) return;
    try {
      await deleteSavedFilter(id);
      setSavedFilters((prev) => prev.filter((f) => f.id !== id));
      if (activeFilterId === id) clearFilter();
    } catch {
      setError('Could not delete filter');
    }
  }

  // Load the picker list once. Fail silently — the row Assign… dropdowns
  // become harmless empty selects if the user lacks the permission.
  useEffect(() => {
    let cancelled = false;
    getAssignableUsers()
      .then((u) => { if (!cancelled) setAssignableUsers(u); })
      .catch(() => { /* picker just stays empty */ });
    return () => { cancelled = true; };
  }, []);

  // Client-side filtering applied to the already-loaded inbox set. The
  // backend doesn't know about saved filters, so we slice locally.
  const filteredItems = useMemo(() => {
    const now = new Date();
    return items.filter((i) => {
      if (filter.priority && filter.priority.length > 0
          && !filter.priority.includes(i.priority as 'critical' | 'high' | 'medium' | 'low'))
        return false;
      if (filter.type && filter.type.length > 0 && !filter.type.includes(i.type))
        return false;
      if (filter.overdueOnly && !isOverdue(i, now))
        return false;
      return true;
    });
  }, [items, filter]);

  const selectableIds = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);
  const allSelected = selected.size > 0 && selected.size === selectableIds.length;
  const someSelected = selected.size > 0 && selected.size < selectableIds.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(
    action: BulkAction,
    opts: { snoozeUntilUtc?: string; assignToUserId?: number } = {},
  ) {
    if (selected.size === 0) return;
    setNotice(null);
    setError(null);
    try {
      const ids = Array.from(selected);
      const result = await bulkWorkItem(action, ids, opts);
      const okCount = result.succeeded.length;
      const failCount = result.failed.length;
      setSelected(new Set());
      setBulkSnoozeLabel('');
      setBulkAssignUserId('');
      // Reload BEFORE composing the user-visible status so reload()'s
      // setError(null) on success doesn't wipe the failure message we're
      // about to set.
      await reload();
      if (failCount === 0) {
        setNotice(`Bulk ${action}: ${okCount} item${okCount === 1 ? '' : 's'} processed`);
      } else {
        const firstErr = result.failed[0]?.error ?? 'unknown';
        setNotice(`Bulk ${action}: ${okCount} succeeded`);
        setError(`${failCount} item${failCount === 1 ? '' : 's'} failed (first: ${firstErr})`);
      }
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? `Bulk ${action} failed`);
    }
  }

  function handleBulkSnooze(label: string) {
    const opt = SNOOZE_OPTIONS.find((o) => o.label === label);
    if (!opt) return;
    const untilUtc = new Date(Date.now() + opt.deltaMs).toISOString();
    setBulkSnoozeLabel(label);
    void runBulk('snooze', { snoozeUntilUtc: untilUtc });
  }

  function handleBulkAssign(userId: number) {
    setBulkAssignUserId(String(userId));
    void runBulk('assign', { assignToUserId: userId });
  }

  async function handleRowAssign(id: number, userId: number) {
    setNotice(null);
    setError(null);
    try {
      await assignWorkItem(id, userId);
      const name = assignableUsers.find((u) => u.id === userId);
      setNotice(`Assigned #${id} to ${name ? formatUserName(name) : `user ${userId}`}`);
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not assign item');
    }
  }

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
    setSelected(new Set());
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

      {/* Filter chips + saved-filter row */}
      <div
        role="region"
        aria-label="Inbox filters"
        style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
          const active = filter.priority?.includes(p) ?? false;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setFilter((prev) => ({
                ...prev,
                priority: active
                  ? prev.priority?.filter((x) => x !== p)
                  : [...(prev.priority ?? []), p],
              }))}
              style={chipStyle(active)}
              aria-pressed={active}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setFilter((prev) => ({ ...prev, overdueOnly: !prev.overdueOnly }))}
          style={chipStyle(filter.overdueOnly ?? false, '#f59e0b')}
          aria-pressed={filter.overdueOnly ?? false}
        >
          overdue
        </button>

        <span style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />

        {savedFilters.map((sf) => {
          const active = activeFilterId === sf.id;
          return (
            <span key={sf.id} style={{ display: 'inline-flex', gap: 2 }}>
              <button
                type="button"
                onClick={() => applyFilter(sf)}
                style={chipStyle(active, '#8b5cf6')}
                aria-pressed={active}
              >
                {sf.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFilter(sf.id)}
                style={{
                  background: 'transparent', border: '1px solid #cbd5e1',
                  borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
                  fontSize: 12, color: '#64748b',
                }}
                aria-label={`Delete saved filter ${sf.name}`}
              >
                ×
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={handleSaveCurrentFilter}
          style={{
            background: 'transparent', border: '1px dashed #cbd5e1',
            borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
            fontSize: 12, color: '#475569',
          }}
          disabled={
            !(filter.priority?.length || filter.type?.length || filter.overdueOnly)
          }
        >
          + Save current filter
        </button>

        {(filter.priority?.length || filter.overdueOnly || activeFilterId) ? (
          <button
            type="button"
            onClick={clearFilter}
            style={{
              background: 'transparent', border: 'none', padding: '4px 8px',
              cursor: 'pointer', color: '#64748b', fontSize: 12,
            }}
          >
            Clear filters
          </button>
        ) : null}
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

      {/* Bulk action toolbar — visible only with selection */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: 12,
            marginBottom: 12,
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: 6,
          }}
        >
          <strong>{selected.size} selected</strong>
          <button
            type="button"
            onClick={() => runBulk('claim')}
            style={btnStyle('primary')}
          >
            Claim all
          </button>
          <button
            type="button"
            onClick={() => runBulk('complete')}
            style={btnStyle('success')}
          >
            Complete all
          </button>
          <select
            value={bulkSnoozeLabel}
            onChange={(e) => {
              if (e.target.value) handleBulkSnooze(e.target.value);
            }}
            style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
            aria-label="Snooze all selected"
          >
            <option value="">Snooze all…</option>
            {SNOOZE_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>{o.label}</option>
            ))}
          </select>
          <select
            value={bulkAssignUserId}
            onChange={(e) => {
              const uid = Number(e.target.value);
              if (uid > 0) handleBulkAssign(uid);
            }}
            style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
            aria-label="Assign all selected to"
            disabled={assignableUsers.length === 0}
          >
            <option value="">Assign all to…</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{formatUserName(u)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{ ...btnStyle('default'), marginLeft: 'auto' }}
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b' }}>Loading…</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ color: '#64748b', padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
          🎉 Inbox zero. Nothing assigned to you right now.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px', width: 24 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all items"
                />
              </th>
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
            {filteredItems.map((item) => {
              const overdue = isOverdue(item, now);
              const snoozed = item.snoozeUntilUtc && new Date(item.snoozeUntilUtc) > now;
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: selected.has(item.id) ? '#eff6ff' : undefined,
                  }}
                >
                  <td style={{ padding: '8px 6px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Select item ${item.id}`}
                    />
                  </td>
                  <td style={{ padding: '8px 6px' }}>{priorityBadge(item.priority)}</td>
                  <td style={{ padding: '8px 6px' }}>{typeChip(item.type)}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <button
                      type="button"
                      onClick={() => setDrawerItem(item)}
                      style={{
                        background: 'transparent', border: 'none', padding: 0,
                        cursor: 'pointer', color: '#0f172a', textAlign: 'left',
                        textDecoration: 'underline', textDecorationColor: '#cbd5e1',
                        textUnderlineOffset: 3, font: 'inherit',
                      }}
                      aria-label={`Open details for item ${item.id}`}
                    >
                      {item.description}
                    </button>
                  </td>
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
                    {assignableUsers.length > 0 && (
                      <select
                        onChange={(e) => {
                          const uid = Number(e.target.value);
                          if (uid > 0) void handleRowAssign(item.id, uid);
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
                          maxWidth: 110,
                        }}
                        aria-label={`Assign item ${item.id} to`}
                      >
                        <option value="" disabled>Assign…</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>{formatUserName(u)}</option>
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

      {drawerItem && (
        <InboxItemDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
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

function chipStyle(active: boolean, accent = '#0ea5e9') {
  return {
    padding: '4px 10px',
    background: active ? accent : '#fff',
    color: active ? '#fff' : '#475569',
    border: `1px solid ${active ? accent : '#cbd5e1'}`,
    borderRadius: 999,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  };
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
