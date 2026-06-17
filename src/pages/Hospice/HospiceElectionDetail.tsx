import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  getElection,
  submitNoe,
  beginRecertification,
  type HospiceElection,
  type NoeSubmissionMode,
} from '@/api/hospice';
import { HospiceNotrCard } from '@/components/HospiceNotrCard';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const BADGE_BASE =
  'inline-block rounded-full px-2 py-0.5 text-xs font-semibold';

function recertBadge(days: number) {
  if (days <= 7)
    return { tint: 'bg-red-100 text-red-800', label: 'Urgent' };
  if (days <= 15)
    return { tint: 'bg-amber-100 text-amber-800', label: 'Soon' };
  return { tint: 'bg-green-100 text-green-800', label: 'On Track' };
}

export function HospiceElectionDetail() {
  const { patientId, electionId } = useParams<{
    patientId: string;
    electionId: string;
  }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const canManageDischarge = auth.user?.roles.some(r =>
    ['physician', 'client_admin', 'system_admin'].includes(r)) ?? false;
  // Confirm Submission → submitNoe → POST .../noe/submit [Policy=hospice:manage]
  const canManage = usePermission(PERMISSIONS.HOSPICE_MANAGE);
  const [election, setElection] = useState<HospiceElection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoeModal, setShowNoeModal] = useState(false);
  const [noeMode, setNoeMode] = useState<NoeSubmissionMode | null>(null);
  const [noeUrl, setNoeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recertMsg, setRecertMsg] = useState<string | null>(null);

  async function handleBeginRecert() {
    if (!election || !patientId) return;
    setRecertMsg(null);
    try {
      const res = await beginRecertification(election.id, {
        certifyingPhysicianId: auth.user?.userId ?? 0,
        narrativeText: null,
      });
      if (res.f2fRequired) {
        setRecertMsg(
          `Period ${res.periodNumber} requires a face-to-face encounter before recertification — redirecting…`,
        );
        navigate(
          `/hospice/elections/${election.id}/periods/${res.periodId}/ftf`,
        );
      } else if (res.certId) {
        navigate(
          `/patients/${patientId}/hospice/${election.id}/certifications/${res.certId}`,
        );
      }
    } catch (e) {
      setRecertMsg(
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Could not begin recertification.',
      );
    }
  }

  const reload = () => {
    if (!electionId) return;
    setIsLoading(true);
    setError(null);
    getElection(parseInt(electionId, 10))
      .then(setElection)
      .catch(() => setError('Failed to load election.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(reload, [electionId]);

  async function handleSubmitNoe() {
    if (!election || !noeMode) return;
    setSubmitting(true);
    try {
      await submitNoe(election.id, {
        mode: noeMode,
        manualDocumentUrl: noeMode === 'Manual' ? noeUrl : null,
      });
      setShowNoeModal(false);
      setNoeMode(null);
      setNoeUrl('');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NOE submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading)
    return (
      <div role="status" className="text-slate-500">
        Loading election…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );
  if (!election) return null;

  const recert = election.currentPeriod
    ? recertBadge(election.currentPeriod.daysUntilRecertDue)
    : null;

  return (
    <div className="grid max-w-3xl gap-6 p-6">
      <header className="space-y-2">
        <div>
          <button
            onClick={() => navigate(`/patients/${patientId}`)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            ← Back to Patient
          </button>
        </div>
        <h2 className="text-2xl">Hospice Election #{election.id}</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Elected {election.electionDate} • {election.electionType} • Status:{' '}
          <strong>{election.status}</strong>
        </p>
      </header>

      {election.currentPeriod && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">
            Benefit Period {election.currentPeriod.periodNumber}
          </h3>
          <dl className="mt-3 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Start
            </dt>
            <dd className="text-slate-800">{election.currentPeriod.startDate}</dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              End
            </dt>
            <dd className="text-slate-800">{election.currentPeriod.endDate}</dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </dt>
            <dd className="text-slate-800">{election.currentPeriod.status}</dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Recert Due
            </dt>
            <dd className="text-slate-800">
              {election.currentPeriod.recertDueDate} (
              {election.currentPeriod.daysUntilRecertDue} days)
              {recert && (
                <span className={`ml-2 ${BADGE_BASE} ${recert.tint}`}>
                  {recert.label}
                </span>
              )}
            </dd>
          </dl>
        </section>
      )}

      {election.noe && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Notice of Election</h3>
          <dl className="mt-3 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </dt>
            <dd>
              <span
                className={`${BADGE_BASE} ${
                  election.noe.status === 'Submitted' ||
                  election.noe.status === 'ManualOverride'
                    ? 'bg-green-100 text-green-800'
                    : election.noe.status === 'Late'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {election.noe.status}
              </span>
            </dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Deadline
            </dt>
            <dd className="text-slate-800">
              {election.noe.deadlineDate} ({election.noe.daysUntilDeadline} days)
            </dd>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Payer
            </dt>
            <dd className="text-slate-800">{election.noe.payerCode}</dd>
            {election.noe.documentUrl && (
              <>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Document
                </dt>
                <dd>
                  <a
                    href={election.noe.documentUrl}
                    className="font-medium text-teal-700 hover:underline"
                  >
                    View PDF
                  </a>
                </dd>
              </>
            )}
            {election.noe.clearinghouseConfirmation && (
              <>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Confirmation
                </dt>
                <dd className="text-slate-800">
                  {election.noe.clearinghouseConfirmation}
                </dd>
              </>
            )}
          </dl>
          {election.noe.status === 'Pending' && (
            <button
              onClick={() => setShowNoeModal(true)}
              className="btn-primary mt-3"
            >
              Submit NOE
            </button>
          )}
        </section>
      )}

      {election.status === 'Active' && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/attendance`)
            }
            className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Record Attendance
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/per-diem-claim`)
            }
            className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            Generate Per-Diem Claim
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/hope`)
            }
            className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-700 transition-colors hover:bg-fuchsia-100"
          >
            Start HOPE Assessment
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/idg`)
            }
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            Schedule IDG Meeting
          </button>
          <button
            onClick={handleBeginRecert}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Begin Recertification
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/revoke`)
            }
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Revoke Election
          </button>
          <button
            onClick={() => navigate('/hospice/bereavement')}
            className="rounded-md border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
          >
            Bereavement Programs
          </button>
          <button
            onClick={() =>
              navigate(`/hospice/elections/${election.id}/addendum`)
            }
            className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
          >
            Election Addendum
          </button>
          {canManageDischarge && (
            <button
              onClick={() =>
                navigate(`/hospice/elections/${election.id}/discharge/new`)
              }
              className="rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
            >
              Discharge Patient
            </button>
          )}
        </div>
      )}

      {recertMsg && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {recertMsg}
        </div>
      )}

      {election.status === 'Discharged' && (
        <section className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3">
          <h3 className="text-lg font-semibold text-amber-800">Discharged</h3>
          <p className="mt-1 text-slate-600">
            This election has been discharged.
          </p>
          <Link
            to={`/hospice/discharges?electionId=${election.id}`}
            className="font-medium text-teal-700 hover:underline"
          >
            View discharge details →
          </Link>
        </section>
      )}

      <div>
        <HospiceNotrCard electionId={election.id} />
      </div>

      {showNoeModal && (
        <div
          role="dialog"
          aria-label="Submit NOE"
          className="fixed inset-0 flex items-center justify-center bg-black/40"
        >
          <div className="min-w-[400px] rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Submit NOE</h3>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setNoeMode('Clearinghouse')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  noeMode === 'Clearinghouse'
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Clearinghouse
              </button>
              <button
                onClick={() => setNoeMode('Manual')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  noeMode === 'Manual'
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Manual
              </button>
            </div>
            {noeMode === 'Manual' && (
              <label className="mt-3 grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">
                  Document URL
                </span>
                <input
                  type="url"
                  value={noeUrl}
                  onChange={(e) => setNoeUrl(e.target.value)}
                  className="form-input"
                />
              </label>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNoeModal(false);
                  setNoeMode(null);
                }}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNoe}
                disabled={
                  submitting || !canManage || !noeMode || (noeMode === 'Manual' && !noeUrl)
                }
                title={!canManage ? NO_PERMISSION : undefined}
                className="btn-primary"
              >
                {submitting ? 'Submitting…' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
