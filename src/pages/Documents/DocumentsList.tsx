import { useEffect, useRef, useState } from 'react';
import { getDocuments, uploadDocument, type Document } from '@/api/documents';

export function DocumentsList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setIsLoading(true);
    getDocuments({ pageSize: 20 })
      .then((res) => setDocuments(res.data))
      .catch(() => setError('Failed to load documents.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadDocument(file, 'other');
      load();
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading)
    return (
      <div role="status" className="text-slate-500">
        Loading documents…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Documents</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="upload-file"
            className="hidden"
            onChange={(e) => { void handleUpload(e); }}
            aria-label="Upload document"
          />
          <label
            htmlFor="upload-file"
            className={`btn-primary ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {isUploading ? 'Uploading…' : 'Upload Document'}
          </label>
        </div>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {uploadError}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-slate-500">No documents uploaded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{d.fileName}</td>
                  <td className="px-4 py-3 text-slate-700">{d.category}</td>
                  <td className="px-4 py-3 text-slate-700">{(d.fileSize / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3 text-slate-700">
                    {(() => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? d.createdAt : dt.toLocaleDateString(); })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
