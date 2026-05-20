import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  batchSubmitClaims,
  batchVoidClaims,
  getClaims,
  type ClaimSummary,
} from '@/api/claims';

const BATCH_LIMIT = 50;

type BatchAction = 'submit' | 'void';

export function ClaimsList() {
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingAction, setPendingAction] = useState<BatchAction | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const loadClaims = () => {
    setIsLoading(true);
    setError(null);
    setSelected(new Set());
    return getClaims({ page, pageSize: 20, status: statusFilter || undefined })
      .then((res) => {
        setClaims(res.data);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => setError('Failed to load claims. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    loadClaims().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const toggleRow = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === claims.length) setSelected(new Set());
    else setSelected(new Set(claims.map((c) => c.id)));
  };

  const runBatch = async () => {
    if (!pendingAction) return;
    setSubmittingBatch(true);
    setBatchSummary(null);
    setError(null);
    try {
      const ids = [...selected];
      if (pendingAction === 'submit') {
        const res = await batchSubmitClaims(ids);
        setBatchSummary(
          `Batch submit · ${res.succeeded.length}/${ids.length} succeeded` +
          (res.failed.length > 0 ? ` (${res.failed.length} failed)` : ''),
        );
      } else {
        const res = await batchVoidClaims(ids);
        setBatchSummary(
          `Batch void · ${res.voided.length}/${ids.length} voided` +
          (res.notFound.length > 0 ? ` (${res.notFound.length} not found)` : ''),
        );
      }
      setPendingAction(null);
      await loadClaims();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Batch action failed';
      setError(message);
    } finally {
      setSubmittingBatch(false);
    }
  };

  if (isLoading) return <div role="status">Loading claims…</div>;
  if (error && claims.length === 0) return <div role="alert">{error}</div>;

  const tooMany = selected.size > BATCH_LIMIT;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Claims</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {/* Batch toolbar — visible only when something is selected */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          padding: 12, marginBottom: 12,
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6,
        }}>
          <span style={{ fontWeight: 600 }}>{selected.size} selected</span>
          {tooMany && (
            <span style={{ color: '#b45309', fontSize: 13 }}>
              Max {BATCH_LIMIT} per batch
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setPendingAction('submit')}
            disabled={tooMany}
          >
            Submit {selected.size}
          </button>
          <button
            type="button"
            onClick={() => setPendingAction('void')}
            disabled={tooMany}
            style={{ color: '#b91c1c' }}
          >
            Void {selected.size}
          </button>
          <button type="button" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {batchSummary && (
        <div style={{ color: '#15803d', marginBottom: 12 }}>{batchSummary}</div>
      )}
      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}

      {claims.length === 0 ? (
        <p>No claims found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', width: 36 }}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={selected.size > 0 && selected.size === claims.length}
                  onChange={toggleAll}
                />
              </th>
              <th style={{ padding: '8px 12px' }}>ID</th>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Amount</th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="checkbox"
                    aria-label={`Select claim ${c.id}`}
                    checked={selected.has(c.id)}
                    onChange={() => toggleRow(c.id)}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>{c.id}</td>
                <td style={{ padding: '8px 12px' }}>{c.patientName}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 12,
                    background: c.status === 'paid' ? '#dcfce7' : c.status === 'denied' ? '#fee2e2' : '#f1f5f9',
                    color: c.status === 'paid' ? '#166534' : c.status === 'denied' ? '#991b1b' : '#475569',
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>${c.amount.toFixed(2)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/claims/${c.id}`} style={{ color: '#2563eb' }}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>

      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Confirm batch ${pendingAction}`}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>
              Confirm {pendingAction === 'submit' ? 'batch submit' : 'batch void'}
            </h3>
            <p>
              {pendingAction === 'submit'
                ? `Submit ${selected.size} claim${selected.size === 1 ? '' : 's'} to the clearinghouse?`
                : `Void ${selected.size} claim${selected.size === 1 ? '' : 's'}? This is a soft-delete and can be reversed by an admin, but they will disappear from active queues immediately.`}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setPendingAction(null)} disabled={submittingBatch}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void runBatch(); }}
                disabled={submittingBatch}
                aria-busy={submittingBatch}
                style={pendingAction === 'void' ? { background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4 } : undefined}
              >
                {submittingBatch ? 'Working…' : pendingAction === 'submit' ? 'Submit' : 'Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
