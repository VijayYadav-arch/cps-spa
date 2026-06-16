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

  if (isLoading) return <div role="status" className="text-slate-500">Loading Face-to-Face data…</div>;
  if (error) return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          Face-to-Face Encounter — Election #{electionId}, Period #{periodId}
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Required by 42 CFR 418.22(a)(4) prior to the start of the 3rd benefit period
          and every recertification thereafter. Must occur in the 30 days before period
          start.
        </p>
      </header>

      {periodFtf ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Recorded for this period</h3>
          <p className="mt-2 text-slate-700">
            <strong>{periodFtf.encounterDate}</strong> · {periodFtf.clinicianType} ·
            User #{periodFtf.clinicianUserId}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">
            {periodFtf.attestationText}
          </p>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold">Record New FTF Encounter</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Encounter Date</span>
              <input
                type="date"
                className="form-input"
                value={encounterDate}
                onChange={(e) => setEncounterDate(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Clinician Type</span>
              <select
                className="form-input"
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
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Clinician User ID</span>
            <input
              type="number"
              className="form-input"
              value={clinicianUserId}
              onChange={(e) => setClinicianUserId(e.target.value)}
              min={1}
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Attestation Text (required per CMS)</span>
            <textarea
              className="form-input"
              value={attestationText}
              onChange={(e) => setAttestationText(e.target.value)}
              rows={5}
              placeholder="In-person assessment performed. Patient remains terminally ill with a prognosis of 6 months or less."
              required
            />
          </label>
          {actionError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              {actionError}
            </div>
          )}
          <div>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Record FTF Encounter'}
            </button>
          </div>
        </form>
      )}

      {history.length > 0 && (
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold">History (all periods)</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Clinician Type</th>
                  <th className="px-4 py-3">Clinician</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">#{h.periodNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{h.encounterDate}</td>
                    <td className="px-4 py-3 text-slate-700">{h.clinicianType}</td>
                    <td className="px-4 py-3 text-slate-700">#{h.clinicianUserId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
