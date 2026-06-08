import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface SummaryEnvelope {
  data: {
    summary: string;
    inputTokens: number;
    outputTokens: number;
    correlationId: string;
  };
}

interface VisitNoteSummaryModalProps {
  visitId: number;
  visitLabel: string;
  onClose: () => void;
}

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; summary: string }
  | { kind: 'error'; message: string; canRetry: boolean };

function mapError(status: number | undefined): { message: string; canRetry: boolean } {
  switch (status) {
    case 404:
      return { message: 'Visit note not found.', canRetry: false };
    case 429:
      return {
        message: 'Too many summarization requests recently. Please try again in a moment.',
        canRetry: true,
      };
    case 503:
      return {
        message: 'The AI assistant is not available for your organization right now.',
        canRetry: false,
      };
    case 502:
      return {
        message: "Couldn't reach the AI service. Try again shortly.",
        canRetry: true,
      };
    default:
      return { message: 'Something went wrong generating the summary.', canRetry: true };
  }
}

export function VisitNoteSummaryModal({
  visitId,
  visitLabel,
  onClose,
}: VisitNoteSummaryModalProps) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: 'loading' });
    apiClient
      .post<SummaryEnvelope>(`/clinician/visits/${visitId}/summarize`)
      .then((res) => {
        if (!cancelled) {
          setStatus({ kind: 'ready', summary: res.data.data.summary });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
        const { message, canRetry } = mapError(status);
        setStatus({ kind: 'error', message, canRetry });
      });
    return () => {
      cancelled = true;
    };
  }, [visitId, attempt]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-summary-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <h2 id="visit-summary-title" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          AI summary
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{visitLabel}</p>

        {status.kind === 'loading' && (
          <p
            data-testid="summary-loading"
            style={{ fontSize: 14, color: '#475569', padding: '12px 0' }}
          >
            Generating summary…
          </p>
        )}

        {status.kind === 'ready' && (
          <blockquote
            data-testid="summary-text"
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: '#0f172a',
              borderLeft: '3px solid #0d9488',
              padding: '4px 0 4px 12px',
              margin: '8px 0 16px',
              background: '#f0fdfa',
            }}
          >
            {status.summary}
          </blockquote>
        )}

        {status.kind === 'error' && (
          <div
            data-testid="summary-error"
            role="alert"
            style={{
              fontSize: 14,
              color: '#7f1d1d',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            {status.message}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
          Summary is AI-generated for handoff use. Verify against the note before relying on it.
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {status.kind === 'error' && status.canRetry && (
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              data-testid="summary-retry"
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            data-testid="summary-close"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#0d9488',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
