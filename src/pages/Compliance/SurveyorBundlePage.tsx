import { useState } from 'react';
import {
  downloadSurveyorBundle,
  getSurveyorBundleManifest,
  type SurveyorBundleManifest,
} from '@/api/compliance';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime());
  from.setDate(from.getDate() - 365);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function metricCard(label: string, value: string) {
  return (
    <div className="card-hover min-w-[160px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-navy-900">
        {value}
      </div>
    </div>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

export function SurveyorBundlePage() {
  const [patientId, setPatientId] = useState('');
  const [range, setRange] = useState(defaultRange);
  const [manifest, setManifest] = useState<SurveyorBundleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  // Download maps to GET /compliance/surveyor-bundle/{id} → [Authorize(Policy =
  // compliance:surveyor_export)]. Preview (manifest) is GET under the same
  // policy as the route guard, so it stays unguarded.
  const canExport = usePermission(PERMISSIONS.COMPLIANCE_SURVEYOR_EXPORT);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDownloadedFile(null);
    setIsLoading(true);
    try {
      const m = await getSurveyorBundleManifest(
        Number(patientId),
        range.from,
        range.to,
      );
      setManifest(m);
    } catch (err) {
      setManifest(null);
      setError(extractError(err, 'Failed to preview bundle.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload() {
    setError(null);
    setIsDownloading(true);
    try {
      const file = await downloadSurveyorBundle(
        Number(patientId),
        range.from,
        range.to,
      );
      setDownloadedFile(file);
    } catch (err) {
      setError(extractError(err, 'Failed to download bundle.'));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          CMS Surveyor Evidence Bundle
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Generates a per-patient ZIP archive of survey-ready evidence — cert
          chain, face-to-face encounters, IDG meeting list, care plan reviews,
          and volunteer hours — bundled with a manifest the surveyor can scan
          first.
        </p>
      </header>

      <form
        onSubmit={handlePreview}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Patient ID</span>
          <input
            type="number"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
            min={1}
            className="form-input w-36"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">From</span>
          <input
            type="date"
            className="form-input"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">To</span>
          <input
            type="date"
            className="form-input"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Loading…' : 'Preview'}
        </button>
      </form>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {downloadedFile && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">
          Downloaded <strong>{downloadedFile}</strong>.
        </div>
      )}

      {manifest && (
        <>
          <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <strong className="text-slate-800">{manifest.patientName}</strong>{' '}
            <span className="text-slate-500">(Patient #{manifest.patientId})</span>
            <div className="mt-1 text-[13px] text-slate-500">
              Medicare ID: {manifest.medicareId ?? '—'}
              {' · '}Admitted: {manifest.admittedAt ?? '—'}
              {' · '}DOD: {manifest.dateOfDeath ?? '—'}
            </div>
            <div className="mt-1 text-[13px] text-slate-500">
              Window {manifest.windowFrom} → {manifest.windowTo} · generated{' '}
              {manifest.generatedAtUtc.slice(0, 19).replace('T', ' ')}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricCard('Elections', manifest.electionCount.toString())}
            {metricCard('Certifications', manifest.certificationCount.toString())}
            {metricCard('Face-to-Face', manifest.faceToFaceCount.toString())}
            {metricCard('Care Plan Reviews', manifest.carePlanReviewCount.toString())}
            {metricCard('IDG Meetings', manifest.idgMeetingCount.toString())}
            {metricCard(
              'Volunteer Hours',
              manifest.volunteerHoursTotal.toString(),
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">Bundle contents</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.files.map((f) => (
                    <tr
                      key={f.fileName}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono text-[13px] text-slate-700">
                        {f.fileName}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500">
                        {f.contentType}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {f.rowCount === 0 ? '—' : f.rowCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading || !canExport}
              title={!canExport ? NO_PERMISSION : undefined}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDownloading ? 'Generating ZIP…' : 'Download Bundle (.zip)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
