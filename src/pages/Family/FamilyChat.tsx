import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

const MAX_QUESTION_LENGTH = 500;

interface ChatTurn {
  /** Stable key for React rendering. */
  id: string;
  question: string;
  /** Either the assistant's answer text, or null while in-flight. */
  answer: string | null;
  /** Translation key for an inline error, when the call failed. */
  errorKey: string | null;
  sources: string[];
}

interface AskResponse {
  data: {
    answer: string;
    sources: string[];
    inputTokens: number;
    outputTokens: number;
  };
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  maxLength?: number;
}

/**
 * Family-portal AI chatbot page.
 *
 * Conversational shape but each turn is an INDEPENDENT call to the
 * backend -- the prompt does not carry previous turns. This is by
 * design: every answer is grounded only in the patient's current data,
 * not in earlier guesses the model may have produced.
 *
 * Risk guardrails surfaced in the UI:
 *   - non-dismissable amber disclaimer banner at the top
 *   - per-turn "What I used to answer" disclosure showing which
 *     patient-data buckets were fed to the model (medications / visits
 *     / care-plan / patient-summary)
 *   - "Always verify with your care team" footer attached to each answer
 *   - friendly fallbacks for opt-in / rate-limit / provider-unreachable
 */
export function FamilyChat() {
  const { session } = usePortalAuth();
  const { t, i18n } = useTranslation();
  const patientId = session?.kind === 'family-member' ? session.patientId : null;

  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom doesn't implement scrollIntoView; guard so tests don't blow up.
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [turns]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || submitting || patientId == null) return;
    if (trimmed.length > MAX_QUESTION_LENGTH) return;

    const turnId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTurns((prev) => [
      ...prev,
      { id: turnId, question: trimmed, answer: null, errorKey: null, sources: [] },
    ]);
    setQuestion('');
    setSubmitting(true);
    try {
      const res = await familyApi.post<AskResponse>(`/patients/${patientId}/chat`, {
        question: trimmed,
        locale: i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en',
      });
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? { ...turn, answer: res.data.data.answer, sources: res.data.data.sources }
            : turn,
        ),
      );
    } catch (err) {
      const errorKey = mapErrorToKey(err);
      setTurns((prev) =>
        prev.map((turn) => (turn.id === turnId ? { ...turn, errorKey } : turn)),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (patientId == null) {
    return (
      <p role="alert" style={{ padding: 16, color: '#dc2626' }}>
        {t('family.chat.notAuthenticated')}
      </p>
    );
  }

  const charsLeft = MAX_QUESTION_LENGTH - question.length;
  const overLimit = question.length > MAX_QUESTION_LENGTH;

  return (
    <section style={{ padding: 16, maxWidth: 720 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}
      >
        {t('family.chat.title')}
      </h1>

      <div
        role="note"
        style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          color: '#92400e',
          padding: '12px 14px',
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        <strong>{t('family.chat.disclaimerTitle')}</strong>
        <br />
        {t('family.chat.disclaimerBody')}
      </div>

      <div data-testid="chat-log" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {turns.length === 0 && (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>{t('family.chat.empty')}</p>
        )}
        {turns.map((turn) => (
          <div key={turn.id} data-testid="chat-turn" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                alignSelf: 'flex-end',
                background: '#dbeafe',
                color: '#1e3a8a',
                padding: '10px 14px',
                borderRadius: 12,
                maxWidth: '85%',
                fontSize: 14,
              }}
            >
              {turn.question}
            </div>
            <div
              style={{
                alignSelf: 'flex-start',
                background: '#fff',
                border: '1px solid #e2e8f0',
                padding: '10px 14px',
                borderRadius: 12,
                maxWidth: '85%',
                fontSize: 14,
                color: '#1e293b',
              }}
            >
              {turn.answer != null ? (
                <>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{turn.answer}</p>
                  {turn.sources.length > 0 && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>
                      <span style={{ fontWeight: 500 }}>
                        {t('family.chat.sourcesLabel')}
                      </span>{' '}
                      {turn.sources
                        .map((s) => t(`family.chat.sources.${s.replace('-', '_')}` as const, s))
                        .join(', ')}
                    </p>
                  )}
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                    {t('family.chat.verifyFooter')}
                  </p>
                </>
              ) : turn.errorKey != null ? (
                <p role="alert" style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>
                  {t(turn.errorKey)}
                </p>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>
                  {t('common.loading')}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          data-testid="family-chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('family.chat.placeholder')}
          rows={3}
          maxLength={MAX_QUESTION_LENGTH + 50}
          aria-label={t('family.chat.inputLabel')}
          style={{
            padding: '10px 12px',
            border: `1px solid ${overLimit ? '#dc2626' : '#cbd5e1'}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: overLimit ? '#dc2626' : '#94a3b8' }}>
            {charsLeft >= 0
              ? t('family.chat.charsLeft', { n: charsLeft })
              : t('family.chat.tooLong')}
          </span>
          <button
            type="submit"
            data-testid="family-chat-submit"
            disabled={submitting || overLimit || question.trim().length === 0}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: submitting ? '#94a3b8' : '#0ea5e9',
              color: '#fff',
              borderRadius: 6,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {submitting ? t('family.chat.sending') : t('family.chat.send')}
          </button>
        </div>
      </form>
    </section>
  );
}

function mapErrorToKey(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { status?: number; data?: ApiErrorBody } }).response;
    if (response?.status === 429) return 'family.chat.errorRateLimited';
    if (response?.status === 503) return 'family.chat.errorNotAvailable';
    if (response?.status === 502) return 'family.chat.errorUnreachable';
    if (response?.status === 400 && response.data?.error === 'question_too_long')
      return 'family.chat.tooLong';
  }
  return 'family.chat.errorGeneric';
}
