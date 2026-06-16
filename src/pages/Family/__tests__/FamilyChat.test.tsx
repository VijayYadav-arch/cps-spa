import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { FamilyChat } from '../FamilyChat';
import type {
  FamilyChatStreamDoneEvent,
  FamilyChatStreamErrorEvent,
  StreamFamilyChatBody,
  StreamFamilyChatHandlers,
} from '@/portal/familyApi';

vi.mock('@/portal/PortalAuthContext', () => ({
  usePortalAuth: () => ({
    session: { kind: 'family-member' as const, patientId: 7, familyAccessId: 1 },
  }),
}));

const postSpy = vi.fn();
const streamSpy = vi.fn();
vi.mock('@/portal/familyApi', () => ({
  familyApi: {
    post: (...args: unknown[]) => postSpy(...args),
  },
  streamFamilyChat: (...args: unknown[]) => streamSpy(...args),
}));

/**
 * Builds a streamFamilyChat mock implementation that synchronously emits a
 * sequence of text deltas, then a single done event. Mirrors the wire
 * shape of cps-dotnet PR #237.
 */
function makeStreamSuccess(opts: {
  deltas: string[];
  done: Partial<FamilyChatStreamDoneEvent>;
}): (
  patientId: number,
  body: StreamFamilyChatBody,
  handlers: StreamFamilyChatHandlers
) => Promise<void> {
  return async (_patientId, _body, handlers) => {
    for (const delta of opts.deltas) handlers.onDelta(delta);
    handlers.onDone({
      sources: opts.done.sources ?? [],
      correlationId: opts.done.correlationId ?? 'family-chat-7-stub',
      followUps: opts.done.followUps ?? [],
      inputTokens: opts.done.inputTokens ?? 0,
      outputTokens: opts.done.outputTokens ?? 0,
    });
  };
}

function makeStreamError(error: Partial<FamilyChatStreamErrorEvent>): (
  patientId: number,
  body: StreamFamilyChatBody,
  handlers: StreamFamilyChatHandlers
) => Promise<void> {
  return async (_patientId, _body, handlers) => {
    handlers.onError({
      status: error.status ?? 0,
      error: error.error ?? 'unknown',
      message: error.message,
    });
  };
}

const renderChat = () => render(<MemoryRouter><FamilyChat /></MemoryRouter>);

