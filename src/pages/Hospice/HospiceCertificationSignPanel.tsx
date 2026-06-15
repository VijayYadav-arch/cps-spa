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

  if (loading) return <div role="status">Loading…</div>;
  if (!cert) return <div role="alert">Certification not found.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Certification #{cert.id}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 16 }}>
        Status: <strong>{cert.status}</strong> • Certifying physician:{' '}
        {cert.certifyingPhysicianId}
      </p>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {cert.narrativeText && (
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Narrative</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{cert.narrativeText}</p>
        </section>
      )}

      {cert.status === 'Draft' && (
        <button
          onClick={handleSign}
          disabled={working || !canSign}
          title={!canSign ? NO_PERMISSION : undefined}
          style={{ cursor: (working || !canSign) ? 'not-allowed' : 'pointer' }}
        >
          {working ? 'Signing…' : 'Sign'}
        </button>
      )}

      {cert.status === 'Signed' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label>
            Countersigning physician user id
            <input
              type="number"
              value={countersignerId}
              onChange={(e) => setCountersignerId(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
          <button
            onClick={handleCountersign}
            disabled={working || !countersignerId || !canSign}
            title={!canSign ? NO_PERMISSION : undefined}
            style={{ cursor: (working || !countersignerId || !canSign) ? 'not-allowed' : 'pointer' }}
          >
            {working ? 'Countersigning…' : 'Countersign'}
          </button>
        </div>
      )}

      {cert.status === 'Countersigned' && (
        <p style={{ color: '#15803d' }}>Certification is fully countersigned.</p>
      )}
    </div>
  );
}
