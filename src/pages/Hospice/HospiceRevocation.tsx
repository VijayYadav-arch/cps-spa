import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { revokeElection } from '@/api/hospice';

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
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Revoke Hospice Election
      </h2>
      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: 12 }}>
        Revocation Date
        <input
          type="date"
          value={revocationDate}
          onChange={(e) => setRevocationDate(e.target.value)}
          style={{ display: 'block', marginTop: 4 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Reason (optional)
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{ display: 'block', marginTop: 4, width: '100%' }}
        />
      </label>

      <fieldset
        style={{
          marginTop: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <legend>Acknowledgments</legend>
        {ACKNOWLEDGMENTS.map((text, idx) => (
          <label
            key={idx}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              marginTop: 8,
            }}
          >
            <input
              type="checkbox"
              checked={acks[idx]}
              onChange={(e) => {
                const next = [...acks];
                next[idx] = e.target.checked;
                setAcks(next);
              }}
            />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() =>
            navigate(`/patients/${patientId}/hospice/${electionId}`)
          }
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAcked || submitting}
          style={{
            background: '#b91c1c',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 4,
          }}
        >
          {submitting ? 'Revoking…' : 'Revoke Election'}
        </button>
      </div>
    </div>
  );
}
