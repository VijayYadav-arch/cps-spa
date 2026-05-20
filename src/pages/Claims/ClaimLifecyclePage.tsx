import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClaimLifecycle,
  type ClaimLifecycle,
  type ClaimLifecycleEvent,
} from '@/api/claims';

const EVENT_COLOR: Record<ClaimLifecycleEvent['eventType'], string> = {
  'created': '#64748b',
  'submitted': '#0369a1',
  'status-checked': '#475569',
  'ack': '#0284c7',
  'era-posted': '#15803d',
};

function badge(text: string, bg: string, color = '#fff') {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: bg, color, fontSize: 12, fontWeight: 600,
    }}>
      {text}
    </span>
  );
}

function statusBadge(status: string) {
  const tone =
    status === 'paid' ? '#15803d'
      : status === 'submitted' ? '#0369a1'
      : status === 'rejected' || status === 'denied' ? '#b91c1c'
      : '#64748b';
  return badge(status, tone);
}

export function ClaimLifecyclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lifecycle, setLifecycle] = useState<ClaimLifecycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getClaimLifecycle(parseInt(id, 10))
      .then((data) => { if (!cancelled) setLifecycle(data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(status === 404 ? 'Claim not found' : 'Failed to load lifecycle');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return (
    <div style={{ padding: 24 }}>
      <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>
      <button type="button" onClick={() => navigate('/claims')}>Back to claims</button>
    </div>
  );
  if (!lifecycle) return null;

  const { header, submissions, eraPostings, serviceLines, events } = lifecycle;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={() => navigate(`/claims/${header.id}`)}>
          ← Back to claim
        </button>
        <h1 style={{ margin: 0 }}>Claim {header.claimNumber} lifecycle</h1>
      </div>

      {/* Header card */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
        marginBottom: 24, background: '#f8fafc',
      }}>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Status</div>
          <div style={{ marginTop: 4 }}>{statusBadge(header.status)}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Patient</div>
          <div style={{ fontWeight: 600 }}>{header.patientName}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Payer</div>
          <div style={{ fontWeight: 600 }}>{header.payer}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Service date</div>
          <div>{new Date(header.serviceDate).toLocaleDateString()}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Charged</div>
          <div style={{ fontWeight: 600 }}>${header.amount.toFixed(2)}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 12 }}>Paid</div>
          <div style={{ fontWeight: 600, color: '#15803d' }}>
            {header.paidAmount != null ? `$${header.paidAmount.toFixed(2)}` : '—'}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <h2>Timeline</h2>
      {events.length === 0 ? (
        <div style={{ color: '#64748b' }}>No events yet.</div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
          {events.map((e, i) => (
            <li key={`${e.eventType}-${e.atUtc}-${i}`} style={{
              display: 'grid', gridTemplateColumns: '170px auto 1fr',
              gap: 12, alignItems: 'baseline', padding: '6px 0',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {new Date(e.atUtc).toLocaleString()}
              </div>
              <div>{badge(e.eventType, EVENT_COLOR[e.eventType])}</div>
              <div>{e.description}</div>
            </li>
          ))}
        </ol>
      )}

      {/* Submissions */}
      <h2>Submissions ({submissions.length})</h2>
      {submissions.length === 0 ? (
        <div style={{ color: '#64748b', marginBottom: 24 }}>No submissions yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Clearinghouse</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Tracking</th>
              <th style={{ padding: 8 }}>Submitted</th>
              <th style={{ padding: 8 }}>Ack</th>
              <th style={{ padding: 8 }}>EDI</th>
              <th style={{ padding: 8 }}>Order</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>{s.clearinghouse}</td>
                <td style={{ padding: 8 }}>{statusBadge(s.status)}</td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                  {s.clearinghouseTrackingId ?? s.trackingId ?? '—'}
                </td>
                <td style={{ padding: 8, fontSize: 13 }}>
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                </td>
                <td style={{ padding: 8, fontSize: 13 }}>{s.ackStatus ?? '—'}</td>
                <td style={{ padding: 8, fontSize: 13 }}>
                  {s.hasEdi837 && <span title="837 generated">837</span>}
                  {s.hasEdi837 && s.hasEdi835 && ' · '}
                  {s.hasEdi835 && <span title="835 received">835</span>}
                </td>
                <td style={{ padding: 8 }}>{s.payerOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ERA Postings */}
      <h2>ERA postings ({eraPostings.length})</h2>
      {eraPostings.length === 0 ? (
        <div style={{ color: '#64748b', marginBottom: 24 }}>No ERA postings yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Posted</th>
              <th style={{ padding: 8 }}>Payer</th>
              <th style={{ padding: 8 }}>Check</th>
              <th style={{ padding: 8 }}>Amount</th>
              <th style={{ padding: 8 }}>Matched</th>
            </tr>
          </thead>
          <tbody>
            {eraPostings.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>{new Date(e.postedAt).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{e.payerName}</td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                  {e.checkNumber ?? '—'}
                </td>
                <td style={{ padding: 8, fontWeight: 600, color: '#15803d' }}>
                  ${e.paymentAmount.toFixed(2)}
                </td>
                <td style={{ padding: 8 }}>
                  {e.matchedClaims}/{e.totalClaims}
                  {e.unmatchedClaims > 0 && (
                    <span style={{ color: '#b45309', marginLeft: 6 }}>
                      ({e.unmatchedClaims} unmatched)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Service lines */}
      <h2>Service lines ({serviceLines.length})</h2>
      {serviceLines.length === 0 ? (
        <div style={{ color: '#64748b' }}>No service lines.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>#</th>
              <th style={{ padding: 8 }}>CPT</th>
              <th style={{ padding: 8 }}>Service date</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Charges</th>
            </tr>
          </thead>
          <tbody>
            {serviceLines.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>{l.lineNumber}</td>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>
                  {l.procedureCode}{l.modifier1 ? `-${l.modifier1}` : ''}
                </td>
                <td style={{ padding: 8 }}>
                  {new Date(l.serviceDateFrom).toLocaleDateString()}
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  ${Number(l.charges).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
