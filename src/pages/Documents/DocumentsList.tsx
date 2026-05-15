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

  if (isLoading) return <div role="status">Loading documents…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Documents</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="upload-file"
            style={{ display: 'none' }}
            onChange={(e) => { void handleUpload(e); }}
            aria-label="Upload document"
          />
          <label
            htmlFor="upload-file"
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 4,
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: isUploading ? 0.7 : 1,
            }}
          >
            {isUploading ? 'Uploading…' : 'Upload Document'}
          </label>
        </div>
      </div>

      {uploadError && (
        <div role="alert" style={{ marginBottom: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4 }}>
          {uploadError}
        </div>
      )}

      {documents.length === 0 ? (
        <p style={{ color: '#64748b' }}>No documents uploaded yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>File Name</th>
              <th style={{ padding: '8px 12px' }}>Category</th>
              <th style={{ padding: '8px 12px' }}>Size</th>
              <th style={{ padding: '8px 12px' }}>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>{d.fileName}</td>
                <td style={{ padding: '8px 12px' }}>{d.category}</td>
                <td style={{ padding: '8px 12px' }}>{(d.fileSize / 1024).toFixed(1)} KB</td>
                <td style={{ padding: '8px 12px' }}>
                  {(() => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? d.createdAt : dt.toLocaleDateString(); })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
