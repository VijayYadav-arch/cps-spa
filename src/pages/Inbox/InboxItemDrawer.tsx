import { useEffect, useState } from 'react';
import {
  getWorkItemEvents,
  getWorkItemTiming,
  formatDuration,
  type WorkItemTiming,
  type WorkQueueItem,
  type WorkQueueItemEvent,
} from '@/api/billing';

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
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)',
          zIndex: 40,
        }}
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Work item #${item.id} detail`}
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 480,
          background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          padding: 24, overflowY: 'auto', zIndex: 41,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Item #{item.id}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail drawer"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#64748b', padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 20, fontSize: 13 }}>
          <div style={{ marginBottom: 4 }}>
            <strong>Type:</strong> {item.type}
            <span style={{ marginLeft: 12 }}>
              <strong>Priority:</strong> {item.priority}
            </span>
            <span style={{ marginLeft: 12 }}>
              <strong>Status:</strong> {item.status}
            </span>
          </div>
          <div style={{ marginBottom: 4, color: '#475569' }}>{item.description}</div>
          {(item.claimId || item.patientId) && (
            <div style={{ color: '#64748b', fontSize: 12 }}>
              {item.claimId && <span>Claim #{item.claimId}</span>}
              {item.claimId && item.patientId && ' · '}
              {item.patientId && <span>Patient #{item.patientId}</span>}
            </div>
          )}
          {item.dueDate && (
            <div style={{ color: '#64748b', fontSize: 12 }}>
              Due: {item.dueDate.slice(0, 10)}
            </div>
          )}
          {item.snoozeUntilUtc && new Date(item.snoozeUntilUtc) > new Date() && (
            <div style={{ color: '#f59e0b', fontSize: 12 }}>
              Snoozed until {item.snoozeUntilUtc.slice(0, 16).replace('T', ' ')} UTC
            </div>
          )}
        </div>

        {/* Timing badges — render only when a duration is known. */}
        {timing && (timing.timeToClaim || timing.timeToComplete) && (
          <div
            aria-label="Item timing"
            style={{
              display: 'flex', gap: 12, marginBottom: 16, fontSize: 13,
              background: '#f8fafc', padding: 10, borderRadius: 6,
            }}
          >
            {timing.timeToClaim && (
              <span>
                <span style={{ color: '#64748b', fontSize: 11, display: 'block' }}>Claimed in</span>
                <strong style={{ color: '#0f172a' }}>{formatDuration(timing.timeToClaim)}</strong>
              </span>
            )}
            {timing.timeToComplete && (
              <span>
                <span style={{ color: '#64748b', fontSize: 11, display: 'block' }}>Completed in</span>
                <strong style={{ color: '#16a34a' }}>{formatDuration(timing.timeToComplete)}</strong>
              </span>
            )}
          </div>
        )}

        <h3 style={{ fontSize: 14, color: '#334155', marginBottom: 8, marginTop: 0 }}>
          Activity
        </h3>

        {error && (
          <div role="alert" style={{ color: '#991b1b', background: '#fee2e2', padding: 10, borderRadius: 6, fontSize: 13 }}>
            {error}
          </div>
        )}
        {!error && events === null && (
          <div style={{ color: '#64748b', fontSize: 13 }}>Loading…</div>
        )}
        {!error && events !== null && events.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 13 }}>
            No activity recorded yet.
          </div>
        )}
        {!error && events !== null && events.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {events.map((ev) => (
              <li
                key={ev.id}
                style={{
                  display: 'flex', gap: 12, padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: '0 0 24px', width: 24, height: 24, borderRadius: 12,
                    background: EVENT_COLORS[ev.eventType] ?? '#64748b',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {eventGlyph(ev.eventType)}
                </span>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div style={{ color: '#0f172a' }}>
                    <strong>{ev.eventType}</strong> · {ev.description}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
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
