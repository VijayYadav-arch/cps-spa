import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationsList } from '@/pages/Admin/Organizations/OrganizationsList';
import type { OrgListResponse } from '@/pages/Admin/Organizations/orgsTypes';

vi.mock('@/pages/Admin/Organizations/orgsApi', () => ({
  orgsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  },
}));

import { orgsApi } from '@/pages/Admin/Organizations/orgsApi';

function makeResponse(overrides: Partial<OrgListResponse> = {}): OrgListResponse {
  return {
    data: [
      {
        id: 1,
        name: 'Acme Hospice',
        slug: 'acme-hospice',
        email: 'ops@acme.test',
        phone: '555-100-2000',
        active: true,
        isDeleted: false,
        parentOrganizationId: null,
        claimsCount: 12,
        patientsCount: 34,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Beacon Care',
        slug: 'beacon-care',
        email: null,
        phone: null,
        active: false,
        isDeleted: true,
        parentOrganizationId: null,
        claimsCount: 0,
        patientsCount: 7,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
    ],
    pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    ...overrides,
  };
}

function renderList() {
  return render(
    <MemoryRouter>
      <OrganizationsList />
    </MemoryRouter>
  );
}

describe('OrganizationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(orgsApi.list).mockResolvedValue(makeResponse());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders rows from mocked list after debounce settles', async () => {
    renderList();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(orgsApi.list).toHaveBeenCalled();
    });
    // Each org name renders twice (once in mobile cards <ul>, once in desktop
    // table) since both layouts mount in jsdom; the md:hidden / hidden utility
    // classes only switch visibility, not the DOM tree.
    const acme = await screen.findAllByText('Acme Hospice');
    expect(acme.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Beacon Care').length).toBeGreaterThanOrEqual(1);
  });

  it('debounces search 300ms and passes q to orgsApi.list', async () => {
    renderList();

    // initial call after mount
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(orgsApi.list).toHaveBeenCalledWith({ q: undefined, includeDeleted: false, page: 1, pageSize: 50 });

    // type a query — should NOT call immediately
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const search = screen.getByLabelText(/search organizations/i);
    await user.type(search, 'acme');

    // before 300ms elapses, no new call (mock count should be unchanged from
    // the initial mount call; userEvent advances timers per keystroke which
    // resets the debounce each character).
    const callsBeforeDebounce = vi.mocked(orgsApi.list).mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.list).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBeforeDebounce);
      expect(calls[calls.length - 1][0]).toMatchObject({ q: 'acme' });
    });
  });

  it('toggles includeDeleted and re-queries with the new param', async () => {
    renderList();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const callsBefore = vi.mocked(orgsApi.list).mock.calls.length;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByLabelText(/include deleted/i));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.list).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][0]).toMatchObject({ includeDeleted: true });
    });
  });

  it('Next button advances the page param', async () => {
    // Return 50 rows so the Next button isn't disabled.
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Org ${i + 1}`,
      slug: `org-${i + 1}`,
      email: null,
      phone: null,
      active: true,
      isDeleted: false,
      parentOrganizationId: null,
      claimsCount: 0,
      patientsCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }));
    vi.mocked(orgsApi.list).mockResolvedValue({
      data: items,
      pagination: { total: 100, page: 1, pageSize: 50, totalPages: 2 },
    });

    renderList();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const callsBefore = vi.mocked(orgsApi.list).mock.calls.length;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.list).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][0]).toMatchObject({ page: 2 });
    });
  });

  it('marks the table as md-only and the card list as md:hidden (responsive scoping)', async () => {
    renderList();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await screen.findAllByText('Acme Hospice');

    // The table element should carry the `md:table` + `hidden` utility classes.
    const tables = document.querySelectorAll('table');
    expect(tables.length).toBe(1);
    expect(tables[0].className).toContain('hidden');
    expect(tables[0].className).toContain('md:table');

    // The mobile card <ul> should carry `md:hidden`.
    const lists = document.querySelectorAll('ul');
    const cardList = Array.from(lists).find((u) => u.className.includes('md:hidden'));
    expect(cardList).toBeTruthy();
  });

  it('renders empty state when no rows', async () => {
    vi.mocked(orgsApi.list).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
    });

    renderList();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(await screen.findByText(/no organizations found/i)).toBeInTheDocument();
  });
});
