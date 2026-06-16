import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  familyApi,
  streamFamilyChat,
  type FamilyChatStreamErrorEvent,
} from '@/portal/familyApi';
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
    // Switch to streaming so each delta renders as it arrives. The done
    // event still carries sources / correlationId / followUps once the
    // model finishes, matching the non-streaming response payload shape.
    let streamingError: FamilyChatStreamErrorEvent | null = null;
    try {
      await streamFamilyChat(
        patientId,
        {
          question: trimmed,
          locale: i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en',
          includeVisitDetails,
          recentTurns: recentTurns.length > 0 ? recentTurns : undefined,
        },
        {
          onDelta: (text) => {
            setTurns((prev) =>
              prev.map((turn) =>
                turn.id === turnId
                  ? { ...turn, answer: (turn.answer ?? '') + text }
                  : turn,
              ),
            );
          },
          onDone: (event) => {
            setTurns((prev) =>
              prev.map((turn) =>
                turn.id === turnId
                  ? {
                      ...turn,
                      // Streamed deltas have already painted the answer; just
                      // attach the trailing metadata for sources / feedback / chips.
                      answer: turn.answer ?? '',
                      sources: event.sources,
                      correlationId: event.correlationId,
                      followUps: event.followUps,
                    }
                  : turn,
              ),
            );
          },
          onError: (event) => {
            streamingError = event;
          },
        }
      );
    } catch (err) {
      streamingError = {
        status: 0,
        error: mapTransportError(err),
      };
    }

    if (streamingError !== null) {
      const error: FamilyChatStreamErrorEvent = streamingError;
      const errorKey = mapStreamErrorToKey(error);
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                // Discard any partial text emitted before the error frame; the
                // user sees the friendly error message rather than a half-written
                // answer that ended up failing.
                answer: null,
                errorKey,
              }
            : turn,
        ),
      );
    }

    setSubmitting(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await askQuestion(question);
  }

  /**
   * Assembles the current chat session as plain text and triggers a
   * browser download. Pure client-side: no PHI leaves the device that
   * wasn't already on screen, no audit event is emitted (this is a
   * user-initiated copy of their own view).
   *
   * Includes only completed turns. Errored / in-flight turns are
   * skipped so the export isn't littered with "Loading..." placeholders.
   */
  function exportConversation() {
    const completed = turns.filter((t) => typeof t.answer === 'string' && t.answer.length > 0);
    if (completed.length === 0) return;
    const now = new Date();
    const header = [
      `${t('family.chat.exportHeader')}`,
      `${t('family.chat.exportPatient', { id: patientId ?? '' })}`,
      `${t('family.chat.exportTimestamp')}: ${now.toLocaleString(i18n.resolvedLanguage ?? 'en-US')}`,
      `${t('family.chat.exportDisclaimer')}`,
      '',
    ].join('\n');
    const body = completed
      .map((turn, idx) => {
        const i = idx + 1;
        const lines = [
          `[Q${i}] ${turn.question}`,
          `[A${i}] ${turn.answer}`,
        ];
        if (turn.sources.length > 0) {
          const sourceLabels = turn.sources
            .map((s) => t(`family.chat.sources.${s.replace(/-/g, '_')}` as const, s))
            .join(', ');
          lines.push(`${t('family.chat.sourcesLabel')} ${sourceLabels}`);
        }
        return lines.join('\n');
      })
      .join('\n\n');

    const blob = new Blob([`${header}${body}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const stamp = now.toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cps-family-chat-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Defer revoke so Safari has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Resets the chat log to empty after a confirmation prompt. Local state
   * only -- there's no server-side conversation history to wipe (turns
   * are ephemeral by design). Asks first because export + clear are
   * adjacent buttons and a misclick would lose unrecoverable text.
   */
  function handleClear() {
    if (turns.length === 0) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(t('family.chat.clearConfirm'));
      if (!confirmed) return;
    }
    setTurns([]);
    setQuestion('');
    setSubmitting(false);
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
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {t('family.chat.notAuthenticated')}
      </p>
    );
  }

  const charsLeft = MAX_QUESTION_LENGTH - question.length;
  const overLimit = question.length > MAX_QUESTION_LENGTH;

  return (
    <section className="grid max-w-[720px] gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 data-testid="page-title" className="m-0 text-2xl">
          {t('family.chat.title')}
        </h1>
        {turns.some((t) => typeof t.answer === 'string' && t.answer.length > 0) && (
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="export-conversation"
              onClick={exportConversation}
              className={SESSION_ACTION_BTN}
            >
              {t('family.chat.exportButton')}
            </button>
            <button
              type="button"
              data-testid="clear-conversation"
              onClick={handleClear}
              className={`${SESSION_ACTION_BTN} text-red-700 border-red-200 hover:bg-red-50`}
            >
              {t('family.chat.clearButton')}
            </button>
          </div>
        )}
      </div>

      <div
        role="note"
        className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800"
      >
        <strong>{t('family.chat.disclaimerTitle')}</strong>
        <br />
        {t('family.chat.disclaimerBody')}
      </div>

      <div data-testid="chat-log" className="flex flex-col gap-3">
        {turns.length === 0 && (
          <div>
            <p className="mb-3 italic text-slate-400">
              {t('family.chat.empty')}
            </p>
            <div data-testid="suggested-prompts" className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPT_KEYS.map((key) => {
                const label = t(key);
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid="suggested-prompt"
                    onClick={() => void askQuestion(label)}
                    disabled={submitting}
                    className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.id} data-testid="chat-turn" className="flex flex-col gap-2">
            <div className="max-w-[85%] self-end rounded-xl bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
              {turn.question}
            </div>
            <div className="max-w-[85%] self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy-900 shadow-sm">
              {turn.answer != null ? (
                <>
                  <p className="m-0 whitespace-pre-wrap">{turn.answer}</p>
                  {turn.sources.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-medium">
                        {t('family.chat.sourcesLabel')}
                      </span>{' '}
                      {turn.sources
                        .map((s) => t(`family.chat.sources.${s.replace(/-/g, '_')}` as const, s))
                        .join(', ')}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs italic text-slate-400">
                    {t('family.chat.verifyFooter')}
                  </p>
                  {turn.followUps.length > 0 && (
                    <div data-testid="follow-ups" className="mt-2.5 flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-500">
                        {t('family.chat.followUpsLabel')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {turn.followUps.map((q) => (
                          <button
                            key={q}
                            type="button"
                            data-testid="follow-up-chip"
                            onClick={() => void askQuestion(q)}
                            disabled={submitting}
                            className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-left text-xs text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {turn.correlationId != null && (
                    <div data-testid="feedback-controls" className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
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
                        className={feedbackBtnClass(turn.feedback === 'helpful')}
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
                        className={feedbackBtnClass(turn.feedback === 'not-helpful')}
                      >
                        {turn.feedback === 'not-helpful' ? '☑️' : '👎'}
                      </button>
                      {turn.feedback === 'helpful' || turn.feedback === 'not-helpful' ? (
                        <span className="text-xs text-success">
                          {t('family.chat.feedbackThanks')}
                        </span>
                      ) : null}
                      {turn.feedback === 'failed' ? (
                        <span className="text-xs text-red-700">
                          {t('family.chat.feedbackFailed')}
                        </span>
                      ) : null}
                    </div>
                  )}
                </>
              ) : turn.errorKey != null ? (
                <p role="alert" className="m-0 text-sm text-red-700">
                  {t(turn.errorKey)}
                </p>
              ) : (
                <p className="m-0 italic text-slate-400">
                  {t('common.loading')}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-1.5">
        <textarea
          data-testid="family-chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('family.chat.placeholder')}
          rows={3}
          maxLength={MAX_QUESTION_LENGTH + 50}
          aria-label={t('family.chat.inputLabel')}
          className={`form-input resize-y ${overLimit ? 'border-error' : ''}`}
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            data-testid="include-visit-details"
            type="checkbox"
            checked={includeVisitDetails}
            onChange={(e) => setIncludeVisitDetails(e.target.checked)}
          />
          {t('family.chat.includeVisitDetailsLabel')}
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs ${overLimit ? 'text-error' : 'text-slate-400'}`}>
            {charsLeft >= 0
              ? t('family.chat.charsLeft', { n: charsLeft })
              : t('family.chat.tooLong')}
          </span>
          <button
            type="submit"
            data-testid="family-chat-submit"
            disabled={submitting || overLimit || question.trim().length === 0}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t('family.chat.sending') : t('family.chat.send')}
          </button>
        </div>
      </form>
    </section>
  );
}

