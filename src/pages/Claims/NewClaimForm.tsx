import '@/styles/claims.css';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClaim, type CreateClaimPayload } from '@/api/claims';
import { getOrganizations } from '@/api/admin';

const PAYERS = [
  'Medicare',
  'Medicaid',
  'Blue Cross Blue Shield',
  'United Healthcare',
  'Aetna',
  'Other',
] as const;

interface OrgOption {
  id: number;
  name: string;
}

interface FormState {
  organizationId: string;
  claimNumber: string;
  patientName: string;
  serviceDate: string;
  amount: string;
  payer: string;
  primaryDiagnosis: string;
}

export function NewClaimForm() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [form, setForm] = useState<FormState>({
    organizationId: '',
    claimNumber: `CPS-${Date.now()}`,
    patientName: '',
    serviceDate: today,
    amount: '',
    payer: 'Medicare',
    primaryDiagnosis: '',
  });

  useEffect(() => {
    getOrganizations({ pageSize: 100 })
      .then((res) => {
        setOrgs((res.data ?? []).map((o) => ({ id: o.id, name: o.name })));
      })
      .catch(() => {
        // Non-fatal — admin may not have organizations:view; the select renders empty.
      })
      .finally(() => setLoadingOrgs(false));
  }, []);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.patientName.trim()) {
      setError('Patient name is required');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateClaimPayload = {
        patientName: form.patientName.trim(),
        serviceDate: form.serviceDate,
        amount: Number(form.amount),
        payer: form.payer,
        diagnosisCodeA: form.primaryDiagnosis.trim() || undefined,
      };
      const created = await createClaim(payload);
      navigate(`/claims/${created.id}`);
    } catch (e) {
      setError((e as Error).message || 'Failed to create claim');
      setSubmitting(false);
    }
  }

  const inputCls =
    'px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500 w-full';

  return (
    <section className="max-w-3xl mx-auto p-4 lg:p-8">
      <div className="mb-6">
        <Link to="/claims" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Back to Claims
        </Link>
      </div>

      <h1 className="text-2xl font-serif text-navy-900 mb-2">New Claim</h1>
      <p className="text-navy-600 mb-6">
        Quick-create a billing claim with essential fields. Server assigns the final claim number.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">Client Organization</span>
          {loadingOrgs ? (
            <div className={`${inputCls} bg-slate-50 text-slate-400`}>Loading organizations...</div>
          ) : (
            <select
              value={form.organizationId}
              onChange={(e) => set('organizationId', e.target.value)}
              className={inputCls}
            >
              <option value="">(Uses your active organization)</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs text-navy-500">
            Server stamps the claim with your active organization regardless of selection.
          </span>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">Claim Number</span>
          <input
            type="text"
            value={form.claimNumber}
            readOnly
            className={`${inputCls} bg-slate-50`}
          />
          <span className="text-xs text-navy-500">Auto-generated; server may override on save.</span>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">
            Patient Name <span className="text-red-600">*</span>
          </span>
          <input
            type="text"
            value={form.patientName}
            onChange={(e) => set('patientName', e.target.value)}
            required
            placeholder="Jane Doe"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">
            Service Date <span className="text-red-600">*</span>
          </span>
          <input
            type="date"
            value={form.serviceDate}
            onChange={(e) => set('serviceDate', e.target.value)}
            required
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">
            Amount <span className="text-red-600">*</span>
          </span>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">
            Payer <span className="text-red-600">*</span>
          </span>
          <select
            value={form.payer}
            onChange={(e) => set('payer', e.target.value)}
            required
            className={inputCls}
          >
            {PAYERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Primary Diagnosis (ICD-10)</span>
          <input
            type="text"
            value={form.primaryDiagnosis}
            onChange={(e) => set('primaryDiagnosis', e.target.value)}
            placeholder="e.g., I50.9"
            className={inputCls}
          />
          <span className="text-xs text-navy-500">Optional. Maps to Box 21A on CMS-1500.</span>
        </label>

        <div className="md:col-span-2 flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 min-h-12 md:min-h-10 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Claim'}
          </button>
          <Link
            to="/claims"
            className="px-4 py-2 min-h-12 md:min-h-10 rounded-md border border-navy-300 text-navy-700 hover:bg-navy-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
