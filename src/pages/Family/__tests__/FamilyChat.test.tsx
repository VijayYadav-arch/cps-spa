import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { FamilyChat } from '../FamilyChat';

vi.mock('@/portal/PortalAuthContext', () => ({
  usePortalAuth: () => ({
    session: { kind: 'family-member' as const, patientId: 7, familyAccessId: 1 },
  }),
}));

const postSpy = vi.fn();
vi.mock('@/portal/familyApi', () => ({
  familyApi: {
    post: (...args: unknown[]) => postSpy(...args),
  },
}));

const renderChat = () => render(<MemoryRouter><FamilyChat /></MemoryRouter>);

describe('FamilyChat', () => {
  beforeEach(async () => {
    postSpy.mockReset();
    await i18n.changeLanguage('en-US');
  });
  afterEach(() => cleanup());

  it('renders disclaimer banner and empty state in English', () => {
    renderChat();
    expect(screen.getByText(/AI assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Ask CPS/)).toBeInTheDocument();
    expect(screen.getByText(/Ask a question to get started/)).toBeInTheDocument();
  });

  it('renders disclaimer banner in Spanish after locale change', async () => {
    await i18n.changeLanguage('es-US');
    renderChat();
    expect(screen.getByText(/asistente con inteligencia artificial/i)).toBeInTheDocument();
    expect(screen.getByText(/Pregúntele a CPS/)).toBeInTheDocument();
  });

  it('submits a question and renders the answer with sources + verify footer', async () => {
    postSpy.mockResolvedValue({
      data: {
        data: {
          answer: 'You are currently on Acetaminophen and Lisinopril.',
          sources: ['patient-summary', 'medications'],
          inputTokens: 120,
          outputTokens: 18,
          correlationId: 'family-chat-7-test',
          followUps: [],
        },
      },
    });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), {
      target: { value: 'Which medications am I on?' },
    });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Acetaminophen/)).toBeInTheDocument();
    });
    expect(screen.getByText(/I used:/)).toBeInTheDocument();
    // The verify reminder appears both in the top banner and as a per-turn footer;
    // assert >= 2 matches without binding the test to which surface owns each one.
    expect(screen.getAllByText(/Always verify important information/).length).toBeGreaterThanOrEqual(2);

    // Backend received the locale tag + the visit-details flag, defaults to off.
    // recentTurns omitted on first turn (no prior history to send).
    expect(postSpy).toHaveBeenCalledWith('/patients/7/chat', {
      question: 'Which medications am I on?',
      locale: 'en',
      includeVisitDetails: false,
      recentTurns: undefined,
    });
  });

  it('forwards the active locale to the backend', async () => {
    postSpy.mockResolvedValue({
      data: { data: { answer: 'ok', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c', followUps: [] } },
    });
    await i18n.changeLanguage('es-US');

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: '¿Qué tomo?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(postSpy).toHaveBeenCalledWith('/patients/7/chat', {
      question: '¿Qué tomo?',
      locale: 'es',
      includeVisitDetails: false,
      recentTurns: undefined,
    });
  });

  it('shows a rate-limit message on 429', async () => {
    postSpy.mockRejectedValue({ response: { status: 429 } });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Too many questions/i)).toBeInTheDocument();
    });
  });

  it('shows the AI-not-available message on 503', async () => {
    postSpy.mockRejectedValue({ response: { status: 503 } });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => {
      expect(screen.getByText(/not currently available/i)).toBeInTheDocument();
    });
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
    postSpy.mockResolvedValue({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c1', followUps: [] } },
    });

    renderChat();
    const chips = screen.getAllByTestId('suggested-prompt');
    expect(chips.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(chips[0]);

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    const call = postSpy.mock.calls[0];
    expect(call[0]).toBe('/patients/7/chat');
    // The chip's label should be the question we sent (in the active locale).
    expect((call[1] as { question: string }).question.length).toBeGreaterThan(0);
  });

  it('hides the suggested prompts after the first turn lands', async () => {
    postSpy.mockResolvedValue({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c1', followUps: [] } },
    });

    renderChat();
    expect(screen.getByTestId('suggested-prompts')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('suggested-prompt')[0]);

    await waitFor(() => {
      expect(screen.queryByTestId('suggested-prompts')).not.toBeInTheDocument();
    });
  });

  it('passes includeVisitDetails=true to the backend when checkbox is ticked', async () => {
    postSpy.mockResolvedValue({
      data: { data: { answer: 'ok', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c', followUps: [] } },
    });

    renderChat();
    fireEvent.click(screen.getByTestId('include-visit-details'));
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'how was the visit?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(postSpy).toHaveBeenCalledWith('/patients/7/chat', {
      question: 'how was the visit?',
      locale: 'en',
      includeVisitDetails: true,
      recentTurns: undefined,
    });
  });

  it('thumbs-up sends feedback POST with the turn correlation id', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'family-chat-7-abc' } },
    });

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

  it('thumbs-down sends helpful=false and acknowledgements rendered', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'family-chat-7-xyz' } },
    });

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

  it('renders follow-up chips when the response includes followUps', async () => {
    postSpy.mockResolvedValueOnce({
      data: {
        data: {
          answer: 'You have 2 active medications.',
          sources: ['patient-summary', 'medications'],
          inputTokens: 80,
          outputTokens: 15,
          correlationId: 'family-chat-7-fup',
          followUps: ['What is the dose?', 'Who prescribed them?', 'When was the last refill?'],
        },
      },
    });

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
    postSpy.mockResolvedValueOnce({
      data: {
        data: {
          answer: 'first answer',
          sources: ['patient-summary'],
          inputTokens: 1,
          outputTokens: 1,
          correlationId: 'family-chat-7-1',
          followUps: ['Follow-up A?', 'Follow-up B?'],
        },
      },
    });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'first' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByTestId('follow-ups')).toBeInTheDocument());

    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'b answer', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'family-chat-7-2', followUps: [] } },
    });
    fireEvent.click(screen.getAllByTestId('follow-up-chip')[1]);

    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(2));
    expect(postSpy.mock.calls[1][0]).toBe('/patients/7/chat');
    expect((postSpy.mock.calls[1][1] as { question: string }).question).toBe('Follow-up B?');
  });

  it('hides the follow-up row when the backend returns no followUps', async () => {
    postSpy.mockResolvedValueOnce({
      data: {
        data: {
          answer: "I don't have that information — please contact your care coordinator.",
          sources: ['patient-summary'],
          inputTokens: 50,
          outputTokens: 12,
          correlationId: 'family-chat-7-empty',
          followUps: [],
        },
      },
    });

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
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c-clr', followUps: [] } },
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByTestId('clear-conversation')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('clear-conversation'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByTestId('chat-turn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('clear-conversation')).not.toBeInTheDocument();
    // Empty-state suggested prompts reappear after a clear.
    expect(screen.getByTestId('suggested-prompts')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('clear-conversation cancellation keeps turns intact', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c-keep', followUps: [] } },
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByText('fine')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('clear-conversation'));

    expect(confirmSpy).toHaveBeenCalled();
    // Turn is still there.
    expect(screen.getByText('fine')).toBeInTheDocument();
    expect(screen.getByTestId('clear-conversation')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('shows export button after first completed turn', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'fine', sources: ['patient-summary'], inputTokens: 1, outputTokens: 1, correlationId: 'c-exp', followUps: [] } },
    });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(screen.getByTestId('export-conversation')).toBeInTheDocument());
  });

  it('export-conversation triggers a download with both Q and A in the blob', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'You are taking Acetaminophen.', sources: ['patient-summary', 'medications'], inputTokens: 80, outputTokens: 12, correlationId: 'c-exp', followUps: [] } },
    });

    // Capture the Blob that gets handed to URL.createObjectURL so we can
    // read it back. jsdom Blob lacks .text() but FileReader works.
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

    // jsdom Blob doesn't implement .text(); read via FileReader instead.
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blobs[0]);
    });
    expect(text).toContain('CPS Family Chat');
    expect(text).toContain('[Q1] meds?');
    expect(text).toContain('[A1] You are taking Acetaminophen.');
    expect(text).toContain('I used:');
  });

  it('sends recentTurns with the second question containing prior Q+A', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'first answer', sources: ['patient-summary'], inputTokens: 1, outputTokens: 1, correlationId: 'family-chat-7-mt1', followUps: [] } },
    });

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'first?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));
    await waitFor(() => expect(screen.getByText('first answer')).toBeInTheDocument());

    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'second answer', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'family-chat-7-mt2', followUps: [] } },
    });
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'and the second?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(2));
    const secondCall = postSpy.mock.calls[1][1] as { recentTurns: Array<{ question: string; answer: string }> };
    expect(secondCall.recentTurns).toHaveLength(1);
    expect(secondCall.recentTurns[0]).toEqual({ question: 'first?', answer: 'first answer' });
  });

  it('caps recentTurns at 2 on the wire even if more turns exist', async () => {
    // Drive three completed turns then send a fourth question.
    for (const [i, body] of [
      { answer: 'a1' },
      { answer: 'a2' },
      { answer: 'a3' },
    ].entries()) {
      postSpy.mockResolvedValueOnce({
        data: { data: { ...body, sources: [], inputTokens: 1, outputTokens: 1, correlationId: `c${i}`, followUps: [] } },
      });
    }

    renderChat();
    for (const q of ['q1', 'q2', 'q3']) {
      fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: q } });
      fireEvent.click(screen.getByTestId('family-chat-submit'));
      // Wait for that round's answer before submitting the next.
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(['q1', 'q2', 'q3'].indexOf(q) + 1));
    }

    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'a4', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c4', followUps: [] } },
    });
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: 'q4' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(4));
    const fourth = postSpy.mock.calls[3][1] as { recentTurns: Array<{ question: string; answer: string }> };
    expect(fourth.recentTurns).toHaveLength(2);
    // Only q2 and q3 should be sent -- oldest two completed turns dropped client-side.
    expect(fourth.recentTurns.map((t) => t.question)).toEqual(['q2', 'q3']);
  });

  it('shows a failure hint when the feedback POST rejects', async () => {
    postSpy.mockResolvedValueOnce({
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'family-chat-7-fail' } },
    });

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
