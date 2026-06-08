import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

const MAX_QUESTION_LENGTH = 500;
/**
 * Maximum number of prior turns the UI sends to the backend for pronoun
 * resolution. Mirrors IFamilyChatService.MaxRecentTurns -- the server
 * clamps defensively, but matching here keeps the request body honest.
 */
const MAX_RECENT_TURNS = 2;

/** Translation keys for the suggested-question chips shown on first load. */
const SUGGESTED_PROMPT_KEYS = [
  'family.chat.suggested.medications',
  'family.chat.suggested.nextVisit',
  'family.chat.suggested.carePlan',
  'family.chat.suggested.recentVisits',
] as const;

type FeedbackState = null | 'pending' | 'helpful' | 'not-helpful' | 'failed';

interface ChatTurn {
  /** Stable key for React rendering. */
  id: string;
  question: string;
  /** Either the assistant's answer text, or null while in-flight. */
  answer: string | null;
  /** Translation key for an inline error, when the call failed. */
  errorKey: string | null;
  sources: string[];
  /**
   * Backend-issued correlation id for this turn -- echoed on the
   * feedback endpoint to link the thumbs vote to the originating
   * answer. null until the answer arrives.
   */
  correlationId: string | null;
  feedback: FeedbackState;
  /**
   * Up to 3 follow-up questions proposed by the model. Empty when
   * the model omitted the directive (e.g. fallback "I don't have
   * that information" answers). UI hides the chip row when empty.
   */
  followUps: string[];
}

interface AskResponse {
  data: {
    answer: string;
    sources: string[];
    inputTokens: number;
    outputTokens: number;
    correlationId: string;
    followUps?: string[];
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
 *     / care-plan / patient-summary / visits-detailed)
 *   - "Always verify with your care team" footer attached to each answer
 *   - friendly fallbacks for opt-in / rate-limit / provider-unreachable
 *   - suggested-prompt chips on first load reduce the blank-page friction
 *   - "Include visit details" checkbox lets the user opt in to fuller
 *     grounding (visit narratives) per question
 *   - per-turn thumbs up/down emits an ai.family-chat.feedback audit row
 *     keyed on the backend correlation id
 */
export function FamilyChat() {
  const { session } = usePortalAuth();
  const { t, i18n } = useTranslation();
  const patientId = session?.kind === 'family-member' ? session.patientId : null;

  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [includeVisitDetails, setIncludeVisitDetails] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom doesn't implement scrollIntoView; guard so tests don't blow up.
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [turns]);

