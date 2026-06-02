import { useEffect, useState } from 'react';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface Doc {
  id: number;
  fileName: string;
  category: string;
  createdAt: string;
}

interface DocsResponse {
  data: Doc[];
}

export function FamilyDocuments() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<DocsResponse>(`/patients/${patientId}/documents`)
      .then((r) => setDocs(r.data.data ?? []))
      .catch(() =>
        setError('Unable to load documents. Please refresh or contact your care team.'),
      );
  }, [patientId]);

  if (error) {
    return (
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {error}
      </p>
    );
  }
  if (docs === null) {
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
        Documents
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
                Name
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Category
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Date
              </th>
            </tr>
          </thead>
          <tbody data-testid="documents-rows">
            {docs.map((d) => (
              <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>{d.fileName}</td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{d.category}</td>
                <td style={{ padding: '12px 16px' }}>
                  {new Date(d.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}
                  data-testid="documents-empty"
                >
                  No documents
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
