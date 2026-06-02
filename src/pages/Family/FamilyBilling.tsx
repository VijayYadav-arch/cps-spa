import { useEffect, useState } from 'react';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface BillingRow {
  id: number;
  serviceDate: string;
  amount: number;
  status: string;
}

interface BillingResponse {
  data: BillingRow[];
}

export function FamilyBilling() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [rows, setRows] = useState<BillingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<BillingResponse>(`/patients/${patientId}/billing`)
      .then((r) => setRows(r.data.data ?? []))
      .catch(() =>
        setError('Unable to load billing records. Please refresh or contact your care team.'),
      );
  }, [patientId]);

  if (error) {
    return (
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {error}
      </p>
    );
  }
  if (rows === null) {
    return (
      <p data-testid="family-loading" style={{ color: '#94a3b8', padding: 16 }}>
        Loading…
      </p>
    );
  }

  return (
    <section style={{ padding: 16 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}
      >
        Billing
      </h1>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Service Date
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Amount
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody data-testid="billing-rows">
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  {new Date(r.serviceDate).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {Number(r.amount).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{r.status}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}
                  data-testid="billing-empty"
                >
                  No billing records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
