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

const STATUS_COLORS: Record<ClaimSubmissionStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  submitted: { bg: '#dbeafe', fg: '#1e40af' },
  accepted: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
  paid: { bg: '#d1fae5', fg: '#065f46' },
};

function statusBadge(s: ClaimSubmissionStatus) {
  const { bg, fg } = STATUS_COLORS[s];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
      }}
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          Hospice Claim #{claimId} — 837I Submissions
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Generate an X12 837I EDI body for this hospice claim and track each
          submission through clearinghouse acknowledgement and final
          adjudication.
        </p>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 16,
          background: '#fff',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Export 837I
        </h3>
        <form
          onSubmit={handleExport}
          style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Clearinghouse</span>
            <select
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
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Prior auth number (optional)</span>
            <input
              type="text"
              value={priorAuth}
              onChange={(e) => setPriorAuth(e.target.value)}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
            <span>Claim note (optional)</span>
            <input
              type="text"
              value={claimNote}
              onChange={(e) => setClaimNote(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={isExporting || !canBill}
            title={!canBill ? NO_PERMISSION : undefined}
            style={{ justifySelf: 'start', cursor: (isExporting || !canBill) ? 'not-allowed' : 'pointer' }}
          >
            {isExporting ? 'Generating…' : 'Generate 837I'}
          </button>
        </form>

        {lastExport && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 6,
              background: '#f0fdf4',
              color: '#166534',
            }}
          >
            <div>
              <strong>Control #{lastExport.controlNumber}</strong>
              {' · '}TypeOfBill {lastExport.typeOfBill}
              {' · '}{lastExport.lineCount} lines
              {' · '}${lastExport.totalCharges.toFixed(2)}
            </div>
            {lastExport.warnings.length > 0 && (
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                {lastExport.warnings.map((w, i) => (
                  <li key={i} style={{ color: '#b45309' }}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Submissions ({submissions.length})
        </h3>
        {isLoading && <div role="status">Loading…</div>}
        {!isLoading && submissions.length === 0 && (
          <p style={{ color: '#64748b' }}>No submissions yet.</p>
        )}
        {!isLoading && submissions.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Created</th>
                <th style={{ padding: '6px 10px' }}>Clearinghouse</th>
                <th style={{ padding: '6px 10px' }}>Status</th>
                <th style={{ padding: '6px 10px' }}>Submitted</th>
                <th style={{ padding: '6px 10px' }}>Tracking</th>
                <th style={{ padding: '6px 10px' }}>Ack</th>
                <th style={{ padding: '6px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{s.createdAt.slice(0, 10)}</td>
                  <td style={{ padding: '6px 10px' }}>{s.clearinghouse}</td>
                  <td style={{ padding: '6px 10px' }}>{statusBadge(s.status)}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                    {s.submittedAt?.slice(0, 10) ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>
                    {s.clearinghouseTrackingId ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{s.ackStatus ?? '—'}</td>
                  <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => void openDetail(s.id)}
                      style={{ fontSize: 12 }}
                    >
                      View EDI
                    </button>
                    {s.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => void handleMarkSubmitted(s.id)}
                        disabled={!canBill}
                        title={!canBill ? NO_PERMISSION : undefined}
                        style={{ fontSize: 12, cursor: !canBill ? 'not-allowed' : 'pointer' }}
                      >
                        Mark Submitted
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && (
        <section
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 16,
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>
              Submission #{selected.id} EDI body
            </h3>
            <button type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            {selected.clearinghouse} · {statusBadge(selected.status)}
            {selected.ackMessage && (
              <span style={{ marginLeft: 12, color: '#475569' }}>
                Ack: {selected.ackMessage}
              </span>
            )}
          </div>
          <pre
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: 12,
              borderRadius: 6,
              maxHeight: 360,
              overflow: 'auto',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {selected.edi837 ?? '(no EDI body persisted)'}
          </pre>
        </section>
      )}
    </div>
  );
}
