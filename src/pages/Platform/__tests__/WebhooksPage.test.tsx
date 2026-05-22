import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WebhooksPage } from '@/pages/Platform/WebhooksPage';
import type { Webhook, WebhookDeliveryAttempt } from '@/api/platform';

vi.mock('@/api/platform', () => ({
  getWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getWebhookDeliveries: vi.fn(),
  testWebhookSignature: vi.fn(),
}));

import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  testWebhookSignature,
} from '@/api/platform';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

function hook(over: Partial<Webhook> = {}): Webhook {
  return {
    id: 1,
    organizationId: 7,
    url: 'https://partner.example.com/webhook',
    events: JSON.stringify(['claim.paid', 'era.posted']),
    isActive: true,
    ...over,
  };
}

function delivery(over: Partial<WebhookDeliveryAttempt> = {}): WebhookDeliveryAttempt {
  return {
    id: 1,
    webhookEndpointId: 1,
    eventType: 'claim.paid',
    payload: '{}',
    responseStatus: 200,
    responseBody: 'ok',
    attemptedAt: '2026-05-20T10:00:00Z',
    durationMs: 250,
    succeeded: true,
    errorMessage: null,
    ...over,
  };
}

function renderPage() {
  return render(<MemoryRouter><WebhooksPage /></MemoryRouter>);
}

describe('WebhooksPage', () => {
  it('lists configured webhooks', async () => {
    vi.mocked(getWebhooks).mockResolvedValue({
      data: [hook()],
      pagination: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText('https://partner.example.com/webhook')).toBeInTheDocument();
    expect(screen.getByText(/claim.paid, era.posted/)).toBeInTheDocument();
  });

  it('creates a webhook and surfaces the signing secret', async () => {
    const user = userEvent.setup();
    vi.mocked(getWebhooks).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(createWebhook).mockResolvedValue({
      id: 42,
      url: 'https://new.partner.example.com/cps',
      secret: 'whsec_one-time-secret',
      events: JSON.stringify(['claim.paid']),
    });

    renderPage();
    await waitFor(() => expect(getWebhooks).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /New webhook/i }));
    await user.type(screen.getByLabelText(/URL/i), 'https://new.partner.example.com/cps');
    await user.type(screen.getByLabelText(/Organization id/i), '7');
    await user.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() => {
      expect(createWebhook).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 7,
        url: 'https://new.partner.example.com/cps',
        events: ['claim.paid'],
      }));
    });
    expect(await screen.findByText(/Webhook created/)).toBeInTheDocument();
    expect(screen.getByText('whsec_one-time-secret')).toBeInTheDocument();
  });

  it('blocks create when URL or org id is missing', async () => {
    const user = userEvent.setup();
    vi.mocked(getWebhooks).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    });
    renderPage();
    await waitFor(() => expect(getWebhooks).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /New webhook/i }));
    await user.click(screen.getByRole('button', { name: /^Create$/ }));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent(/URL, at least one event, and organization id are required/);
    expect(createWebhook).not.toHaveBeenCalled();
  });

  it('shows delivery history when Deliveries is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getWebhooks).mockResolvedValue({
      data: [hook()],
      pagination: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(getWebhookDeliveries).mockResolvedValue({
      data: [delivery(), delivery({ id: 2, succeeded: false, responseStatus: 500, errorMessage: 'partner down' })],
    });

    renderPage();
    await screen.findByText('https://partner.example.com/webhook');
    await user.click(screen.getByRole('button', { name: /Deliveries/i }));

    expect(await screen.findByText(/Delivery history/i)).toBeInTheDocument();
    expect(screen.getByText('partner down')).toBeInTheDocument();
  });

  it('runs the signature test helper', async () => {
    const user = userEvent.setup();
    vi.mocked(getWebhooks).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(testWebhookSignature).mockResolvedValue({
      payload: '{"test":true}',
      signature: 'sha256=abc123',
    });

    renderPage();
    await waitFor(() => expect(getWebhooks).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText(/webhook signing secret/i), 'whsec_x');
    await user.click(screen.getByRole('button', { name: /Generate/ }));

    await waitFor(() => {
      expect(testWebhookSignature).toHaveBeenCalledWith('whsec_x');
    });
    expect(await screen.findByText('sha256=abc123')).toBeInTheDocument();
  });

  it('deletes a webhook after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(getWebhooks).mockResolvedValue({
      data: [hook()],
      pagination: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
    });
    vi.mocked(deleteWebhook).mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('https://partner.example.com/webhook');
    await user.click(screen.getByRole('button', { name: /^Delete$/ }));

    await waitFor(() => expect(deleteWebhook).toHaveBeenCalledWith(1));
  });
});
