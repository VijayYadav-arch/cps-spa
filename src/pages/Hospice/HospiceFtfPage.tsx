import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getFtfForPeriod,
  listFtfForElection,
  recordFtf,
  type FtfClinicianType,
  type HospiceFaceToFaceEncounter,
} from '@/api/hospice';

export function HospiceFtfPage() {
  const { electionId: idStr, periodId: pidStr } =
    useParams<{ electionId: string; periodId: string }>();
  const electionId = Number(idStr);
  const periodId = Number(pidStr);

  const [history, setHistory] = useState<HospiceFaceToFaceEncounter[]>([]);
  const [periodFtf, setPeriodFtf] = useState<HospiceFaceToFaceEncounter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [encounterDate, setEncounterDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [clinicianUserId, setClinicianUserId] = useState('');
  const [clinicianType, setClinicianType] = useState<FtfClinicianType>('Physician');
  const [attestationText, setAttestationText] = useState('');

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [list, current] = await Promise.all([
        listFtfForElection(electionId),
        getFtfForPeriod(periodId),
      ]);
      setHistory(list.data);
      setPeriodFtf(current);
    } catch {
      setError('Failed to load Face-to-Face encounters.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(electionId) && Number.isFinite(periodId)) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId, periodId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (!clinicianUserId || Number(clinicianUserId) <= 0) {
      setActionError('Clinician user ID is required.');
      return;
    }
    if (!attestationText.trim()) {
      setActionError('Attestation text is required per 42 CFR 418.22(a)(4).');
      return;
    }
    setBusy(true);
    try {
      await recordFtf(electionId, {
        periodId,
        encounterDate,
        clinicianUserId: Number(clinicianUserId),
        clinicianType,
        attestationText: attestationText.trim(),
      });
      setClinicianUserId('');
      setAttestationText('');
      await refresh();
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Failed to record Face-to-Face encounter.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div role="status">Loading Face-to-Face data…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          Face-to-Face Encounter — Election #{electionId}, Period #{periodId}
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Required by 42 CFR 418.22(a)(4) prior to the start of the 3rd benefit period
          and every recertification thereafter. Must occur in the 30 days before period
          start.
        </p>
      </header>

      {periodFtf ? (
        <section style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recorded for this period</h3>
          <p style={{ marginTop: 6 }}>
            <strong>{periodFtf.encounterDate}</strong> · {periodFtf.clinicianType} ·
            User #{periodFtf.clinicianUserId}
          </p>
          <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {periodFtf.attestationText}
          </p>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gap: 12, maxWidth: 600 }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Record New FTF Encounter</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Encounter Date</span>
              <input
                type="date"
                value={encounterDate}
                onChange={(e) => setEncounterDate(e.target.value)}
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Clinician Type</span>
              <select
                value={clinicianType}
                onChange={(e) =>
                  setClinicianType(e.target.value as FtfClinicianType)
                }
              >
                <option value="Physician">Physician (MD/DO)</option>
                <option value="NursePractitioner">Nurse Practitioner</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Clinician User ID</span>
            <input
              type="number"
              value={clinicianUserId}
              onChange={(e) => setClinicianUserId(e.target.value)}
              min={1}
              required
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Attestation Text (required per CMS)</span>
            <textarea
              value={attestationText}
              onChange={(e) => setAttestationText(e.target.value)}
              rows={5}
              placeholder="In-person assessment performed. Patient remains terminally ill with a prognosis of 6 months or less."
              required
            />
          </label>
          {actionError && (
            <div role="alert" style={{ color: '#b91c1c' }}>
              {actionError}
            </div>
          )}
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Record FTF Encounter'}
          </button>
        </form>
      )}

      {history.length > 0 && (
        <section style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>History (all periods)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Period</th>
                <th style={{ padding: '6px 10px' }}>Date</th>
                <th style={{ padding: '6px 10px' }}>Clinician Type</th>
                <th style={{ padding: '6px 10px' }}>Clinician</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>#{h.periodNumber}</td>
                  <td style={{ padding: '6px 10px' }}>{h.encounterDate}</td>
                  <td style={{ padding: '6px 10px' }}>{h.clinicianType}</td>
                  <td style={{ padding: '6px 10px' }}>#{h.clinicianUserId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
