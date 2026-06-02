import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface DocumentItem {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  notes: string | null;
  filePath: string | null;
  createdAt: string;
}

interface DocsEnvelope {
  data: DocumentItem[];
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_LABELS: Record<string, string> = {
  contract: 'Contract',
  eob: 'EOB',
  supporting: 'Supporting',
  other: 'Other',
};

export function CommercialDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<DocsEnvelope>('/documents?orderBy=createdAt:desc')
      .then((res) => {
        if (cancelled) return;
        setDocuments(res.data.data ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load documents.
      </div>
    );
  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

  return (
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
            Documents
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Securely shared files between you and CPS
          </p>
        </div>
        <button
          disabled
          data-testid="action-upload-document"
          style={{
            padding: '10px 16px',
            background: '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'not-allowed',
            opacity: 0.5,
          }}
          title="Upload coming soon"
        >
          Upload Document
        </button>
      </div>

      <div
        data-testid="documents-list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {documents.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 48,
              textAlign: 'center',
              color: '#94a3b8',
              background: 'white',
              borderRadius: 12,
              border: '1px solid #f1f5f9',
            }}
          >
            No documents yet.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              data-testid="document-row"
              style={{
                background: 'white',
                padding: 16,
                borderRadius: 12,
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <h3
                  data-testid="document-name"
                  style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
                  title={doc.fileName}
                >
                  {doc.fileName}
                </h3>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    fontSize: 11,
                    background: '#f1f5f9',
                    color: '#475569',
                    borderRadius: 4,
                  }}
                >
                  {CATEGORY_LABELS[doc.category] ?? doc.category}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  marginBottom: 8,
                  display: 'flex',
                  gap: 12,
                }}
              >
                <span>{formatFileSize(doc.fileSize)}</span>
                <span data-testid="document-uploaded">{formatDate(doc.createdAt)}</span>
              </div>
              {doc.notes && (
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {doc.notes}
                </p>
              )}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 12,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                {doc.filePath ? (
                  <a
                    href={doc.filePath}
                    download
                    style={{
                      color: '#0d9488',
                      fontSize: 12,
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    Download
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    Not available
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
