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
      <div role="alert" className="alert alert-danger">
        <p>{invalidState.msg}</p>
        <p>Current status: {invalidState.currentStatus}</p>
        <Link to={`/hospice/elections/${electionId}`}>Return to Election</Link>
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
    <div className="discharge-wizard" style={{ padding: 24, maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Discharge Patient</h1>

      <div aria-label="Progress" style={{ marginBottom: 24, color: '#475569' }}>
        Step {step} of 3
      </div>

      {step === 1 && (
        <section>
          <h2>Step 1: Reason + Effective Date</h2>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>Discharge reason</legend>
            {REASONS.map(r => (
              <div key={r.value} style={{ marginBottom: 8 }}>
                <label>
                  <input
                    type="radio"
                    name="reason"
                    aria-label={r.label}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    style={{ marginRight: 8 }}
                  />
                  {r.label}
                </label>
              </div>
            ))}
          </fieldset>

          <div style={{ marginTop: 16 }}>
            <label htmlFor="effective-date" style={{ display: 'block', marginBottom: 4 }}>
              Effective date
            </label>
            <input
              id="effective-date"
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!reason || !effectiveDate}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>Step 2: Reason-specific details</h2>

          {reason === 'Transfer' && (
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="receiving-agency" style={{ display: 'block', marginBottom: 4 }}>
                Receiving agency
              </label>
              <input
                id="receiving-agency"
                value={receivingAgency}
                onChange={e => setReceivingAgency(e.target.value)}
              />
            </div>
          )}

          {reason === 'OutOfServiceArea' && (
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="destination" style={{ display: 'block', marginBottom: 4 }}>
                Destination
              </label>
              <input
                id="destination"
                value={outOfArea}
                onChange={e => setOutOfArea(e.target.value)}
              />
            </div>
          )}

          {reason === 'ForCause' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="advance-notice" style={{ display: 'block', marginBottom: 4 }}>
                  Advance notice date
                </label>
                <input
                  id="advance-notice"
                  type="date"
                  value={advanceNotice}
                  onChange={e => setAdvanceNotice(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="idg-approval" style={{ display: 'block', marginBottom: 4 }}>
                  IDG approval date
                </label>
                <input
                  id="idg-approval"
                  type="date"
                  value={idgApproval}
                  onChange={e => setIdgApproval(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="physician-id" style={{ display: 'block', marginBottom: 4 }}>
                  Physician sign-off (user ID)
                </label>
                <input
                  id="physician-id"
                  value={physicianId}
                  onChange={e => setPhysicianId(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="alt-arr" style={{ display: 'block', marginBottom: 4 }}>
                  Alternative arrangements
                </label>
                <textarea
                  id="alt-arr"
                  value={altArrangements}
                  onChange={e => setAltArrangements(e.target.value)}
                />
              </div>
            </>
          )}

          {reason === 'AgencyClosure' && (
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="receiving-agency-closure" style={{ display: 'block', marginBottom: 4 }}>
                Receiving agency (optional)
              </label>
              <input
                id="receiving-agency-closure"
                value={receivingAgency}
                onChange={e => setReceivingAgency(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="notes" style={{ display: 'block', marginBottom: 4 }}>
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep(1)}>Back</button>
            <button type="button" onClick={() => setStep(3)}>Next</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>Step 3: Review + Confirm</h2>
          <p>Reason: {reason}</p>
          <p>Effective: {effectiveDate}</p>
          {receivingAgency && <p>Receiving agency: {receivingAgency}</p>}
          {advanceNotice && <p>Advance notice: {advanceNotice}</p>}
          {notes && <p>Notes: {notes}</p>}

          {serverError && (
            <p role="alert" className="alert-danger" style={{ color: '#b91c1c' }}>
              {serverError}
            </p>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep(2)}>Back</button>
            <button
              type="button"
              onClick={submit}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
            >
              Submit
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
