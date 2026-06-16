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
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td
                  colSpan={3}
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
