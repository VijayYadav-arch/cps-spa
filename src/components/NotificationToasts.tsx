import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  pollInboxNotifications,
  acknowledgeInboxNotifications,
  type InboxNotification,
} from '@/api/billing';
import { listAnomalies, type AuditAnomalyAlert } from '@/api/compliance';

const POLL_INTERVAL_MS = 30_000;
const AUTO_DISMISS_MS = 10_000;

type ToastVariant =
  | { kind: 'assignment'; data: InboxNotification }
  | { kind: 'anomaly'; data: AuditAnomalyAlert };

type ToastEntry = { _key: string; variant: ToastVariant };

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
      // Two parallel streams, both fail-silent:
      // - Inbox assignments  (billing:queue users)
      // - Audit anomalies    (compliance:phi_review users)
      // The endpoints will 403 if the user lacks the relevant
      // permission; we swallow and continue with whatever did work.
      const fresh: ToastEntry[] = [];

      try {
        const resp = await pollInboxNotifications();
        if (cancelled) return;
        for (const n of resp.notifications) {
          const key = `assign-${n.itemId}-${n.occurredAtUtc}`;
          if (seenKeys.current.has(key)) continue;
          seenKeys.current.add(key);
          fresh.push({ _key: key, variant: { kind: 'assignment', data: n } });
        }
        // Ack so the next poll won't re-surface what we rendered.
        await acknowledgeInboxNotifications(resp.serverNowUtc);
      } catch {
        /* silent */
      }

      try {
        const resp = await listAnomalies({ status: 'open', limit: 10 });
        if (cancelled) return;
        for (const a of resp.data) {
          const key = `anomaly-${a.id}`;
          if (seenKeys.current.has(key)) continue;
          seenKeys.current.add(key);
          fresh.push({ _key: key, variant: { kind: 'anomaly', data: a } });
        }
      } catch {
        /* silent */
      }

      if (fresh.length > 0) {
        setToasts((prev) => [...prev, ...fresh]);
        for (const t of fresh) {
          window.setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x._key !== t._key));
          }, AUTO_DISMISS_MS);
        }
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
      {toasts.map((t) => {
        const isAnomaly = t.variant.kind === 'anomaly';
        const onClick = () => {
          setToasts((prev) => prev.filter((x) => x._key !== t._key));
          navigate(isAnomaly ? '/compliance/anomalies' : '/inbox');
        };
        return (
          <button
            key={t._key}
            type="button"
            onClick={onClick}
            style={{
              display: 'block', textAlign: 'left',
              background: isAnomaly ? '#7f1d1d' : '#0f172a', color: '#f1f5f9',
              border: 'none', padding: '12px 16px', borderRadius: 8,
              minWidth: 280, maxWidth: 360, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              font: 'inherit',
            }}
          >
            {t.variant.kind === 'assignment' ? (
              <>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  Assigned to you
                  {t.variant.data.priority === 'critical' && ' · CRITICAL'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {t.variant.data.description}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  by {t.variant.data.actorEmail}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 4 }}>
                  Audit anomaly · {t.variant.data.anomalyType}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {t.variant.data.evidence}
                </div>
                <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}>
                  {t.variant.data.userEmail
                    ?? t.variant.data.ipAddress
                    ?? `user ${t.variant.data.userId ?? '?'}`}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
