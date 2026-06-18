import { useEffect, useState } from 'react';
import {
  listEraPostings,
  postEra,
  type EraPostingRow,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

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

  // The manual 835 post (POST /billing/era) is gated by billing:era. The
  // upload-form toggle and pagination are not state-changing → not gated.
  const canPostEra = usePermission(PERMISSIONS.BILLING_ERA);

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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl">ERA postings</h2>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            Electronic remittance advice (835) postings — what payers have paid,
            check numbers, and per-ERA claim match counts. Drill into a
            specific claim's lifecycle for the line-level breakdown.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen((o) => !o)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {uploadOpen ? 'Cancel upload' : '+ Manual upload'}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}
      {uploadMessage && (
        <div
          className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${
            uploadMessage.startsWith('Failed')
              ? 'border-error bg-red-50 text-red-800'
              : 'border-success bg-green-50 text-green-800'
          }`}
        >
          {uploadMessage}
        </div>
      )}

      {uploadOpen && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500">
            Paste a raw 835 (preferred) <em>or</em> pass a submission id to
            re-fetch the remittance from the clearinghouse.
          </p>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Raw 835</span>
            <textarea
              value={raw835}
              onChange={(e) => setRaw835(e.target.value)}
              rows={6}
              placeholder="ISA*00*…~"
              className="form-input font-mono text-xs"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Or submission id</span>
            <input
              type="number"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              className="form-input w-52"
            />
          </label>
          <div>
            <button
              type="button"
              disabled={uploading || !canPostEra}
              aria-busy={uploading}
              title={!canPostEra ? NO_PERMISSION : undefined}
              onClick={() => { void submitUpload(); }}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading…' : 'Post ERA'}
            </button>
          </div>
        </div>
      )}

      {/* Summary row */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">This page paid</div>
            <div className="mt-1.5 text-2xl font-bold text-success">
              {formatMoney(totals.paid)}
            </div>
          </div>
          <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Matched (this page)</div>
            <div className="mt-1.5 text-2xl font-bold text-navy-900">
              {totals.matched.toLocaleString()}
            </div>
          </div>
          <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Unmatched (this page)</div>
            <div
              className={`mt-1.5 text-2xl font-bold ${
                totals.unmatched > 0 ? 'text-accent-600' : 'text-slate-600'
              }`}
            >
              {totals.unmatched.toLocaleString()}
            </div>
          </div>
          <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total postings</div>
            <div className="mt-1.5 text-2xl font-bold text-navy-900">
              {total.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No ERA postings yet.</div>
      )}

      {rows.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Posted</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Check #</th>
                  <th className="px-4 py-3">Check date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Matched</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{fmtDate(r.postedAt)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.payerName}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {r.checkNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.checkDate || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success">
                      {formatMoney(r.paymentAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.matchedClaims}/{r.matchedClaims + r.unmatchedClaims}
                      {r.unmatchedClaims > 0 && (
                        <span className="ml-1.5 text-xs text-accent-600">
                          ({r.unmatchedClaims} unmatched)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages} · {total.toLocaleString()} rows</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
