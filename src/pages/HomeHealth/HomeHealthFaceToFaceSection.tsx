import { useEffect, useState } from 'react';
import {
  listFaceToFace,
  recordFaceToFace,
  type HomeHealthFaceToFace,
  type RecordFaceToFaceInput,
} from '@/api/homehealth';

const NO_PERMISSION = 'You do not have permission to perform this action';

/**
 * Certification Face-to-Face encounter (42 CFR 424.22) for a home-health episode. Lists recorded
 * encounters and — when the user can manage — offers a compact form to record one. The server
 * enforces the 90-day-before / 30-day-after-SOC window; this is a drafting surface.
 */
export function HomeHealthFaceToFaceSection({ episodeId, canManage }: { episodeId: number; canManage: boolean }) {
  const [rows, setRows] = useState<HomeHealthFaceToFace[]>([]);
  const [form, setForm] = useState<RecordFaceToFaceInput>({
    encounterDate: '',
    clinicianUserId: 0,
    clinicianType: 'Physician',
    attestationText: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFaceToFace(episodeId).then((r) => { if (!cancelled) setRows(r); }).catch(() => { /* section is best-effort */ });
    return () => { cancelled = true; };
  }, [episodeId]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const created = await recordFaceToFace(episodeId, {
        ...form,
        clinicianUserId: Number(form.clinicianUserId) || 0,
      });
      setRows((prev) => [created, ...prev]);
      setForm({ encounterDate: '', clinicianUserId: 0, clinicianType: 'Physician', attestationText: '' });
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { error?: string } } }).response;
      setError(resp?.data?.error ?? `Request failed (HTTP ${resp?.status ?? '?'})`);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = canManage && form.encounterDate !== '' && form.attestationText.trim() !== '' && form.clinicianUserId > 0;

  return (
    <section data-testid="hh-ftf-section" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">Face-to-Face encounter</h3>
      <p className="mt-1 text-sm text-slate-500">
        Required for certification — a physician or NP encounter related to the primary reason for
        home health, within 90 days before to 30 days after start of care.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Clinician</th>
              <th className="px-3 py-2">Attestation</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-2 text-slate-400" data-testid="hh-ftf-empty">No face-to-face recorded yet.</td></tr>
            )}
            {rows.map((f) => (
              <tr key={f.id} data-testid={`hh-ftf-${f.id}`} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-700">{new Date(f.encounterDate).toLocaleDateString('en-US')}</td>
                <td className="px-3 py-2 text-slate-700">#{f.clinicianUserId} · {f.clinicianType}</td>
                <td className="max-w-[360px] px-3 py-2 text-xs text-slate-600">{f.attestationText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Encounter date</label>
          <input type="date" data-testid="hh-ftf-date" value={form.encounterDate}
            onChange={(e) => setForm({ ...form, encounterDate: e.target.value })} className="form-input w-full" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Clinician type</label>
          <select data-testid="hh-ftf-type" value={form.clinicianType}
            onChange={(e) => setForm({ ...form, clinicianType: e.target.value as RecordFaceToFaceInput['clinicianType'] })}
            className="form-input w-full">
            <option value="Physician">Physician</option>
            <option value="NursePractitioner">Nurse Practitioner</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Clinician user ID</label>
          <input type="number" data-testid="hh-ftf-clinician" value={form.clinicianUserId || ''}
            onChange={(e) => setForm({ ...form, clinicianUserId: Number(e.target.value) })} className="form-input w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-600">Attestation</label>
          <textarea data-testid="hh-ftf-attestation" rows={2} value={form.attestationText}
            onChange={(e) => setForm({ ...form, attestationText: e.target.value })}
            placeholder="Encounter was related to the primary reason for home health."
            className="form-input w-full resize-y" />
        </div>
      </div>

      {error && <div role="alert" data-testid="hh-ftf-error" className="mt-2 text-sm text-red-700">{error}</div>}

      <div className="mt-3">
        <button type="button" data-testid="hh-ftf-submit" onClick={submit}
          disabled={!canSubmit || submitting}
          title={!canManage ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Recording…' : 'Record face-to-face'}
        </button>
      </div>
    </section>
  );
}
