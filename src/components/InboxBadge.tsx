import { useEffect, useState } from 'react';
import { getInbox, type WorkQueueStats } from '@/api/billing';

const POLL_INTERVAL_MS = 60_000;

/**
 * Small count + color-coded dot rendered inside the Inbox nav leaf.
 * Polls /api/v2/billing/work-queue/inbox?mine=true on a 60-second
 * cadence — light enough to fit the use case (10–30 stats requests
 * per hour per active staff user) and avoids needing a websocket.
 *
 * Color escalates with severity:
 * - red dot when critical &gt; 0
 * - amber dot when overdue &gt; 0
 * - gray badge when only routine work pending
 * - nothing when the inbox is empty
 *
 * Fails silently — a 401/403 from a user without the `billing:queue`
 * policy must not break the nav.
 */
export function InboxBadge() {
  const [stats, setStats] = useState<WorkQueueStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await getInbox(true);
        if (!cancelled) setStats(res.stats);
      } catch {
        // Suppress — user may not have the work-queue permission;
        // the badge is informational, not load-bearing.
      }
    }
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!stats) return null;
  // Defensive: if the API ever returns partial/empty stats, treat missing
  // counts as 0 so the badge never renders "NaN".
  const total = (stats.pending ?? 0) + (stats.inProgress ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;

  const isCritical = stats.critical > 0;
  const isOverdue = !isCritical && stats.overdue > 0;
  const color = isCritical ? '#dc2626' : isOverdue ? '#f59e0b' : '#64748b';

  return (
    <span
      aria-label={`${total} open work items${isCritical ? `, ${stats.critical} critical` : ''}${isOverdue ? `, ${stats.overdue} overdue` : ''}`}
      style={{
        display: 'inline-block',
        minWidth: 20,
        padding: '0 6px',
        marginLeft: 8,
        background: color,
        color: '#fff',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: '18px',
      }}
    >
      {total > 99 ? '99+' : total}
    </span>
  );
}