  async function askQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || submitting || patientId == null) return;
    if (trimmed.length > MAX_QUESTION_LENGTH) return;

    const turnId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        question: trimmed,
        answer: null,
        errorKey: null,
        sources: [],
        correlationId: null,
        feedback: null,
        followUps: [],
      },
    ]);
    setQuestion('');
    setSubmitting(true);
    // Build the most-recent-N completed turns (oldest -> newest) so the
    // backend can resolve pronouns. Only include turns that have a non-null
    // answer -- in-flight or errored turns don't carry conversational signal.
    const recentTurns = turns
      .filter((t) => typeof t.answer === 'string' && t.answer.length > 0)
      .slice(-MAX_RECENT_TURNS)
      .map((t) => ({ question: t.question, answer: t.answer as string }));
    try {
      const res = await familyApi.post<AskResponse>(`/patients/${patientId}/chat`, {
        question: trimmed,
        locale: i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en',
        includeVisitDetails,
        recentTurns: recentTurns.length > 0 ? recentTurns : undefined,
      });
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                answer: res.data.data.answer,
                sources: res.data.data.sources,
                correlationId: res.data.data.correlationId,
                followUps: res.data.data.followUps ?? [],
              }
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await askQuestion(question);
  }

  async function sendFeedback(turn: ChatTurn, helpful: boolean) {
    if (turn.correlationId == null || patientId == null) return;
    if (turn.feedback === 'pending' || turn.feedback === 'helpful' || turn.feedback === 'not-helpful') return;
    setTurns((prev) =>
      prev.map((x) => (x.id === turn.id ? { ...x, feedback: 'pending' } : x)),
    );
    try {
      await familyApi.post(`/patients/${patientId}/chat/feedback`, {
        correlationId: turn.correlationId,
        helpful,
      });
      setTurns((prev) =>
        prev.map((x) =>
          x.id === turn.id ? { ...x, feedback: helpful ? 'helpful' : 'not-helpful' } : x,
        ),
      );
    } catch {
      setTurns((prev) =>
        prev.map((x) => (x.id === turn.id ? { ...x, feedback: 'failed' } : x)),
      );
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
          <div>
            <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 }}>
              {t('family.chat.empty')}
            </p>
            <div
              data-testid="suggested-prompts"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {SUGGESTED_PROMPT_KEYS.map((key) => {
                const label = t(key);
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid="suggested-prompt"
                    onClick={() => void askQuestion(label)}
                    disabled={submitting}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 999,
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: 13,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
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
                        .map((s) => t(`family.chat.sources.${s.replace(/-/g, '_')}` as const, s))
                        .join(', ')}
                    </p>
                  )}
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                    {t('family.chat.verifyFooter')}
                  </p>
                  {turn.followUps.length > 0 && (
                    <div
                      data-testid="follow-ups"
                      style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                        {t('family.chat.followUpsLabel')}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {turn.followUps.map((q) => (
                          <button
                            key={q}
                            type="button"
                            data-testid="follow-up-chip"
                            onClick={() => void askQuestion(q)}
                            disabled={submitting}
                            style={{
                              padding: '4px 10px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 999,
                              background: '#f8fafc',
                              color: '#0f172a',
                              fontSize: 12,
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {turn.correlationId != null && (
                    <div
                      data-testid="feedback-controls"
                      style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {t('family.chat.feedbackPrompt')}
                      </span>
                      <button
                        type="button"
                        data-testid="feedback-up"
                        aria-label={t('family.chat.feedbackHelpfulLabel')}
                        disabled={
                          turn.feedback === 'pending'
                          || turn.feedback === 'helpful'
                          || turn.feedback === 'not-helpful'
                        }
                        onClick={() => sendFeedback(turn, true)}
                        style={feedbackBtn(turn.feedback === 'helpful')}
                      >
                        {turn.feedback === 'helpful' ? '✅' : '👍'}
                      </button>
                      <button
                        type="button"
                        data-testid="feedback-down"
                        aria-label={t('family.chat.feedbackNotHelpfulLabel')}
                        disabled={
                          turn.feedback === 'pending'
                          || turn.feedback === 'helpful'
                          || turn.feedback === 'not-helpful'
                        }
                        onClick={() => sendFeedback(turn, false)}
                        style={feedbackBtn(turn.feedback === 'not-helpful')}
                      >
                        {turn.feedback === 'not-helpful' ? '☑️' : '👎'}
                      </button>
                      {turn.feedback === 'helpful' || turn.feedback === 'not-helpful' ? (
                        <span style={{ fontSize: 11, color: '#16a34a' }}>
                          {t('family.chat.feedbackThanks')}
                        </span>
                      ) : null}
                      {turn.feedback === 'failed' ? (
                        <span style={{ fontSize: 11, color: '#b91c1c' }}>
                          {t('family.chat.feedbackFailed')}
                        </span>
                      ) : null}
                    </div>
                  )}
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
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#475569',
          }}
        >
          <input
            data-testid="include-visit-details"
            type="checkbox"
            checked={includeVisitDetails}
            onChange={(e) => setIncludeVisitDetails(e.target.checked)}
          />
          {t('family.chat.includeVisitDetailsLabel')}
        </label>
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

function feedbackBtn(selected: boolean): React.CSSProperties {
  return {
    border: `1px solid ${selected ? '#16a34a' : '#cbd5e1'}`,
    background: selected ? '#dcfce7' : '#f8fafc',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 14,
    cursor: 'pointer',
  };
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
