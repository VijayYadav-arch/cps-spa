import { useEffect, useState } from 'react';
import {
  buildSecondary837,
  listEligibleSecondary,
  type Secondary837Result,
  type SecondaryEligibleClaim,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const CLEARINGHOUSES = [
  'availity',
  'change-healthcare',
  'waystar',
  'ability-network',
  'office-ally',
  'mock',
];

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

export function SecondaryClaimsPage() {
  const [items, setItems] = useState<SecondaryEligibleClaim[]>([]);
  const [clearinghouse, setClearinghouse] = useState('availity');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [building, setBuilding] = useState<number | null>(null);
  const [result, setResult] = useState<Secondary837Result | null>(null);

  // Build 837 calls POST /billing/secondary-claims/{id}/build → billing:scrub.
  const canBuild = usePermission(PERMISSIONS.BILLING_SCRUB);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listEligibleSecondary();
      setItems(data);
    } catch {
      setError('Failed to load eligible claims.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function handleBuild(c: SecondaryEligibleClaim) {
    setError(null);
    setActionMsg(null);
    setBuilding(c.claimId);
    try {
      const r = await buildSecondary837(c.claimId, clearinghouse);
      setResult(r);
      setActionMsg(
        `Generated secondary 837 for ${c.claimNumber} (submission #${r.submissionId}, control ${r.controlNumber}).`,
      );
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to build secondary 837.'));
    } finally {
      setBuilding(null);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Secondary Payer Submissions</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Claims with partial primary payment + secondary payer set. Generate a
          COB-framed secondary 837 to recover the remaining balance.
        </p>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Clearinghouse for outgoing secondary 837</span>
          <select
            value={clearinghouse}
            onChange={(e) => setClearinghouse(e.target.value)}
            style={{ minWidth: 220 }}
          >
            {CLEARINGHOUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading && <div role="status">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <p style={{ color: '#64748b' }}>
          No claims currently eligible for secondary submission. They appear here
          when a primary 835 pays partial and the claim has a SecondaryPayer set.
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Claim</th>
              <th style={{ padding: '6px 10px' }}>Patient</th>
              <th style={{ padding: '6px 10px' }}>Primary</th>
              <th style={{ padding: '6px 10px' }}>Secondary</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Charges</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Primary Paid</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Balance</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.claimId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}>
                  {c.claimNumber}
                </td>
                <td style={{ padding: '6px 10px' }}>{c.patientName}</td>
                <td style={{ padding: '6px 10px' }}>{c.primaryPayer}</td>
                <td style={{ padding: '6px 10px' }}>{c.secondaryPayer}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {formatMoney(c.chargeAmount)}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {formatMoney(c.primaryPaidAmount)}
                </td>
                <td
                  style={{
                    padding: '6px 10px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#0e7490',
                  }}
                >
                  {formatMoney(c.balanceForSecondary)}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <button
                    type="button"
                    onClick={() => void handleBuild(c)}
                    disabled={building === c.claimId || !canBuild}
                    title={!canBuild ? NO_PERMISSION : undefined}
                    style={{ fontSize: 12 }}
                  >
                    {building === c.claimId ? 'Building…' : 'Build 837'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && (
        <section
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 16,
            background: '#f8fafc',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                Secondary 837 — Submission #{result.submissionId}
              </h3>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Control #{result.controlNumber} · Primary paid{' '}
                {formatMoney(result.primaryPaidAmount)} · Secondary balance{' '}
                {formatMoney(result.secondaryClaimAmount)}
              </div>
            </div>
            <button type="button" onClick={() => setResult(null)}>Close</button>
          </div>
          {result.warnings.length > 0 && (
            <div style={{ background: '#fef3c7', padding: 10, borderRadius: 6 }}>
              <strong style={{ color: '#92400e' }}>Warnings:</strong>
              <ul style={{ marginTop: 6, paddingLeft: 18, color: '#92400e' }}>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <pre
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: 12,
              borderRadius: 6,
              maxHeight: 320,
              overflow: 'auto',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {result.edi837}
          </pre>
        </section>
      )}
    </div>
  );
}
