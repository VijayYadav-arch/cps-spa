import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  getElection,
  submitNoe,
  type HospiceElection,
  type NoeSubmissionMode,
} from '@/api/hospice';
import { HospiceNotrCard } from '@/components/HospiceNotrCard';
import { useAuth } from '@/auth/useAuth';

function badgeStyle(color: string): CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    background: color,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
  };
}

function recertBadge(days: number) {
  if (days <= 7) return { color: '#b91c1c', label: 'Urgent' };
  if (days <= 15) return { color: '#d97706', label: 'Soon' };
  return { color: '#15803d', label: 'On Track' };
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
  const [election, setElection] = useState<HospiceElection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoeModal, setShowNoeModal] = useState(false);
  const [noeMode, setNoeMode] = useState<NoeSubmissionMode | null>(null);
  const [noeUrl, setNoeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  if (isLoading) return <div role="status">Loading election…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!election) return null;

  const recert = election.currentPeriod
    ? recertBadge(election.currentPeriod.daysUntilRecertDue)
    : null;

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <button
        onClick={() => navigate(`/patients/${patientId}`)}
        style={{ marginBottom: 16 }}
      >
        ← Back to Patient
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Hospice Election #{election.id}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Elected {election.electionDate} • {election.electionType} • Status:{' '}
        <strong>{election.status}</strong>
      </p>

      {election.currentPeriod && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3>Benefit Period {election.currentPeriod.periodNumber}</h3>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: '8px 16px',
            }}
          >
            <dt>Start</dt>
            <dd>{election.currentPeriod.startDate}</dd>
            <dt>End</dt>
            <dd>{election.currentPeriod.endDate}</dd>
            <dt>Status</dt>
            <dd>{election.currentPeriod.status}</dd>
            <dt>Recert Due</dt>
            <dd>
              {election.currentPeriod.recertDueDate} (
              {election.currentPeriod.daysUntilRecertDue} days)
              {recert && (
                <span style={{ ...badgeStyle(recert.color), marginLeft: 8 }}>
                  {recert.label}
                </span>
              )}
            </dd>
          </dl>
        </section>
      )}

      {election.noe && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3>Notice of Election</h3>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: '8px 16px',
            }}
          >
            <dt>Status</dt>
            <dd>
              <span
                style={badgeStyle(
                  election.noe.status === 'Submitted' ||
                    election.noe.status === 'ManualOverride'
                    ? '#15803d'
                    : election.noe.status === 'Late'
                      ? '#b91c1c'
                      : '#d97706',
                )}
              >
                {election.noe.status}
              </span>
            </dd>
            <dt>Deadline</dt>
            <dd>
              {election.noe.deadlineDate} ({election.noe.daysUntilDeadline} days)
            </dd>
            <dt>Payer</dt>
            <dd>{election.noe.payerCode}</dd>
            {election.noe.documentUrl && (
              <>
                <dt>Document</dt>
                <dd>
                  <a href={election.noe.documentUrl}>View PDF</a>
                </dd>
              </>
            )}
            {election.noe.clearinghouseConfirmation && (
              <>
                <dt>Confirmation</dt>
                <dd>{election.noe.clearinghouseConfirmation}</dd>
              </>
            )}
          </dl>
          {election.noe.status === 'Pending' && (
            <button onClick={() => setShowNoeModal(true)} style={{ marginTop: 8 }}>
              Submit NOE
            </button>
          )}
        </section>
      )}

      {election.status === 'Active' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/attendance`)
            }
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Record Attendance
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/per-diem-claim`)
            }
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Generate Per-Diem Claim
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/hope`)
            }
            style={{
              background: '#fdf4ff',
              color: '#a21caf',
              border: '1px solid #f5d0fe',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Start HOPE Assessment
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/idg`)
            }
            style={{
              background: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Schedule IDG Meeting
          </button>
          <button
            onClick={() =>
              navigate(`/patients/${patientId}/hospice/${election.id}/revoke`)
            }
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Revoke Election
          </button>
          <button
            onClick={() => navigate('/hospice/bereavement')}
            style={{
              background: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Bereavement Programs
          </button>
          <button
            onClick={() =>
              navigate(`/hospice/elections/${election.id}/addendum`)
            }
            style={{
              background: '#ecfeff',
              color: '#0e7490',
              border: '1px solid #a5f3fc',
              padding: '8px 16px',
              borderRadius: 4,
            }}
          >
            Election Addendum
          </button>
          {canManageDischarge && (
            <button
              onClick={() =>
                navigate(`/hospice/elections/${election.id}/discharge/new`)
              }
              style={{
                background: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
                padding: '8px 16px',
                borderRadius: 4,
              }}
            >
              Discharge Patient
            </button>
          )}
        </div>
      )}

      {election.status === 'Discharged' && (
        <section
          style={{
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            background: '#fffbeb',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Discharged</h3>
          <p style={{ color: '#64748b', marginBottom: 8 }}>
            This election has been discharged.
          </p>
          <Link to={`/hospice/discharges?electionId=${election.id}`}>
            View discharge details →
          </Link>
        </section>
      )}

      <div style={{ marginTop: 24 }}>
        <HospiceNotrCard electionId={election.id} />
      </div>

      {showNoeModal && (
        <div
          role="dialog"
          aria-label="Submit NOE"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
            }}
          >
            <h3>Submit NOE</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setNoeMode('Clearinghouse')}
                style={{
                  background: noeMode === 'Clearinghouse' ? '#2563eb' : '#fff',
                  color: noeMode === 'Clearinghouse' ? '#fff' : '#000',
                }}
              >
                Clearinghouse
              </button>
              <button
                onClick={() => setNoeMode('Manual')}
                style={{
                  background: noeMode === 'Manual' ? '#2563eb' : '#fff',
                  color: noeMode === 'Manual' ? '#fff' : '#000',
                }}
              >
                Manual
              </button>
            </div>
            {noeMode === 'Manual' && (
              <label style={{ display: 'block', marginTop: 12 }}>
                Document URL
                <input
                  type="url"
                  value={noeUrl}
                  onChange={(e) => setNoeUrl(e.target.value)}
                  style={{ display: 'block', marginTop: 4, width: '100%' }}
                />
              </label>
            )}
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => {
                  setShowNoeModal(false);
                  setNoeMode(null);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNoe}
                disabled={
                  submitting || !noeMode || (noeMode === 'Manual' && !noeUrl)
                }
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
