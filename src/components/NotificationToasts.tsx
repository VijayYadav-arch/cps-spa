import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  pollInboxNotifications,
  acknowledgeInboxNotifications,
  type InboxNotification,
} from '@/api/billing';

const POLL_INTERVAL_MS = 30_000;
const AUTO_DISMISS_MS = 10_000;

type ToastEntry = InboxNotification & { _key: string };

/**
 * Mounted once at the Layout level, this component polls the inbox
 * notification endpoint every 30s and shows ephemeral toasts for any
 * assignments past the user's last-seen bookmark. Clicking a toast
 * navigates to /inbox; auto-dismisses after 10s.
 *
 * The component acks the bookmark to the server immediately on poll
 * success — once the toasts have been rendered we treat them as
 * "seen" even if the user dismisses them without clicking. The
 * tradeoff: missed network or backgrounded tab loses the toast but
 * the work item still appears in /inbox. That's the right call vs.
 * spam-when-you-return-from-lunch.
 *
 * Fails silently. A 401/403 turns into "no toasts ever" — never breaks
 * the layout.
 */
export function NotificationToasts() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const seenKeys = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const resp = await pollInboxNotifications();
        if (cancelled) return;

        const fresh: ToastEntry[] = [];
        for (const n of resp.notifications) {
          const key = `${n.itemId}-${n.occurredAtUtc}`;
          if (seenKeys.current.has(key)) continue;
          seenKeys.current.add(key);
          fresh.push({ ...n, _key: key });
        }
        if (fresh.length > 0) {
          setToasts((prev) => [...prev, ...fresh]);
          // Auto-dismiss each toast after AUTO_DISMISS_MS
          for (const t of fresh) {
            window.setTimeout(() => {
              setToasts((prev) => prev.filter((x) => x._key !== t._key));
            }, AUTO_DISMISS_MS);
          }
        }
        // Ack to the server's reported "now" so the next poll won't
        // re-surface what we just rendered.
        await acknowledgeInboxNotifications(resp.serverNowUtc);
      } catch {
        /* silent */
      }
    }

    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Inbox notifications"
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 60,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {toasts.map((t) => (
        <button
          key={t._key}
          type="button"
          onClick={() => {
            setToasts((prev) => prev.filter((x) => x._key !== t._key));
            navigate('/inbox');
          }}
          style={{
            display: 'block', textAlign: 'left',
            background: '#0f172a', color: '#f1f5f9',
            border: 'none', padding: '12px 16px', borderRadius: 8,
            minWidth: 280, maxWidth: 360, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            font: 'inherit',
          }}
        >
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            Assigned to you
            {t.priority === 'critical' && ' · CRITICAL'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {t.description}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            by {t.actorEmail}
          </div>
        </button>
      ))}
    </div>
  );
}