const SESSION_ACTION_BTN =
  'rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';

function feedbackBtnClass(selected: boolean): string {
  return `rounded-md border px-2 py-1 text-sm transition-colors ${
    selected
      ? 'border-success bg-green-100'
      : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
  } disabled:cursor-not-allowed disabled:opacity-60`;
}

function mapStreamErrorToKey(error: FamilyChatStreamErrorEvent): string {
  // The streaming endpoint surfaces the same error taxonomy as the non-
  // streaming variant: rate_limited / ai_not_available / ai_provider_unreachable.
  // Status code is non-zero only when the failure happened before the SSE
  // stream opened (the response was a JSON envelope at an HTTP error status).
  switch (error.error) {
    case 'rate_limited':
      return 'family.chat.errorRateLimited';
    case 'ai_not_available':
      return 'family.chat.errorNotAvailable';
    case 'ai_provider_unreachable':
      return 'family.chat.errorUnreachable';
    case 'question_too_long':
      return 'family.chat.tooLong';
    case 'not_found':
      return 'family.chat.errorGeneric';
    default:
      return 'family.chat.errorGeneric';
  }
}

function mapTransportError(err: unknown): string {
  // streamFamilyChat catches most transport errors internally and translates
  // them to onError(); anything that escapes is exceptional (e.g. unhandled
  // exception from a callback). Treat as provider-unreachable.
  if (typeof err === 'object' && err !== null && 'name' in err
      && (err as { name?: string }).name === 'AbortError') {
    return 'ai_provider_unreachable';
  }
  return 'ai_provider_unreachable';
}

