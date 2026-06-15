import { useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

const PATIENT_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'zipCode',
  'medicareId',
  'primaryDiagnosis',
] as const;

const CLAIM_FIELDS = [
  'claimNumber',
  'patientName',
  'serviceDate',
  'amount',
  'payer',
  'status',
  'denialReason',
] as const;

export function ImportPage() {
  const [importType, setImportType] = useState<'patients' | 'claims'>('patients');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import → POST /import/patients|claims → [Authorize(Policy = "admin:import")].
  const canImport = usePermission(PERMISSIONS.ADMIN_IMPORT);

  const fields = importType === 'patients' ? PATIENT_FIELDS : CLAIM_FIELDS;

  function processCsv(text: string) {
    setCsvText(text);
    setResult(null);
    setError(null);

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setError('CSV must have a header row and at least one data row.');
      return;
    }

    const headerRow = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    setHeaders(headerRow);
    const preview = lines.slice(1, 6).map((line) =>
      line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    );
    setPreviewRows(preview);

    const auto: Record<string, number> = {};
    for (const f of fields) {
      const idx = headerRow.findIndex(
        (h) => h.toLowerCase().replace(/[_\s-]/g, '') === f.toLowerCase()
      );
      if (idx !== -1) auto[f] = idx;
    }
    setMapping(auto);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processCsv(ev.target?.result as string);
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processCsv(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const endpoint = importType === 'patients' ? '/import/patients' : '/import/claims';
      const res = await apiClient.post<ImportResult>(endpoint, { csvData: csvText, mapping });
      setResult(res.data);
    } catch (err) {
      setError((err as Error).message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  function resetForType(next: 'patients' | 'claims') {
    setImportType(next);
    setResult(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
  }

  return (
    <section className="p-4 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-slate-900">Data Import</h1>
        <p className="text-slate-500 text-sm mt-1">Import patients or claims from CSV files.</p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Import Type</h2>
        <div className="flex gap-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={importType === 'patients'}
            onClick={() => resetForType('patients')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              importType === 'patients' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Patients
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={importType === 'claims'}
            onClick={() => resetForType('claims')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              importType === 'claims' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Claims
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Upload CSV</h2>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 cursor-pointer"
        >
          <p className="text-sm text-slate-600 font-medium">Drag and drop a CSV file, or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">Supports .csv files</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {headers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Preview (first 5 rows)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {headers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Column Mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <label key={field} className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 w-40">{field}</span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMapping((prev) => {
                      const next = { ...prev };
                      if (val === '') delete next[field];
                      else next[field] = Number(val);
                      return next;
                    });
                  }}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">-- Skip --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {headers.length > 0 && (
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || !canImport}
          title={!canImport ? NO_PERMISSION : undefined}
          className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 mb-6"
        >
          {importing ? 'Importing...' : `Import ${importType === 'patients' ? 'Patients' : 'Claims'}`}
        </button>
      )}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Import Results</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-sm text-green-600">Imported</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
              <p className="text-sm text-amber-600">Skipped</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-sm text-red-600">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Error Details</h3>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {result.errors.map((err, i) => (
                  <div key={i} className="px-3 py-2 text-sm border-b border-slate-100 last:border-0">
                    <span className="font-medium text-red-700">Row {err.row}:</span>{' '}
                    <span className="text-slate-600">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
