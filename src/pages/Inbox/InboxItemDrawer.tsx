import { useEffect, useState } from 'react';
import {
  getWorkItemEvents,
  getWorkItemTiming,
  formatDuration,
  type WorkItemTiming,
  type WorkQueueItem,
  type WorkQueueItemEvent,
} from '@/api/billing';

// Per-event-type glyph background colour. Data-driven, so kept as an inline
// style on the avatar circle below.
const EVENT_COLORS: Record<string, string> = {
  created: '#64748b',
  claimed: '#0ea5e9',
  assigned: '#8b5cf6',
  snoozed: '#f59e0b',
  woken: '#0ea5e9',
  completed: '#16a34a',
  deferred: '#94a3b8',
  'priority-changed': '#dc2626',
};

function eventGlyph(eventType: string): string {
  // Single-char glyphs keep the timeline scanable at-a-glance. ASCII only
  // so they render predictably across fonts.
  switch (eventType) {
    case 'created':          return '+';
    case 'claimed':          return 'C';
    case 'assigned':         return 'A';
    case 'snoozed':          return 'z';
    case 'woken':            return '!';
    case 'completed':        return 'X';
    case 'deferred':         return '-';
    case 'priority-changed': return '*';
    default: return '·';
  }
}

function formatActor(ev: WorkQueueItemEvent): string {
  if (ev.actorUserId === 0 || ev.actorEmail === 'system') return 'system';
  return ev.actorEmail || `user #${ev.actorUserId}`;
}

function formatTimestamp(iso: string): string {
  // "2026-05-21 14:32 UTC" — terse enough for a dense timeline.
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
       + ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export interface InboxItemDrawerProps {
  item: WorkQueueItem;
  onClose: () => void;
}

/**
 * Right-edge slide-out drawer showing one work queue item's metadata plus
 * its chronological event log. Read-only — actions stay in the row toolbar
 * so the drawer is purely informational. Click the backdrop or the close
 * button to dismiss.
 */
export function InboxItemDrawer({ item, onClose }: InboxItemDrawerProps) {
  const [events, setEvents] = useState<WorkQueueItemEvent[] | null>(null);
  const [timing, setTiming] = useState<WorkItemTiming | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Two independent reads. Timing populates a small badge strip while
    // events populate the longer activity list — they're parallel so a
    // slow event-list load doesn't delay the badges.
    getWorkItemEvents(item.id)
      .then((evs) => { if (!cancelled) setEvents(evs); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load timeline');
      });
    getWorkItemTiming(item.id)
      .then((t) => { if (!cancelled) setTiming(t); })
      .catch(() => { /* timing badges stay hidden */ });
    return () => { cancelled = true; };
  }, [item.id]);

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-navy-950/35"
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Work item #${item.id} detail`}
        className="fixed bottom-0 right-0 top-0 z-[41] w-[480px] overflow-y-auto bg-white p-6 shadow-[-4px_0_24px_rgba(0,0,0,0.15)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">Item #{item.id}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail drawer"
            className="cursor-pointer border-none bg-transparent p-1 text-xl text-slate-500"
          >
            ×
          </button>
        </div>

        <div className="mb-5 text-[13px]">
          <div className="mb-1">
            <strong>Type:</strong> {item.type}
            <span className="ml-3">
              <strong>Priority:</strong> {item.priority}
            </span>
            <span className="ml-3">
              <strong>Status:</strong> {item.status}
            </span>
          </div>
          <div className="mb-1 text-slate-600">{item.description}</div>
          {(item.claimId || item.patientId) && (
            <div className="text-xs text-slate-500">
              {item.claimId && <span>Claim #{item.claimId}</span>}
              {item.claimId && item.patientId && ' · '}
              {item.patientId && <span>Patient #{item.patientId}</span>}
            </div>
          )}
          {item.dueDate && (
            <div className="text-xs text-slate-500">
              Due: {item.dueDate.slice(0, 10)}
            </div>
          )}
          {item.snoozeUntilUtc && new Date(item.snoozeUntilUtc) > new Date() && (
            <div className="text-xs text-accent-500">
              Snoozed until {item.snoozeUntilUtc.slice(0, 16).replace('T', ' ')} UTC
            </div>
          )}
        </div>

        {/* Timing badges — render only when a duration is known. */}
        {timing && (timing.timeToClaim || timing.timeToComplete) && (
          <div
            aria-label="Item timing"
            className="mb-4 flex gap-3 rounded-md bg-slate-50 p-2.5 text-[13px]"
          >
            {timing.timeToClaim && (
              <span>
                <span className="block text-[11px] text-slate-500">Claimed in</span>
                <strong className="text-slate-900">{formatDuration(timing.timeToClaim)}</strong>
              </span>
            )}
            {timing.timeToComplete && (
              <span>
                <span className="block text-[11px] text-slate-500">Completed in</span>
                <strong className="text-success">{formatDuration(timing.timeToComplete)}</strong>
              </span>
            )}
          </div>
        )}

        <h3 className="mb-2 mt-0 text-sm font-semibold text-slate-700">
          Activity
        </h3>

        {error && (
          <div role="alert" className="rounded-md bg-red-100 px-2.5 py-2.5 text-[13px] text-red-800">
            {error}
          </div>
        )}
        {!error && events === null && (
          <div className="text-[13px] text-slate-500">Loading…</div>
        )}
        {!error && events !== null && events.length === 0 && (
          <div className="text-[13px] text-slate-500">
            No activity recorded yet.
          </div>
        )}
        {!error && events !== null && events.length > 0 && (
          <ul className="m-0 list-none p-0">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex gap-3 border-b border-slate-100 py-2"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-[0_0_24px] items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ background: EVENT_COLORS[ev.eventType] ?? '#64748b' }}
                >
                  {eventGlyph(ev.eventType)}
                </span>
                <div className="flex-1 text-[13px]">
                  <div className="text-slate-900">
                    <strong>{ev.eventType}</strong> · {ev.description}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {formatActor(ev)} · {formatTimestamp(ev.occurredAtUtc)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
