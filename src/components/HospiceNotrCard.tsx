import { useEffect, useState } from 'react';
import {
  getNotrForElection,
  submitNotr,
  type NoticeOfTerminationOrRevocation,
} from '@/api/hospice';

interface Props {
  electionId: number;
}

function statusColor(status: string): string {
  switch (status) {
    case 'Submitted':
      return '#15803d';
    case 'ManualOverride':
      return '#0e7490';
    case 'Late':
      return '#b91c1c';
    case 'Pending':
    default:
      return '#d97706';
  }
}

export function HospiceNotrCard({ electionId }: Props) {
  const [notr, setNotr] = useState<NoticeOfTerminationOrRevocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const dto = await getNotrForElection(electionId);
      setNotr(dto);
    } catch {
      setError('Failed to load NOTR.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(electionId)) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  async function handleSubmitClearinghouse() {
    if (!notr) return;
    setBusy(true);
    setActionError(null);
    try {
      await submitNotr(notr.id, { mode: 'Clearinghouse', manualDocumentUrl: null });
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to submit NOTR.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitManual() {
    if (!notr) return;
    if (!manualUrl.trim()) {
      setActionError('Document URL is required for manual submission.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await submitNotr(notr.id, { mode: 'Manual', manualDocumentUrl: manualUrl.trim() });
      setManualUrl('');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to submit NOTR.'));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div role="status">Loading NOTR…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!notr) {
    return (
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 16,
          background: '#f8fafc',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          Notice of Termination/Revocation
        </h3>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          No NOTR on file. One will be created automatically when this election is
          revoked, or you can create it manually when a transfer/discharge/death
          occurs.
        </p>
      </section>
    );
  }

  const canSubmit = notr.status === 'Pending';

  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        Notice of Termination/Revocation (8XB)
      </h3>
      <p style={{ marginBottom: 4 }}>
        Status:{' '}
        <strong style={{ color: statusColor(notr.status) }}>{notr.status}</strong>
        {' · '}
        Reason: <strong>{notr.reason}</strong>
      </p>
      <p style={{ color: '#64748b', marginBottom: 4 }}>
        Event {notr.eventDate} · Deadline {notr.deadlineDate}
        {notr.daysUntilDeadline >= 0
          ? ` · ${notr.daysUntilDeadline} days remaining`
          : ` · ${-notr.daysUntilDeadline} days overdue`}
      </p>
      {notr.submittedAt && (
        <p style={{ color: '#64748b' }}>
          Submitted at {new Date(notr.submittedAt).toLocaleString()}
        </p>
      )}
      {notr.documentUrl && (
        <p>
          <a href={notr.documentUrl} target="_blank" rel="noreferrer">
            Document
          </a>
        </p>
      )}
      {actionError && (
        <div role="alert" style={{ color: '#b91c1c', marginTop: 8 }}>
          {actionError}
        </div>
      )}
      {canSubmit && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <button onClick={handleSubmitClearinghouse} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit via Clearinghouse'}
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              placeholder="Manual document URL"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={handleSubmitManual} disabled={busy}>
              {busy ? 'Saving…' : 'Manual Override'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    fallback
  );
}
