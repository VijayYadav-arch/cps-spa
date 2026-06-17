import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createElection } from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const PAYER_OPTIONS = [
  { value: 'MEDICARE_A', label: 'Medicare Part A' },
  { value: 'MEDICAID', label: 'Medicaid' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'SELF_PAY', label: 'Self-Pay' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeNoeDeadline(electionDate: string): string {
  const dt = new Date(electionDate);
  if (isNaN(dt.getTime())) return electionDate;
  dt.setDate(dt.getDate() + 5);
  return dt.toISOString().slice(0, 10);
}

export function HospiceElectionWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Pre-fill from intake's admission date when handed off from the intake wizard.
  const prefillDate = searchParams.get('electionDate');
  const [step, setStep] = useState(1);
  const [electionDate, setElectionDate] = useState(
    prefillDate && /^\d{4}-\d{2}-\d{2}$/.test(prefillDate) ? prefillDate : todayIso(),
  );
  const [payerCode, setPayerCode] = useState('MEDICARE_A');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientId = id ? parseInt(id, 10) : 0;

  // Confirm submits createElection → POST /hospice/elections [Policy=hospice:manage]
  const canManage = usePermission(PERMISSIONS.HOSPICE_MANAGE);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const election = await createElection({
        patientId,
        admissionId: null,
        electionDate,
        payerCode,
      });
      navigate(`/patients/${patientId}/hospice/${election.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create election.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Hospice Election</h2>
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      <div aria-label="Progress" className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              s === step
                ? 'bg-teal-600 text-white'
                : s < step
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-slate-200 text-slate-400'
            }`}
          >
            {s}
          </span>
        ))}
        <span className="ml-2 text-sm font-medium text-slate-600">
          Step {step} of 3
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Step 1 — Election Date</h3>
          <label className="grid max-w-xs gap-1.5">
            <span className="text-sm font-medium text-slate-600">Election Date</span>
            <input
              type="date"
              value={electionDate}
              onChange={(e) => setElectionDate(e.target.value)}
              className="form-input"
            />
          </label>
          <p className="text-slate-500">
            NOE deadline: <strong>{computeNoeDeadline(electionDate)}</strong> (5
            calendar days)
          </p>
          <div>
            <button onClick={() => setStep(2)} className="btn-primary">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Step 2 — Payer</h3>
          <label className="grid max-w-xs gap-1.5">
            <span className="text-sm font-medium text-slate-600">Payer</span>
            <select
              value={payerCode}
              onChange={(e) => setPayerCode(e.target.value)}
              className="form-input"
            >
              {PAYER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back
            </button>
            <button onClick={() => setStep(3)} className="btn-primary">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Step 3 — Review</h3>
          <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Patient ID
            </dt>
            <dd className="text-slate-800">{patientId}</dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Election Date
            </dt>
            <dd className="text-slate-800">{electionDate}</dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Payer
            </dt>
            <dd className="text-slate-800">
              {PAYER_OPTIONS.find((p) => p.value === payerCode)?.label ?? payerCode}
            </dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              NOE Deadline
            </dt>
            <dd className="text-slate-800">{computeNoeDeadline(electionDate)}</dd>
          </dl>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || !canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary"
            >
              {submitting ? 'Creating…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
