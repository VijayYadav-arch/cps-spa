import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  exportHospice837I,
  getClaimSubmission,
  listClaimSubmissions,
  markClaimSubmissionSubmitted,
  type ClaimSubmissionDetail,
  type ClaimSubmissionStatus,
  type ClaimSubmissionSummary,
  type Clearinghouse,
  type Hospice837IExportResult,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_BADGE: Record<ClaimSubmissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  submitted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-teal-100 text-teal-700',
};

function statusBadge(s: ClaimSubmissionStatus) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[s]}`}
    >
      {s}
    </span>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

export function HospiceClaimSubmissionsPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = Number(params.claimId);

  const [submissions, setSubmissions] = useState<ClaimSubmissionSummary[]>([]);
  const [selected, setSelected] = useState<ClaimSubmissionDetail | null>(null);
  const [clearinghouse, setClearinghouse] = useState<Clearinghouse>('availity');
  const [priorAuth, setPriorAuth] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [lastExport, setLastExport] = useState<Hospice837IExportResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Export 837I (POST .../export-837i) and mark-submitted
  // (POST /hospice/claim-submissions/{id}/mark-submitted) are both gated by
  // hospice:per_diem_billing on the backend.
  const canBill = usePermission(PERMISSIONS.HOSPICE_PER_DIEM_BILLING);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listClaimSubmissions(claimId);
      setSubmissions(data);
    } catch {
      setError('Failed to load submissions.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(claimId)) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionMsg(null);
    setIsExporting(true);
    try {
      const result = await exportHospice837I(claimId, {
        clearinghouse,
        priorAuthorizationNumber: priorAuth.trim() || null,
        claimNote: claimNote.trim() || null,
      });
      setLastExport(result);
      setActionMsg(`Exported 837I (submission #${result.submissionId}).`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to export 837I.'));
    } finally {
      setIsExporting(false);
    }
  }

  async function openDetail(id: number) {
    setError(null);
    try {
      setSelected(await getClaimSubmission(id));
    } catch (err) {
      setError(extractError(err, 'Failed to load submission detail.'));
    }
  }

  async function handleMarkSubmitted(id: number) {
    setError(null);
    const tracking = window.prompt(
      'Clearinghouse tracking id (optional):',
    );
    try {
      await markClaimSubmissionSubmitted(id, tracking?.trim() || null);
      setActionMsg(`Submission #${id} marked as submitted.`);
      await refresh();
      if (selected?.id === id) setSelected(await getClaimSubmission(id));
    } catch (err) {
      setError(extractError(err, 'Failed to mark submitted.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          Hospice Claim #{claimId} — 837I Submissions
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Generate an X12 837I EDI body for this hospice claim and track each
          submission through clearinghouse acknowledgement and final
          adjudication.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}
      {actionMsg && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">
          {actionMsg}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Export 837I</h3>
        <form
          onSubmit={handleExport}
          className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2"
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Clearinghouse</span>
            <select
              className="form-input"
              value={clearinghouse}
              onChange={(e) => setClearinghouse(e.target.value as Clearinghouse)}
            >
              <option value="availity">Availity</option>
              <option value="change-healthcare">Change Healthcare</option>
              <option value="waystar">Waystar</option>
              <option value="ability-network">Ability Network</option>
              <option value="office-ally">Office Ally</option>
              <option value="mock">Mock (test)</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Prior auth number (optional)</span>
            <input
              type="text"
              className="form-input"
              value={priorAuth}
              onChange={(e) => setPriorAuth(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-600">Claim note (optional)</span>
            <input
              type="text"
              className="form-input"
              value={claimNote}
              onChange={(e) => setClaimNote(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={isExporting || !canBill}
            title={!canBill ? NO_PERMISSION : undefined}
            className="btn-primary justify-self-start"
          >
            {isExporting ? 'Generating…' : 'Generate 837I'}
          </button>
        </form>

        {lastExport && (
          <div className="mt-3 rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 text-green-800">
            <div>
              <strong>Control #{lastExport.controlNumber}</strong>
              {' · '}TypeOfBill {lastExport.typeOfBill}
              {' · '}{lastExport.lineCount} lines
              {' · '}${lastExport.totalCharges.toFixed(2)}
            </div>
            {lastExport.warnings.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5">
                {lastExport.warnings.map((w, i) => (
                  <li key={i} className="text-accent-700">{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">
          Submissions ({submissions.length})
        </h3>
        {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
        {!isLoading && submissions.length === 0 && (
          <p className="text-slate-500">No submissions yet.</p>
        )}
        {!isLoading && submissions.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Clearinghouse</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Ack</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{s.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-700">{s.clearinghouse}</td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.submittedAt?.slice(0, 10) ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {s.clearinghouseTrackingId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.ackStatus ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openDetail(s.id)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          View EDI
                        </button>
                        {s.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => void handleMarkSubmitted(s.id)}
                            disabled={!canBill}
                            title={!canBill ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Mark Submitted
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="mb-3 flex justify-between">
            <h3 className="text-lg font-semibold">
              Submission #{selected.id} EDI body
            </h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div className="mb-2 text-sm text-slate-500">
            {selected.clearinghouse} · {statusBadge(selected.status)}
            {selected.ackMessage && (
              <span className="ml-3 text-slate-600">
                Ack: {selected.ackMessage}
              </span>
            )}
          </div>
          <pre className="max-h-90 overflow-auto whitespace-pre-wrap break-all rounded-md bg-navy-900 p-3 text-[11px] text-slate-200">
            {selected.edi837 ?? '(no EDI body persisted)'}
          </pre>
        </section>
      )}
    </div>
  );
}
