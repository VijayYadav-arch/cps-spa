import { useState } from 'react';
import {
  startBereavementProgram,
  type BereavementProgram,
} from '@/api/hospice';

interface Props {
  patientId: number;
  defaultDateOfDeath?: string;
  onCreated: (program: BereavementProgram) => void;
}

export function BereavementProgramStartForm({
  patientId,
  defaultDateOfDeath,
  onCreated,
}: Props) {
  const [dateOfDeath, setDateOfDeath] = useState(defaultDateOfDeath ?? '');
  const [coordinatorUserId, setCoordinatorUserId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dateOfDeath) {
      setError('Date of death is required.');
      return;
    }
    setBusy(true);
    try {
      const program = await startBereavementProgram(patientId, {
        dateOfDeath,
        coordinatorUserId: coordinatorUserId ? Number(coordinatorUserId) : null,
      });
      onCreated(program);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to start bereavement program.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600 }}>Start Bereavement Program</h3>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Date of Death</span>
        <input
          type="date"
          value={dateOfDeath}
          onChange={(e) => setDateOfDeath(e.target.value)}
          required
        />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Coordinator User ID (optional)</span>
        <input
          type="number"
          value={coordinatorUserId}
          onChange={(e) => setCoordinatorUserId(e.target.value)}
          min={1}
        />
      </label>
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      <button type="submit" disabled={busy}>
        {busy ? 'Starting…' : 'Start Program'}
      </button>
    </form>
  );
}
