import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '@/portal/PortalAuthContext';

export function PortalLogin() {
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const id = Number(patientId);
    if (!Number.isFinite(id) || id <= 0) {
      setError('Enter a valid patient ID');
      return;
    }
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }
    setSubmitting(true);
    try {
      await login(id, pin);
      navigate('/portal');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Sign in failed — check your patient ID and PIN.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          minWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: '#0ea5e9', marginBottom: 4 }}>
          Patient Portal
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          Sign in to view statements, pay your bill, and access documents.
        </div>

        <label htmlFor="patientId" style={{ fontSize: 13, color: '#475569' }}>
          Patient ID
        </label>
        <input
          id="patientId"
          type="text"
          inputMode="numeric"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
        />

        <label htmlFor="pin" style={{ fontSize: 13, color: '#475569' }}>
          PIN
        </label>
        <input
          id="pin"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
        />

        {error && (
          <div role="alert" style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 12,
            padding: '10px 16px',
            border: 'none',
            background: submitting ? '#94a3b8' : '#0ea5e9',
            color: '#fff',
            borderRadius: 6,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
