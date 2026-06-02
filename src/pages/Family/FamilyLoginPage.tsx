import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortalAuth } from '@/portal/PortalAuthContext';

export function FamilyLoginPage() {
  const { loginAsFamily } = usePortalAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const reason = search.get('reason');

  const [patientId, setPatientId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pid = parseInt(patientId, 10);
    if (Number.isNaN(pid)) {
      setError('Patient ID must be a number');
      return;
    }
    setSubmitting(true);
    try {
      await loginAsFamily(pid, pin);
      navigate('/family/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        padding: 16,
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
        <h1
          data-testid="family-login-title"
          style={{ fontSize: 24, fontWeight: 700, color: '#0ea5e9', margin: 0, marginBottom: 4 }}
        >
          Family Login
        </h1>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          Enter your patient ID and PIN to view care updates.
        </div>

        {reason === 'expired' && (
          <div role="status" style={{ fontSize: 13, color: '#b45309', marginBottom: 4 }}>
            Your session has ended. Please log in again.
          </div>
        )}

        <label htmlFor="family-patient-id" style={{ fontSize: 13, color: '#475569' }}>
          Patient ID
        </label>
        <input
          id="family-patient-id"
          type="text"
          inputMode="numeric"
          data-testid="family-patient-id-input"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          required
          style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
        />

        <label htmlFor="family-pin" style={{ fontSize: 13, color: '#475569' }}>
          PIN
        </label>
        <input
          id="family-pin"
          type="password"
          data-testid="family-pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
          style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
        />

        {error && (
          <div
            role="alert"
            data-testid="family-login-error"
            style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="family-login-submit"
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
