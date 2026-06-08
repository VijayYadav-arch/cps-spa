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

    // Backend received the locale tag, defaults to 'en' here.
    expect(postSpy).toHaveBeenCalledWith('/patients/7/chat', {
      question: 'Which medications am I on?',
      locale: 'en',
    });
  });

  it('forwards the active locale to the backend', async () => {
    postSpy.mockResolvedValue({
      data: { data: { answer: 'ok', sources: [], inputTokens: 1, outputTokens: 1 } },
    });
    await i18n.changeLanguage('es-US');

    renderChat();
    fireEvent.change(screen.getByTestId('family-chat-input'), { target: { value: '¿Qué tomo?' } });
    fireEvent.click(screen.getByTestId('family-chat-submit'));

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(postSpy).toHaveBeenCalledWith('/patients/7/chat', {
      question: '¿Qué tomo?',
      locale: 'es',
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
});
