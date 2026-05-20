import { useEffect, useState } from 'react';
import {
  listEraPostings,
  postEra,
  type EraPostingRow,
} from '@/api/billing';

const PAGE_SIZE = 25;

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function EraPostingsPage() {
  const [rows, setRows] = useState<EraPostingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [raw835, setRaw835] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listEraPostings({ page, pageSize: PAGE_SIZE });
      setRows(res.data);
      setTotal(res.total);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load ERA postings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page]);

  const totals = rows.reduce(
    (acc, r) => ({
      paid: acc.paid + r.paymentAmount,
      matched: acc.matched + r.matchedClaims,
      unmatched: acc.unmatched + r.unmatchedClaims,
    }),
    { paid: 0, matched: 0, unmatched: 0 },
  );

  const submitUpload = async () => {
    setUploading(true);
    setUploadMessage(null);
    setError(null);
    try {
      const payload: { raw835?: string | null; submissionId?: number | null } = {};
      if (raw835.trim()) payload.raw835 = raw835.trim();
      if (submissionId.trim()) payload.submissionId = Number(submissionId.trim());
      if (!payload.raw835 && !payload.submissionId) {
        setUploadMessage('Provide raw 835 text or a submission id.');
        setUploading(false);
        return;
      }
      const res = await postEra(payload);
      setUploadMessage(
        `Posted ERA #${res.data.eraPostingId} · ${res.data.matched} matched, ${res.data.unmatched} unmatched`,
      );
      setRaw835('');
      setSubmissionId('');
      setUploadOpen(false);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Upload failed';
      setUploadMessage(`Failed: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>ERA postings</h1>
          <p style={{ color: '#64748b', maxWidth: 720 }}>
            Electronic remittance advice (835) postings — what payers have paid,
            check numbers, and per-ERA claim match counts. Drill into a
            specific claim's lifecycle for the line-level breakdown.
          </p>
        </div>
        <button type="button" onClick={() => setUploadOpen((o) => !o)}>
          {uploadOpen ? 'Cancel upload' : '+ Manual upload'}
        </button>
      </header>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}
      {uploadMessage && (
        <div style={{
          color: uploadMessage.startsWith('Failed') ? '#b91c1c' : '#15803d',
          marginBottom: 12,
        }}>
          {uploadMessage}
        </div>
      )}

      {uploadOpen && (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
          marginBottom: 16, background: '#f8fafc',
        }}>
          <p style={{ marginTop: 0, color: '#64748b' }}>
            Paste a raw 835 (preferred) <em>or</em> pass a submission id to
            re-fetch the remittance from the clearinghouse.
          </p>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Raw 835
            <textarea
              value={raw835}
              onChange={(e) => setRaw835(e.target.value)}
              rows={6}
              placeholder="ISA*00*…~"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Or submission id
            <input
              type="number"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              style={{ width: 200 }}
            />
          </label>
          <button
            type="button"
            disabled={uploading}
            aria-busy={uploading}
            onClick={() => { void submitUpload(); }}
          >
            {uploading ? 'Uploading…' : 'Post ERA'}
          </button>
        </div>
      )}

      {/* Summary row */}
      {rows.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, marginBottom: 16,
        }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>This page paid</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: '#15803d' }}>
              {formatMoney(totals.paid)}
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>Claims matched</div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>
              {totals.matched.toLocaleString()}
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>Unmatched</div>
            <div style={{
              fontWeight: 600, fontSize: 18,
              color: totals.unmatched > 0 ? '#b45309' : '#475569',
            }}>
              {totals.unmatched.toLocaleString()}
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>Total postings</div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>
              {total.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {isLoading && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>No ERA postings yet.</div>
      )}

      {rows.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Posted</th>
                <th style={{ padding: 8 }}>Payer</th>
                <th style={{ padding: 8 }}>Check #</th>
                <th style={{ padding: 8 }}>Check date</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: 8 }}>Matched</th>
                <th style={{ padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{fmtDate(r.postedAt)}</td>
                  <td style={{ padding: 8 }}>{r.payerName}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13 }}>
                    {r.checkNumber || '—'}
                  </td>
                  <td style={{ padding: 8 }}>{r.checkDate || '—'}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                    {formatMoney(r.paymentAmount)}
                  </td>
                  <td style={{ padding: 8 }}>
                    {r.matchedClaims}/{r.matchedClaims + r.unmatchedClaims}
                    {r.unmatchedClaims > 0 && (
                      <span style={{ color: '#b45309', marginLeft: 6, fontSize: 12 }}>
                        ({r.unmatchedClaims} unmatched)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span>Page {page} of {totalPages} · {total.toLocaleString()} rows</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
