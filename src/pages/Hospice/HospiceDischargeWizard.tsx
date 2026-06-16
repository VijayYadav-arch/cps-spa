import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createDischarge, type HospiceDischargeReason } from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const REASONS: { value: HospiceDischargeReason; label: string }[] = [
  { value: 'Transfer', label: 'Transfer to another hospice' },
  { value: 'OutOfServiceArea', label: 'Out of service area' },
  { value: 'NoLongerTerminal', label: 'No longer terminal' },
  { value: 'ForCause', label: 'For cause' },
  { value: 'AgencyClosure', label: 'Agency closure' },
];

export function HospiceDischargeWizard() {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState<HospiceDischargeReason | ''>('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [receivingAgency, setReceivingAgency] = useState('');
  const [outOfArea, setOutOfArea] = useState('');
  const [advanceNotice, setAdvanceNotice] = useState('');
  const [idgApproval, setIdgApproval] = useState('');
  const [physicianId, setPhysicianId] = useState('');
  const [altArrangements, setAltArrangements] = useState('');
  const [notes, setNotes] = useState('');
  const [invalidState, setInvalidState] = useState<{ msg: string; currentStatus: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Submit → createDischarge → POST .../discharge [Policy=hospice:discharge_manage]
  const canManage = usePermission(PERMISSIONS.HOSPICE_DISCHARGE_MANAGE);

  if (invalidState) {
    return (
      <div
        role="alert"
        className="m-6 grid max-w-3xl gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        <p>{invalidState.msg}</p>
        <p>Current status: {invalidState.currentStatus}</p>
        <Link
          to={`/hospice/elections/${electionId}`}
          className="font-medium text-teal-700 hover:underline"
        >
          Return to Election
        </Link>
      </div>
    );
  }

  async function submit() {
    setServerError(null);
    try {
      const result = await createDischarge(Number(electionId), {
        reason: reason as HospiceDischargeReason,
        effectiveDate,
        receivingAgencyName: receivingAgency || null,
        outOfAreaDestination: outOfArea || null,
        idgApprovalDate: idgApproval || null,
        physicianSignOffUserId: physicianId ? Number(physicianId) : null,
        advanceNoticeDate: advanceNotice || null,
        alternativeArrangements: altArrangements || null,
        reasonNotes: notes || null,
      });
      navigate(`/hospice/discharges/${result.id}`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 && err.response.data?.code === 'INVALID_STATE') {
        setInvalidState({
          msg: err.response.data.userMessage,
          currentStatus: err.response.data.currentStatus,
        });
      } else if (status === 400) {
        setServerError(JSON.stringify(err.response.data.errors));
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  }

  return (
    <div className="discharge-wizard grid max-w-3xl gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Discharge Patient</h2>
        <div className="section-line" />
      </header>

      <div
        aria-label="Progress"
        className="text-sm font-medium text-slate-600"
      >
        Step {step} of 3
      </div>

      {step === 1 && (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Step 1: Reason + Effective Date</h3>
          <fieldset className="m-0 grid gap-2 border-none p-0">
            <legend className="mb-2 text-sm font-semibold text-slate-700">Discharge reason</legend>
            {REASONS.map(r => (
              <div key={r.value}>
                <label className="flex items-center gap-2 text-slate-700">
                  <input
                    type="radio"
                    name="reason"
                    aria-label={r.label}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              </div>
            ))}
          </fieldset>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Effective date</span>
            <input
              id="effective-date"
              type="date"
              className="form-input"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
            />
          </label>

          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(2)}
              disabled={!reason || !effectiveDate}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Step 2: Reason-specific details</h3>

          {reason === 'Transfer' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Receiving agency</span>
              <input
                id="receiving-agency"
                className="form-input"
                value={receivingAgency}
                onChange={e => setReceivingAgency(e.target.value)}
              />
            </label>
          )}

          {reason === 'OutOfServiceArea' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Destination</span>
              <input
                id="destination"
                className="form-input"
                value={outOfArea}
                onChange={e => setOutOfArea(e.target.value)}
              />
            </label>
          )}

          {reason === 'ForCause' && (
            <>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Advance notice date</span>
                <input
                  id="advance-notice"
                  type="date"
                  className="form-input"
                  value={advanceNotice}
                  onChange={e => setAdvanceNotice(e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">IDG approval date</span>
                <input
                  id="idg-approval"
                  type="date"
                  className="form-input"
                  value={idgApproval}
                  onChange={e => setIdgApproval(e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Physician sign-off (user ID)</span>
                <input
                  id="physician-id"
                  className="form-input"
                  value={physicianId}
                  onChange={e => setPhysicianId(e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Alternative arrangements</span>
                <textarea
                  id="alt-arr"
                  className="form-input"
                  value={altArrangements}
                  onChange={e => setAltArrangements(e.target.value)}
                />
              </label>
            </>
          )}

          {reason === 'AgencyClosure' && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Receiving agency (optional)</span>
              <input
                id="receiving-agency-closure"
                className="form-input"
                value={receivingAgency}
                onChange={e => setReceivingAgency(e.target.value)}
              />
            </label>
          )}

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Notes</span>
            <textarea
              id="notes"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>Next</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Step 3: Review + Confirm</h3>
          <p className="text-slate-700">Reason: {reason}</p>
          <p className="text-slate-700">Effective: {effectiveDate}</p>
          {receivingAgency && <p className="text-slate-700">Receiving agency: {receivingAgency}</p>}
          {advanceNotice && <p className="text-slate-700">Advance notice: {advanceNotice}</p>}
          {notes && <p className="text-slate-700">Notes: {notes}</p>}

          {serverError && (
            <p
              role="alert"
              className="alert-danger rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
            >
              {serverError}
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              Submit
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
