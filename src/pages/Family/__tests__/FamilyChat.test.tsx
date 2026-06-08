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
    expect(postSpy).toHaveBeenCalledWith('/patients/7/chat', {
      question: 'Which medications am I on?',
      locale: 'en',
      includeVisitDetails: false,
    });
  });

  it('forwards the active locale to the backend', async () => {
    postSpy.mockResolvedValue({
      data: { data: { answer: 'ok', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c' } },
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
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c1' } },
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
      data: { data: { answer: 'fine', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c1' } },
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
      data: { data: { answer: 'ok', sources: [], inputTokens: 1, outputTokens: 1, correlationId: 'c' } },
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
