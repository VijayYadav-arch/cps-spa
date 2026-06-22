import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createHomeHealthEpisode } from '@/api/homehealth';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 60-day certification window end, for display. */
function certEnd(soc: string): string {
  const dt = new Date(soc);
  if (isNaN(dt.getTime())) return soc;
  dt.setDate(dt.getDate() + 59);
  return dt.toISOString().slice(0, 10);
}

const ADMISSION_SOURCES = [
  { value: 'community', label: 'Community (not from an inpatient stay)' },
  { value: 'institutional', label: 'Institutional (inpatient discharge within 14 days)' },
];

/**
 * Home-health admission wizard — creates a HomeHealthEpisode. The intake wizard
 * hands off here for a home_health admission (prefilling the Start of Care from the
 * admission date), closing the former dead-end.
 */
export function HomeHealthEpisodeWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = id ? parseInt(id, 10) : 0;

  const prefillSoc = searchParams.get('soc');
  const [startOfCare, setStartOfCare] = useState(
    prefillSoc && /^\d{4}-\d{2}-\d{2}$/.test(prefillSoc) ? prefillSoc : todayIso(),
  );
  const [admissionSource, setAdmissionSource] = useState('community');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = usePermission(PERMISSIONS.HOMEHEALTH_MANAGE);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const episode = await createHomeHealthEpisode({ patientId, startOfCareDate: startOfCare, admissionSource });
      navigate(`/patients/${patientId}/home-health/${episode.id}`);
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to create the home-health episode.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Home Health Admission</h2>
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid max-w-xs gap-1.5">
          <span className="text-sm font-medium text-slate-600">Start of Care</span>
          <input
            type="date"
            value={startOfCare}
            onChange={(e) => setStartOfCare(e.target.value)}
            className="form-input"
          />
        </label>
        <label className="grid max-w-md gap-1.5">
          <span className="text-sm font-medium text-slate-600">Admission Source</span>
          <select
            value={admissionSource}
            onChange={(e) => setAdmissionSource(e.target.value)}
            className="form-input"
          >
            {ADMISSION_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <p className="text-sm text-slate-500">
          Certification period: <strong>{startOfCare}</strong> → <strong>{certEnd(startOfCare)}</strong> (60 days)
        </p>
        <div>
          <button
            onClick={handleConfirm}
            disabled={submitting || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Admitting…' : 'Admit to Home Health'}
          </button>
        </div>
      </div>
    </div>
  );
}
