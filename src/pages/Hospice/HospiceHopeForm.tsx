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
    <div className="grid max-w-3xl gap-6 p-6">
      <div>
        <button
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={() => navigate(`/patients/${patientId}/hospice/${electionId}`)}
        >
          ← Back to Election
        </button>
      </div>
      <header className="space-y-2">
        <h2 className="text-2xl">
          HOPE Assessment {assessment ? `#${assessment.id}` : '(new)'}
        </h2>
        <div className="section-line" />
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {assessment && (
        <p className="text-slate-500">
          Status: <strong className="text-slate-800">{assessment.status}</strong> • Deadline:{' '}
          {assessment.deadlineDate} ({assessment.daysUntilDeadline} days)
        </p>
      )}

      {!assessment ? (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Submission Type</span>
            <select
              className="form-input"
              value={submissionType}
              onChange={(e) => setSubmissionType(e.target.value as HopeSubmissionType)}
            >
              {SUBMISSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Target Date</span>
            <input
              type="date"
              className="form-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Initial Payload (JSON)</span>
            <textarea
              className="form-input font-mono"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={8}
            />
          </label>
          <div>
            <button
              className="btn-primary"
              onClick={handleStart}
              disabled={working || !canAssess}
              title={!canAssess ? NO_PERMISSION : undefined}
            >
              {working ? 'Starting…' : 'Start HOPE Assessment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Payload (JSON)</span>
            <textarea
              className="form-input font-mono"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={12}
              disabled={assessment.status !== 'Draft'}
            />
          </label>
          <div className="flex gap-2">
            {assessment.status === 'Draft' && (
              <>
                <button
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={handleSavePayload}
                  disabled={working || !canAssess}
                  title={!canAssess ? NO_PERMISSION : undefined}
                >
                  Save Payload
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSign}
                  disabled={working || !canAssess}
                  title={!canAssess ? NO_PERMISSION : undefined}
                >
                  Sign
                </button>
              </>
            )}
            {assessment.status === 'Signed' && (
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={working || !canAssess}
                title={!canAssess ? NO_PERMISSION : undefined}
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
