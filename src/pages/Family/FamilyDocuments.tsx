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
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<DocsResponse>(`/patients/${patientId}/documents`)
      .then((r) => setDocs(r.data.data ?? []))
      .catch(() =>
        setError('Unable to load documents. Please refresh or contact your care team.'),
      );
  }, [patientId]);

  async function handleDownload(doc: Doc) {
    if (!patientId) return;
    setDownloadingId(doc.id);
    try {
      const res = await familyApi.get<Blob>(
        `/patients/${patientId}/documents/${doc.id}/download`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download that document. Please try again or contact your care team.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (error) {
    return (
      <p
        data-testid="family-error"
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </p>
    );
  }
  if (docs === null) {
    return (
      <p data-testid="family-loading" role="status" className="p-4 text-slate-500">
        Loading…
      </p>
    );
  }

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <h1 data-testid="page-title" className="text-2xl">
        Documents
      </h1>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody data-testid="documents-rows">
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{d.fileName}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{d.category}</td>
                <td className="px-4 py-3 text-slate-700">
                  {new Date(d.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDownload(d)}
                    disabled={downloadingId === d.id}
                    className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                  >
                    {downloadingId === d.id ? 'Downloading…' : 'Download'}
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
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
