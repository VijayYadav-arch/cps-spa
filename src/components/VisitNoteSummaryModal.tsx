import { useEffect, useState } from 'react';
import { consumeAiStream, type AiStreamErrorEvent } from '@/api/aiStream';
import { staffAuthHeaders } from '@/api/staffAuthHeaders';

interface SummaryDoneEvent {
  summary: string;
  inputTokens: number;
  outputTokens: number;
  correlationId: string;
}

interface VisitNoteSummaryModalProps {
  visitId: number;
  visitLabel: string;
  onClose: () => void;
}

type Status =
  | { kind: 'streaming'; text: string }
  | { kind: 'ready'; summary: string }
  | { kind: 'error'; message: string; canRetry: boolean };

function mapError(error: AiStreamErrorEvent): { message: string; canRetry: boolean } {
  switch (error.error) {
    case 'not_found':
      return { message: 'Visit note not found.', canRetry: false };
    case 'rate_limited':
      return {
        message: 'Too many summarization requests recently. Please try again in a moment.',
        canRetry: true,
      };
    case 'ai_not_available':
      return {
        message: 'The AI assistant is not available for your organization right now.',
        canRetry: false,
      };
    case 'ai_provider_unreachable':
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
  const [status, setStatus] = useState<Status>({ kind: 'streaming', text: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    let assembled = '';
    setStatus({ kind: 'streaming', text: '' });

    (async () => {
      try {
        const headers = await staffAuthHeaders();
        await consumeAiStream<SummaryDoneEvent>(
          {
            url: `/api/v2/clinician/visits/${visitId}/summarize/stream`,
            headers,
            signal: ac.signal,
          },
          {
            onDelta: (text) => {
              assembled += text;
              setStatus({ kind: 'streaming', text: assembled });
            },
            onDone: (event) => {
              // The server-side helper may flush a slightly polished version
              // of the assembled text (trimmed, fallback substituted).
              // Trust the `done` event as the authoritative result.
              setStatus({ kind: 'ready', summary: event.summary });
            },
            onError: (event) => {
              const mapped = mapError(event);
              setStatus({ kind: 'error', message: mapped.message, canRetry: mapped.canRetry });
            },
          },
        );
      } catch {
        setStatus({
          kind: 'error',
          message: 'Something went wrong generating the summary.',
          canRetry: true,
        });
      }
    })();

    return () => ac.abort();
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

        {status.kind === 'streaming' && status.text.length === 0 && (
          <p
            data-testid="summary-loading"
            style={{ fontSize: 14, color: '#475569', padding: '12px 0' }}
          >
            Generating summary…
          </p>
        )}

        {(status.kind === 'streaming' && status.text.length > 0) ||
        status.kind === 'ready' ? (
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
            {status.kind === 'ready' ? status.summary : status.text}
            {status.kind === 'streaming' && (
              <span
                data-testid="streaming-cursor"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 14,
                  marginLeft: 2,
                  background: '#0d9488',
                  verticalAlign: 'middle',
                  animation: 'visit-note-summary-blink 1s steps(2, start) infinite',
                }}
              />
            )}
          </blockquote>
        ) : null}

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
