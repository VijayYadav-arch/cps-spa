import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { revokeElection } from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const ACKNOWLEDGMENTS = [
  'The patient (or authorized representative) has been informed of the revocation and its consequences.',
  'The revocation is voluntary and not under duress.',
  "Care coordination and the patient's primary care team have been notified.",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HospiceRevocation() {
  const { patientId, electionId } = useParams<{
    patientId: string;
    electionId: string;
  }>();
  const navigate = useNavigate();
  const [revocationDate, setRevocationDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [acks, setAcks] = useState<boolean[]>([false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAcked = acks.every(Boolean);

  // Revoke Election → revokeElection → POST .../revoke [Policy=hospice:manage]
  const canManage = usePermission(PERMISSIONS.HOSPICE_MANAGE);

  async function handleSubmit() {
    if (!electionId) return;
    setSubmitting(true);
    setError(null);
    try {
      await revokeElection(parseInt(electionId, 10), {
        revocationDate,
        reason: reason.trim() || null,
      });
      navigate(`/patients/${patientId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revocation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-[600px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Revoke Hospice Election</h2>
        <div className="section-line" />
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-600">Revocation Date</span>
        <input
          type="date"
          className="form-input"
          value={revocationDate}
          onChange={(e) => setRevocationDate(e.target.value)}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-600">Reason (optional)</span>
        <textarea
          className="form-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </label>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <legend className="text-sm font-medium text-slate-600">Acknowledgments</legend>
        {ACKNOWLEDGMENTS.map((text, idx) => (
          <label key={idx} className="mt-2 flex items-start gap-2">
            <input
              type="checkbox"
              checked={acks[idx]}
              onChange={(e) => {
                const next = [...acks];
                next[idx] = e.target.checked;
                setAcks(next);
              }}
            />
            <span className="text-slate-700">{text}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex gap-2">
        <button
          onClick={() =>
            navigate(`/patients/${patientId}/hospice/${electionId}`)
          }
          disabled={submitting}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAcked || submitting || !canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          className="rounded-lg bg-error px-4 py-2 font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Revoking…' : 'Revoke Election'}
        </button>
      </div>
    </div>
  );
}
