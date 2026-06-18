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
import { NewWorkItemDialog } from '@/pages/Inbox/NewWorkItemDialog';

function formatUserName(u: AssignableUser): string {
  const full = `${u.firstName} ${u.lastName}`.trim();
  return full || u.email;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-slate-100 text-slate-600',
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

const SMALL_SELECT =
  'rounded border border-slate-300 bg-white px-2 py-1 text-xs';

function priorityBadge(p: string) {
  const c = PRIORITY_COLORS[p] ?? PRIORITY_COLORS.medium;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${c}`}
    >
      {p}
    </span>
  );
}

function typeChip(t: string) {
  return (
    <span
      className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
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
  const [showNewDialog, setShowNewDialog] = useState(false);
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
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="mb-4 mt-0 text-2xl">Inbox</h1>
        <button
          type="button"
          onClick={() => setShowNewDialog(true)}
          className="btn-primary"
        >
          + New work item
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-4 flex flex-wrap gap-3">
          {/* Coalesce missing counts to 0 so the "Open" badge never renders NaN (L10). */}
          {statCard('Open', (stats.pending ?? 0) + (stats.inProgress ?? 0))}
          {statCard('Critical', stats.critical ?? 0, (stats.critical ?? 0) > 0 ? 'text-error' : undefined)}
          {statCard('Overdue', stats.overdue ?? 0, (stats.overdue ?? 0) > 0 ? 'text-accent-500' : undefined)}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1">
        {(['mine', 'all'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              tab === t
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t === 'mine' ? 'My work' : 'All open'}
          </button>
        ))}
      </div>

      {/* Filter chips + saved-filter row */}
      <div
        role="region"
        aria-label="Inbox filters"
        className="mb-4 flex flex-wrap items-center gap-1.5"
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
              className={chipClass(active, 'teal')}
              aria-pressed={active}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setFilter((prev) => ({ ...prev, overdueOnly: !prev.overdueOnly }))}
          className={chipClass(filter.overdueOnly ?? false, 'amber')}
          aria-pressed={filter.overdueOnly ?? false}
        >
          overdue
        </button>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        {savedFilters.map((sf) => {
          const active = activeFilterId === sf.id;
          return (
            <span key={sf.id} className="inline-flex gap-0.5">
              <button
                type="button"
                onClick={() => applyFilter(sf)}
                className={chipClass(active, 'violet')}
                aria-pressed={active}
              >
                {sf.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFilter(sf.id)}
                className="rounded border border-slate-300 bg-transparent px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
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
          className="rounded border border-dashed border-slate-300 bg-transparent px-2.5 py-1 text-xs text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="border-none bg-transparent px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {notice && (
        <div role="status" className="mb-3 rounded-md bg-green-100 px-2.5 py-2.5 text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-3 rounded-md bg-red-100 px-2.5 py-2.5 text-red-800">
          {error}
        </div>
      )}

      {/* Bulk action toolbar — visible only with selection */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="mb-3 flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 p-3"
        >
          <strong>{selected.size} selected</strong>
          <button
            type="button"
            onClick={() => runBulk('claim')}
            className={btnClass('primary')}
          >
            Claim all
          </button>
          <button
            type="button"
            onClick={() => runBulk('complete')}
            className={btnClass('success')}
          >
            Complete all
          </button>
          <select
            value={bulkSnoozeLabel}
            onChange={(e) => {
              if (e.target.value) handleBulkSnooze(e.target.value);
            }}
            className={SMALL_SELECT}
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
            className={SMALL_SELECT}
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
            className={`${btnClass('default')} ml-auto`}
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
          🎉 Inbox zero. Nothing assigned to you right now.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="w-6 px-2 py-3">
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
                <th className="px-2 py-3">Priority</th>
                <th className="px-2 py-3">Type</th>
                <th className="px-2 py-3">Description</th>
                <th className="px-2 py-3">Linked</th>
                <th className="px-2 py-3">Due</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const overdue = isOverdue(item, now);
                const snoozed = item.snoozeUntilUtc && new Date(item.snoozeUntilUtc) > now;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 ${
                      selected.has(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`Select item ${item.id}`}
                      />
                    </td>
                    <td className="px-2 py-2">{priorityBadge(item.priority)}</td>
                    <td className="px-2 py-2">{typeChip(item.type)}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setDrawerItem(item)}
                        className="cursor-pointer border-none bg-transparent p-0 text-left font-medium text-teal-700 underline decoration-slate-300 underline-offset-[3px] hover:decoration-teal-700"
                        aria-label={`Open details for item ${item.id}`}
                      >
                        {item.description}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {item.claimId && (
                        <Link to={`/claims/${item.claimId}`} className="mr-2 font-medium text-teal-700 hover:underline">
                          Claim #{item.claimId}
                        </Link>
                      )}
                      {item.patientId && (
                        <Link to={`/patients/${item.patientId}`} className="font-medium text-teal-700 hover:underline">
                          Patient #{item.patientId}
                        </Link>
                      )}
                    </td>
                    <td className={`px-2 py-2 ${overdue ? 'font-semibold text-error' : 'text-slate-600'}`}>
                      {item.dueDate ? item.dueDate.slice(0, 10) : '—'}
                      {overdue && ' (overdue)'}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {item.status}
                      {snoozed && <span className="text-slate-500"> · snoozed</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {!item.assignedTo && (
                        <button
                          type="button"
                          onClick={() => handleClaim(item.id)}
                          className={btnClass('primary')}
                        >
                          Claim
                        </button>
                      )}
                      {snoozed ? (
                        <button
                          type="button"
                          onClick={() => handleWake(item.id)}
                          className={btnClass('default')}
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
                          className={`${SMALL_SELECT} mr-1`}
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
                          className={`${SMALL_SELECT} mr-1 max-w-[110px]`}
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
                        className={btnClass('success')}
                      >
                        Complete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {drawerItem && (
        <InboxItemDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
      )}
      {showNewDialog && (
        <NewWorkItemDialog
          onClose={() => setShowNewDialog(false)}
          onCreated={(created) => {
            setShowNewDialog(false);
            setNotice(`Created work item #${created.id}`);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function statCard(label: string, value: number, toneClass = 'text-navy-900') {
  return (
    <div className="card-hover min-w-[120px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

type ChipAccent = 'teal' | 'amber' | 'violet';

function chipClass(active: boolean, accent: ChipAccent) {
  const activeByAccent: Record<ChipAccent, string> = {
    teal: 'border-teal-600 bg-teal-600 text-white',
    amber: 'border-amber-500 bg-amber-500 text-white',
    violet: 'border-violet-500 bg-violet-500 text-white',
  };
  const base = 'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors';
  return active
    ? `${base} ${activeByAccent[accent]}`
    : `${base} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`;
}

function btnClass(kind: 'primary' | 'success' | 'default') {
  const byKind = {
    primary: 'border-teal-600 bg-teal-600 text-white hover:brightness-110',
    success: 'border-success bg-success text-white hover:brightness-110',
    default: 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
  }[kind];
  return `ml-1 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${byKind}`;
}