describe('FamilyChat (streaming)', () => {
  beforeEach(async () => {
    postSpy.mockReset();
    streamSpy.mockReset();
    await i18n.changeLanguage('en-US');
  });
  afterEach(() => cleanup());

  it('renders disclaimer banner and empty state in English', () => {
    renderChat();
    expect(screen.getByText(/AI assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Ask Mira/)).toBeInTheDocument();
    expect(screen.getByText(/Ask a question to get started/)).toBeInTheDocument();
  });

  it('renders disclaimer banner in Spanish after locale change', async () => {
    await i18n.changeLanguage('es-US');
    renderChat();
    expect(screen.getByText(/asistente con inteligencia artificial/i)).toBeInTheDocument();
    expect(screen.getByText(/Pregúntele a Mira/)).toBeInTheDocument();
  });

  it('streams deltas in order and assembles the final answer + sources', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['You are ', 'currently on ', 'Acetaminophen ', 'and Lisinopril.'],
      done: {
        sources: ['patient-summary', 'medications'],
        correlationId: 'family-chat-7-test',
      },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), {
      target: { value: 'Which medications am I on?' },
    });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/You are currently on Acetaminophen and Lisinopril/)).toBeInTheDocument();
    });
    expect(screen.getByText(/I used:/)).toBeInTheDocument();
    expect(screen.getAllByText(/Always verify important information/).length).toBeGreaterThanOrEqual(2);

    expect(streamSpy).toHaveBeenCalledTimes(1);
    const call = streamSpy.mock.calls[0];
    expect(call[0]).toBe(7);
    expect(call[1]).toMatchObject({
      question: 'Which medications am I on?',
      locale: 'en',
      includeVisitDetails: false,
      recentTurns: undefined,
    });
  });

  it('forwards the active locale to the backend', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['ok'], done: { correlationId: 'c' },
    }));
    await i18n.changeLanguage('es-US');

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: '¿Qué tomo?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(streamSpy).toHaveBeenCalled());
    expect(streamSpy.mock.calls[0][1]).toMatchObject({
      question: '¿Qué tomo?',
      locale: 'es',
    });
  });

  it('shows a rate-limit message when the stream errors with rate_limited', async () => {
    streamSpy.mockImplementationOnce(makeStreamError({ error: 'rate_limited' }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Too many questions/i)).toBeInTheDocument();
    });
  });

  it('shows the AI-not-available message when the stream errors with ai_not_available', async () => {
    streamSpy.mockImplementationOnce(makeStreamError({ error: 'ai_not_available' }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/not currently available/i)).toBeInTheDocument();
    });
  });

  it('discards partial deltas when an error frame arrives mid-stream', async () => {
    streamSpy.mockImplementationOnce(async (_p, _b, handlers) => {
      handlers.onDelta('Half of an answer ');
      handlers.onDelta('before failure ');
      handlers.onError({ status: 0, error: 'ai_provider_unreachable' });
    });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Couldn't reach the AI service/i)).toBeInTheDocument();
    });
    // The half-finished answer text should NOT remain on screen.
    expect(screen.queryByText(/Half of an answer/)).not.toBeInTheDocument();
  });

  it('disables submit when input is empty or whitespace', () => {
    renderChat();
    const submit = screen.getByTestId('family-chat-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: '   ' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    expect(submit.disabled).toBe(false);
  });

  it('renders suggested-prompt chips on empty state and sends one on click', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'c1' },
    }));

    renderChat();
    const chips = screen.getAllByTestId('suggested-prompt');
    expect(chips.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(chips[0]);

    await waitFor(() => expect(streamSpy).toHaveBeenCalled());
    const call = streamSpy.mock.calls[0];
    expect(call[0]).toBe(7);
    expect((call[1] as StreamFamilyChatBody).question.length).toBeGreaterThan(0);
  });

  it('hides the suggested prompts after the first turn lands', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'c1' },
    }));

    renderChat();
    expect(screen.getByTestId('suggested-prompts')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('suggested-prompt')[0]);

    await waitFor(() => {
      expect(screen.queryByTestId('suggested-prompts')).not.toBeInTheDocument();
    });
  });

  it('passes includeVisitDetails=true to the backend when checkbox is ticked', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['ok'], done: { correlationId: 'c' },
    }));

    renderChat();
    fireEvent.click(screen.getByTestId('include-visit-details'));
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'how was the visit?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(streamSpy).toHaveBeenCalled());
    expect(streamSpy.mock.calls[0][1]).toMatchObject({
      question: 'how was the visit?',
      locale: 'en',
      includeVisitDetails: true,
    });
  });

  it('thumbs-up sends feedback POST with the turn correlation id', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'family-chat-7-abc' },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(screen.getByTestId('feedback-up')).toBeInTheDocument());
    postSpy.mockResolvedValueOnce({ data: { data: { ok: true } } });
    fireEvent.click(screen.getByTestId('feedback-up'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/patients/7/chat/feedback', {
        correlationId: 'family-chat-7-abc',
        helpful: true,
      });
    });
    expect(screen.getByText(/Thanks for the feedback/i)).toBeInTheDocument();
  });

  it('thumbs-down sends helpful=false', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'family-chat-7-xyz' },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(screen.getByTestId('feedback-down')).toBeInTheDocument());
    postSpy.mockResolvedValueOnce({ data: { data: { ok: true } } });
    fireEvent.click(screen.getByTestId('feedback-down'));

    await waitFor(() => {
      expect(postSpy.mock.calls.some(([url, body]) =>
        url === '/patients/7/chat/feedback'
        && (body as { helpful: boolean }).helpful === false,
      )).toBe(true);
    });
  });

  it('renders follow-up chips when the done event includes followUps', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['You have 2 active medications.'],
      done: {
        sources: ['patient-summary', 'medications'],
        correlationId: 'family-chat-7-fup',
        followUps: ['What is the dose?', 'Who prescribed them?', 'When was the last refill?'],
      },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'meds?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('follow-ups')).toBeInTheDocument();
    });
    const chips = screen.getAllByTestId('follow-up-chip');
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveTextContent('What is the dose?');
    expect(screen.getByText(/You might also ask/)).toBeInTheDocument();
  });

  it('clicking a follow-up chip submits it as the next question', async () => {
    streamSpy
      .mockImplementationOnce(makeStreamSuccess({
        deltas: ['first answer'],
        done: { sources: ['patient-summary'], correlationId: 'family-chat-7-1', followUps: ['Follow-up A?', 'Follow-up B?'] },
      }))
      .mockImplementationOnce(makeStreamSuccess({
        deltas: ['b answer'], done: { correlationId: 'family-chat-7-2' },
      }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'first' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByTestId('follow-ups')).toBeInTheDocument());

    fireEvent.click(screen.getAllByTestId('follow-up-chip')[1]);

    await waitFor(() => expect(streamSpy).toHaveBeenCalledTimes(2));
    expect((streamSpy.mock.calls[1][1] as StreamFamilyChatBody).question).toBe('Follow-up B?');
  });

  it('hides the follow-up row when the backend returns no followUps', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ["I don't have that information — please contact your care coordinator."],
      done: { sources: ['patient-summary'], correlationId: 'family-chat-7-empty', followUps: [] },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'unanswerable' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(screen.getByText(/don't have that information/i)).toBeInTheDocument());
    expect(screen.queryByTestId('follow-ups')).not.toBeInTheDocument();
  });

  it('does not show export button when chat is empty', () => {
    renderChat();
    expect(screen.queryByTestId('export-conversation')).not.toBeInTheDocument();
  });

  it('does not show clear button when chat is empty', () => {
    renderChat();
    expect(screen.queryByTestId('clear-conversation')).not.toBeInTheDocument();
  });

  it('clear-conversation empties the log after confirm', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'c-clr' },
    }));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByTestId('clear-conversation')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('clear-conversation'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByTestId('chat-turn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('clear-conversation')).not.toBeInTheDocument();
    expect(screen.getByTestId('suggested-prompts')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('clear-conversation cancellation keeps turns intact', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'c-keep' },
    }));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByText('fine')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('clear-conversation'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByText('fine')).toBeInTheDocument();
    expect(screen.getByTestId('clear-conversation')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('shows export button after first completed turn', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { sources: ['patient-summary'], correlationId: 'c-exp' },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(screen.getByTestId('export-conversation')).toBeInTheDocument());
  });

  it('export-conversation triggers a download with both Q and A in the blob', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['You are taking Acetaminophen.'],
      done: { sources: ['patient-summary', 'medications'], correlationId: 'c-exp' },
    }));

    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((b: Blob | MediaSource) => {
      if (b instanceof Blob) blobs.push(b);
      return 'blob:mock-url';
    });
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'meds?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByTestId('export-conversation')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('export-conversation'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(blobs).toHaveLength(1);

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blobs[0]);
    });
    expect(text).toContain('Mira™ Family Chat');
    expect(text).toContain('[Q1] meds?');
    expect(text).toContain('[A1] You are taking Acetaminophen.');
    expect(text).toContain('I used:');
  });

  it('sends recentTurns with the second question containing prior Q+A', async () => {
    streamSpy
      .mockImplementationOnce(makeStreamSuccess({
        deltas: ['first answer'],
        done: { sources: ['patient-summary'], correlationId: 'family-chat-7-mt1' },
      }))
      .mockImplementationOnce(makeStreamSuccess({
        deltas: ['second answer'], done: { correlationId: 'family-chat-7-mt2' },
      }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'first?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByText('first answer')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'and the second?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(streamSpy).toHaveBeenCalledTimes(2));
    const secondBody = streamSpy.mock.calls[1][1] as StreamFamilyChatBody;
    expect(secondBody.recentTurns).toHaveLength(1);
    expect(secondBody.recentTurns![0]).toEqual({ question: 'first?', answer: 'first answer' });
  });

  it('caps recentTurns at 2 on the wire even if more turns exist', async () => {
    for (const answer of ['a1', 'a2', 'a3']) {
      streamSpy.mockImplementationOnce(makeStreamSuccess({
        deltas: [answer], done: { correlationId: `c-${answer}` },
      }));
    }

    renderChat();
    for (const q of ['q1', 'q2', 'q3']) {
      fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: q } });
      fireEvent.click(screen.getByTestId('family-chat-submit'));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(streamSpy).toHaveBeenCalledTimes(['q1', 'q2', 'q3'].indexOf(q) + 1));
    }

    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['a4'], done: { correlationId: 'c4' },
    }));
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q4' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(streamSpy).toHaveBeenCalledTimes(4));
    const fourth = streamSpy.mock.calls[3][1] as StreamFamilyChatBody;
    expect(fourth.recentTurns).toHaveLength(2);
    expect(fourth.recentTurns!.map((t) => t.question)).toEqual(['q2', 'q3']);
  });

  it('shows a failure hint when the feedback POST rejects', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess({
      deltas: ['fine'], done: { correlationId: 'family-chat-7-fail' },
    }));

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(screen.getByTestId('feedback-up')).toBeInTheDocument());
    postSpy.mockRejectedValueOnce({ response: { status: 500 } });
    fireEvent.click(screen.getByTestId('feedback-up'));

    await waitFor(() => {
      expect(screen.getByText(/Couldn't save feedback/i)).toBeInTheDocument();
    });
  });
});
