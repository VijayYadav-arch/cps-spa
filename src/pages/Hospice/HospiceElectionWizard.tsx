import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createElection } from '@/api/hospice';

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
  const [step, setStep] = useState(1);
  const [electionDate, setElectionDate] = useState(todayIso());
  const [payerCode, setPayerCode] = useState('MEDICARE_A');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientId = id ? parseInt(id, 10) : 0;

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
    <div style={{ padding: 24, maxWidth: 640 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Hospice Election</h2>
        <button onClick={() => navigate(`/patients/${patientId}`)}>Cancel</button>
      </div>

      <div aria-label="Progress" style={{ marginBottom: 24, color: '#475569' }}>
        Step {step} of 3
      </div>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <h3>Step 1 — Election Date</h3>
          <label style={{ display: 'block', marginTop: 12 }}>
            Election Date
            <input
              type="date"
              value={electionDate}
              onChange={(e) => setElectionDate(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
          <p style={{ marginTop: 12, color: '#64748b' }}>
            NOE deadline: <strong>{computeNoeDeadline(electionDate)}</strong> (5
            calendar days)
          </p>
          <button onClick={() => setStep(2)} style={{ marginTop: 16 }}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>Step 2 — Payer</h3>
          <label style={{ display: 'block', marginTop: 12 }}>
            Payer
            <select
              value={payerCode}
              onChange={(e) => setPayerCode(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
            >
              {PAYER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(1)}>Back</button>
            <button onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3>Step 3 — Review</h3>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: '8px 16px',
              marginTop: 12,
            }}
          >
            <dt>Patient ID</dt>
            <dd>{patientId}</dd>
            <dt>Election Date</dt>
            <dd>{electionDate}</dd>
            <dt>Payer</dt>
            <dd>
              {PAYER_OPTIONS.find((p) => p.value === payerCode)?.label ?? payerCode}
            </dd>
            <dt>NOE Deadline</dt>
            <dd>{computeNoeDeadline(electionDate)}</dd>
          </dl>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(2)} disabled={submitting}>
              Back
            </button>
            <button onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Creating…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
