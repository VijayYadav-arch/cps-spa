import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  startHopeAssessment,
  getHopeAssessment,
  updateHopePayload,
  signHopeAssessment,
  submitHopeAssessment,
  type HopeAssessment,
  type HopeSubmissionType,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const SUBMISSION_TYPES: HopeSubmissionType[] = [
  'Admission',
  'Update',
  'Recertification',
  'Discharge',
];

export function HospiceHopeForm() {
  const { id: patientId, electionId, assessmentId } = useParams<{
    id: string;
    electionId: string;
    assessmentId?: string;
  }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<HopeAssessment | null>(null);
  const [submissionType, setSubmissionType] = useState<HopeSubmissionType>('Admission');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [payload, setPayload] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Start (POST .../hope), save payload (PUT .../payload), sign (POST .../sign)
  // and submit-to-CMS (POST .../submit) are all gated by
  // hospice:clinical_assessment on the backend.
  const canAssess = usePermission(PERMISSIONS.HOSPICE_CLINICAL_ASSESSMENT);

  useEffect(() => {
    if (!assessmentId) return;
    getHopeAssessment(parseInt(assessmentId, 10))
      .then((a) => {
        setAssessment(a);
        setSubmissionType(a.submissionType);
        setTargetDate(a.targetDate);
        setPayload(a.payload);
      })
      .catch(() => setError('Failed to load HOPE assessment.'));
  }, [assessmentId]);

  async function handleStart() {
    if (!electionId) return;
    setWorking(true);
    setError(null);
    try {
      const created = await startHopeAssessment(parseInt(electionId, 10), {
        submissionType,
        targetDate,
        initialPayload: payload,
      });
      setAssessment(created);
      navigate(
        `/patients/${patientId}/hospice/${electionId}/hope/${created.id}`,
        { replace: true },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start HOPE assessment.');
    } finally {
      setWorking(false);
    }
  }

  async function handleSavePayload() {
    if (!assessment) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await updateHopePayload(assessment.id, { payload });
      setAssessment(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save payload.');
    } finally {
      setWorking(false);
    }
  }

  async function handleSign() {
    if (!assessment) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await signHopeAssessment(assessment.id);
      setAssessment(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign.');
    } finally {
      setWorking(false);
    }
  }

  async function handleSubmit() {
    if (!assessment) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await submitHopeAssessment(assessment.id);
      setAssessment(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <button
        onClick={() => navigate(`/patients/${patientId}/hospice/${electionId}`)}
        style={{ marginBottom: 16 }}
      >
        ← Back to Election
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        HOPE Assessment {assessment ? `#${assessment.id}` : '(new)'}
      </h2>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {assessment && (
        <p style={{ color: '#64748b', marginBottom: 16 }}>
          Status: <strong>{assessment.status}</strong> • Deadline:{' '}
          {assessment.deadlineDate} ({assessment.daysUntilDeadline} days)
        </p>
      )}

      {!assessment ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            Submission Type
            <select
              value={submissionType}
              onChange={(e) => setSubmissionType(e.target.value as HopeSubmissionType)}
              style={{ display: 'block', marginTop: 4 }}
            >
              {SUBMISSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target Date
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
          <label>
            Initial Payload (JSON)
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={8}
              style={{ display: 'block', marginTop: 4, width: '100%', fontFamily: 'monospace' }}
            />
          </label>
          <button
            onClick={handleStart}
            disabled={working || !canAssess}
            title={!canAssess ? NO_PERMISSION : undefined}
            style={{ cursor: (working || !canAssess) ? 'not-allowed' : 'pointer' }}
          >
            {working ? 'Starting…' : 'Start HOPE Assessment'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            Payload (JSON)
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={12}
              disabled={assessment.status !== 'Draft'}
              style={{ display: 'block', marginTop: 4, width: '100%', fontFamily: 'monospace' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {assessment.status === 'Draft' && (
              <>
                <button
                  onClick={handleSavePayload}
                  disabled={working || !canAssess}
                  title={!canAssess ? NO_PERMISSION : undefined}
                  style={{ cursor: (working || !canAssess) ? 'not-allowed' : 'pointer' }}
                >
                  Save Payload
                </button>
                <button
                  onClick={handleSign}
                  disabled={working || !canAssess}
                  title={!canAssess ? NO_PERMISSION : undefined}
                  style={{ cursor: (working || !canAssess) ? 'not-allowed' : 'pointer' }}
                >
                  Sign
                </button>
              </>
            )}
            {assessment.status === 'Signed' && (
              <button
                onClick={handleSubmit}
                disabled={working || !canAssess}
                title={!canAssess ? NO_PERMISSION : undefined}
                style={{ cursor: (working || !canAssess) ? 'not-allowed' : 'pointer' }}
              >
                Submit to CMS
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
