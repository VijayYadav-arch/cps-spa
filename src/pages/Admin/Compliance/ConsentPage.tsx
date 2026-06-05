import { useEffect, useRef, useState } from 'react';
import { listConsentForms, signConsentForm, type ConsentForm } from '@/api/consentForms';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  signed: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  revoked: 'bg-slate-50 text-slate-600 border-slate-200',
};

const FORM_TYPE_LABELS: Record<string, string> = {
  'election-of-benefits': 'Election of Benefits',
  abn: 'ABN',
  'hipaa-auth': 'HIPAA Auth',
  'consent-to-treat': 'Consent to Treat',
  dnr: 'DNR',
  'advance-directive': 'Advance Directive',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
        STATUS_BADGE[status] ?? STATUS_BADGE.pending
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function FormTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
      {FORM_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function ConsentPage() {
  const [forms, setForms] = useState<ConsentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signTarget, setSignTarget] = useState<ConsentForm | null>(null);

  useEffect(() => {
    let cancelled = false;
    listConsentForms({ pageSize: 100 })
      .then((res) => {
        if (!cancelled) setForms(res.data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message || 'Failed to load consent forms');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = forms.filter((f) => f.status === 'pending').length;

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">Consent Forms</h1>
        <p className="text-slate-600 mt-1">
          Manage patient consent forms and advance directives.
        </p>
      </header>

      {pendingCount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700 font-semibold">
            {pendingCount} consent form(s) pending signature
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading consent forms...</div>
        ) : forms.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No consent forms yet</p>
            <p className="text-sm">Patient consent forms will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Patient ID</th>
                <th className="px-5 py-3">Form Type</th>
                <th className="px-5 py-3">Signed By</th>
                <th className="px-5 py-3">Signature</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Witness</th>
                <th className="px-5 py-3">Expiration</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forms.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium">{f.patientId}</td>
                  <td className="px-5 py-4"><FormTypeBadge type={f.formType} /></td>
                  <td className="px-5 py-4 text-sm">
                    {f.signedBy ?? '—'}
                    {f.relationship && (
                      <span className="text-xs text-slate-400 ml-1">({f.relationship})</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {f.signatureImageDataUrl ? (
                      <img
                        src={f.signatureImageDataUrl}
                        alt={`Signature for form ${f.id}`}
                        className="h-10 w-24 object-contain border border-slate-200 rounded bg-white"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {f.signedAt ? new Date(f.signedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm">{f.witnessName ?? '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    {f.expirationDate ? new Date(f.expirationDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={f.status} /></td>
                  <td className="px-5 py-4">
                    {f.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => setSignTarget(f)}
                        className="text-xs text-teal-700 hover:text-teal-800 underline"
                      >
                        Sign
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {signTarget && (
        <SignConsentModal
          form={signTarget}
          onClose={() => setSignTarget(null)}
          onSigned={(updated) => {
            setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
            setSignTarget(null);
          }}
        />
      )}
    </section>
  );
}

function SignConsentModal({
  form,
  onClose,
  onSigned,
}: {
  form: ConsentForm;
  onClose: () => void;
  onSigned: (updated: ConsentForm) => void;
}) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [relationship, setRelationship] = useState('self');
  const [witnessName, setWitnessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!signedBy.trim()) {
      setError("Signer's name is required.");
      return;
    }
    const signatureImageDataUrl = padRef.current?.toDataUrl() ?? null;
    if (!signatureImageDataUrl) {
      setError('Please capture a signature before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await signConsentForm(form.id, {
        signedBy: signedBy.trim(),
        signatureImageDataUrl,
        relationship: relationship.trim() || undefined,
        witnessName: witnessName.trim() || undefined,
      });
      onSigned(updated);
    } catch (e) {
      setError((e as Error).message || 'Failed to record signature');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sign consent form ${form.id}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <header className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sign consent form</h2>
            <p className="text-xs text-slate-500">
              Patient {form.patientId} &middot;{' '}
              {FORM_TYPE_LABELS[form.formType] ?? form.formType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="signed-by" className="block text-xs font-medium text-slate-700 mb-1">
              Signer's name
            </label>
            <input
              id="signed-by"
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              placeholder="Full legal name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="relationship" className="block text-xs font-medium text-slate-700 mb-1">
                Relationship
              </label>
              <select
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
              >
                <option value="self">Self</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="legal-guardian">Legal Guardian</option>
                <option value="poa">Power of Attorney</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="witness-name" className="block text-xs font-medium text-slate-700 mb-1">
                Witness (optional)
              </label>
              <input
                id="witness-name"
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Signature</label>
            <SignaturePad ref={padRef} ariaLabel={`Signature for consent form ${form.id}`} />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => padRef.current?.clear()}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-1.5 text-sm rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Signing...' : 'Record signature'}
          </button>
        </footer>
      </div>
    </div>
  );
}
