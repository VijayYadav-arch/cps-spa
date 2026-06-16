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
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        Failed to load documents.
      </div>
    );
  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading…
      </div>
    );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title" className="text-2xl">
            Documents
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Securely shared files between you and CPS
          </p>
        </div>
        <button
          disabled
          data-testid="action-upload-document"
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          title="Upload coming soon"
        >
          Upload Document
        </button>
      </div>

      <div
        data-testid="documents-list"
        className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
      >
        {documents.length === 0 ? (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            No documents yet.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              data-testid="document-row"
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3">
                <h3
                  data-testid="document-name"
                  className="mb-1 text-sm font-semibold text-slate-700"
                  title={doc.fileName}
                >
                  {doc.fileName}
                </h3>
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {CATEGORY_LABELS[doc.category] ?? doc.category}
                </span>
              </div>
              <div className="mb-2 flex gap-3 text-xs text-slate-400">
                <span>{formatFileSize(doc.fileSize)}</span>
                <span data-testid="document-uploaded">{formatDate(doc.createdAt)}</span>
              </div>
              {doc.notes && (
                <p className="mb-2 text-xs text-slate-500">{doc.notes}</p>
              )}
              <div className="mt-auto border-t border-slate-100 pt-3">
                {doc.filePath ? (
                  <a
                    href={doc.filePath}
                    download
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs italic text-slate-400">Not available</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
