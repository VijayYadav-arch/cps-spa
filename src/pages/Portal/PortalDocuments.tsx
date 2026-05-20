import { useEffect, useState } from 'react';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { portalDocuments, type PortalDocument } from '@/portal/portalApi';

export function PortalDocuments() {
  const { me } = usePortalAuth();
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    portalDocuments(me.patientId)
      .then(setDocs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;
  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: '#dc2626' }}>{error}</div>;

  if (docs.length === 0) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Documents</h1>
        <div style={{ color: '#64748b' }}>No documents are available yet.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Documents</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>File</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Category</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 6px' }}>{d.fileName}</td>
              <td style={{ padding: '8px 6px' }}>{d.category}</td>
              <td style={{ padding: '8px 6px' }}>{d.uploadedAt.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
