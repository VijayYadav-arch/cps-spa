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

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 160,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>
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
    <div style={{ padding: 24, maxWidth: 1100, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          CMS Surveyor Evidence Bundle
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Generates a per-patient ZIP archive of survey-ready evidence — cert
          chain, face-to-face encounters, IDG meeting list, care plan reviews,
          and volunteer hours — bundled with a manifest the surveyor can scan
          first.
        </p>
      </header>

      <form
        onSubmit={handlePreview}
        style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Patient ID</span>
          <input
            type="number"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
            min={1}
            style={{ width: 140 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>From</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>To</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Preview'}
        </button>
      </form>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {downloadedFile && (
        <div style={{ color: '#15803d' }}>
          Downloaded <strong>{downloadedFile}</strong>.
        </div>
      )}

      {manifest && (
        <>
          <section
            style={{
              padding: 12,
              borderRadius: 6,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <strong>{manifest.patientName}</strong>{' '}
            <span style={{ color: '#64748b' }}>(Patient #{manifest.patientId})</span>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              Medicare ID: {manifest.medicareId ?? '—'}
              {' · '}Admitted: {manifest.admittedAt ?? '—'}
              {' · '}DOD: {manifest.dateOfDeath ?? '—'}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              Window {manifest.windowFrom} → {manifest.windowTo} · generated{' '}
              {manifest.generatedAtUtc.slice(0, 19).replace('T', ' ')}
            </div>
          </section>

          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Elections', manifest.electionCount.toString(), '#0f172a')}
            {metricCard('Certifications', manifest.certificationCount.toString(), '#0f172a')}
            {metricCard('Face-to-Face', manifest.faceToFaceCount.toString(), '#0f172a')}
            {metricCard('Care Plan Reviews', manifest.carePlanReviewCount.toString(), '#0f172a')}
            {metricCard('IDG Meetings', manifest.idgMeetingCount.toString(), '#0f172a')}
            {metricCard(
              'Volunteer Hours',
              manifest.volunteerHoursTotal.toString(),
              '#0f172a',
            )}
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Bundle contents</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px' }}>File</th>
                  <th style={{ padding: '6px 10px' }}>Type</th>
                  <th style={{ padding: '6px 10px' }}>Rows</th>
                </tr>
              </thead>
              <tbody>
                {manifest.files.map((f) => (
                  <tr
                    key={f.fileName}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td
                      style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}
                    >
                      {f.fileName}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 13 }}>
                      {f.contentType}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {f.rowCount === 0 ? '—' : f.rowCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading || !canExport}
              title={!canExport ? NO_PERMISSION : undefined}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 16px',
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: (isDownloading || !canExport) ? 'not-allowed' : 'pointer',
              }}
            >
              {isDownloading ? 'Generating ZIP…' : 'Download Bundle (.zip)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
