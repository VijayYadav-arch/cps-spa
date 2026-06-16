import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listCertificationsByElection,
  signCertification,
  countersignCertification,
  type HospiceCertification,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function HospiceCertificationSignPanel() {
  const { electionId, certId } = useParams<{ electionId: string; certId: string }>();
  const navigate = useNavigate();
  const [cert, setCert] = useState<HospiceCertification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [countersignerId, setCountersignerId] = useState('');

  // Sign (POST /hospice/certifications/{id}/sign) and countersign
  // (.../countersign) are both gated by hospice:clinical_assessment.
  const canSign = usePermission(PERMISSIONS.HOSPICE_CLINICAL_ASSESSMENT);

  useEffect(() => {
    if (!electionId || !certId) return;
    listCertificationsByElection(parseInt(electionId, 10))
      .then((r) => {
        const found = r.data.find((c) => c.id === parseInt(certId, 10));
        setCert(found ?? null);
      })
      .catch(() => setError('Failed to load certification.'))
      .finally(() => setLoading(false));
  }, [electionId, certId]);

  async function handleSign() {
    if (!cert) return;
    setWorking(true);
    setError(null);
    try {
      setCert(await signCertification(cert.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign.');
    } finally {
      setWorking(false);
    }
  }

  async function handleCountersign() {
    if (!cert) return;
    const id = parseInt(countersignerId, 10);
    if (!id) {
      setError('Countersigning physician user id required.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      setCert(await countersignCertification(cert.id, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to countersign.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <div role="status" className="text-slate-500">Loading…</div>;
  if (!cert)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        Certification not found.
      </div>
    );

  return (
    <div className="grid max-w-[600px] gap-6 p-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>
      <header className="space-y-2">
        <h2 className="text-2xl">Certification #{cert.id}</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Status: <strong>{cert.status}</strong> • Certifying physician:{' '}
          {cert.certifyingPhysicianId}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}

      {cert.narrativeText && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Narrative</h3>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">{cert.narrativeText}</p>
        </section>
      )}

      {cert.status === 'Draft' && (
        <button
          onClick={handleSign}
          disabled={working || !canSign}
          title={!canSign ? NO_PERMISSION : undefined}
          className="btn-primary justify-self-start"
        >
          {working ? 'Signing…' : 'Sign'}
        </button>
      )}

      {cert.status === 'Signed' && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">
              Countersigning physician user id
            </span>
            <input
              type="number"
              className="form-input"
              value={countersignerId}
              onChange={(e) => setCountersignerId(e.target.value)}
            />
          </label>
          <button
            onClick={handleCountersign}
            disabled={working || !countersignerId || !canSign}
            title={!canSign ? NO_PERMISSION : undefined}
            className="btn-primary"
          >
            {working ? 'Countersigning…' : 'Countersign'}
          </button>
        </div>
      )}

      {cert.status === 'Countersigned' && (
        <p className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">
          Certification is fully countersigned.
        </p>
      )}
    </div>
  );
}
