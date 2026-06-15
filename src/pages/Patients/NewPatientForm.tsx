import '@/styles/intake.css';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { intakeApi } from './intake/intakeApi';
import { initialForm, type FormData } from './intake/intakeTypes';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface Organization {
  id: number;
  name: string;
}

const FIELD_LABEL = 'block text-sm font-medium text-navy-700 mb-1';
const INPUT_BASE =
  'w-full px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
const INPUT_ERR =
  'w-full px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-red-600 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-600';
const ERR_TXT = 'mt-1 text-xs text-red-700';
const REQ = <span className="text-red-600 ml-0.5">*</span>;

const REQUIRED_FIELDS: (keyof FormData)[] = [
  'organizationId',
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'admissionType',
  'admittedAt',
];

export function NewPatientForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(initialForm);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Create Patient submits to POST /patients → [Authorize(Policy = patients:create)].
  const canCreate = usePermission(PERMISSIONS.PATIENTS_CREATE);

  useEffect(() => {
    apiClient
      .get('/organizations', { params: { pageSize: 200 } })
      .then((res) => {
        const list = (res.data?.data ?? res.data ?? []) as Organization[];
        if (Array.isArray(list)) setOrgs(list);
      })
      .catch(() => {
        // Empty list — required validation will catch missing org.
      });
  }, []);

  function update<K extends keyof FormData>(field: K, value: FormData[K]): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    for (const f of REQUIRED_FIELDS) {
      if (!form[f]) e[f] = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await intakeApi.submitFinal(form);
      navigate(`/patients/${result.id}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to create patient';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-4 lg:p-8">
      <div className="mb-6">
        <Link to="/patients" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Back to Patients
        </Link>
      </div>

      <h1 className="text-2xl font-serif text-navy-900 mb-2">New Patient</h1>
      <p className="text-navy-600 mb-6">
        Create a new patient record. For the full multi-step intake,{' '}
        <Link to="/patients/intake" className="text-teal-600 underline">
          use the intake wizard
        </Link>
        .
      </p>

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-md bg-red-50 border border-red-600 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-md border border-navy-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-3">
              <label htmlFor="organizationId" className={FIELD_LABEL}>
                Client Organization{REQ}
              </label>
              <select
                id="organizationId"
                className={errors.organizationId ? INPUT_ERR : INPUT_BASE}
                value={form.organizationId}
                onChange={(e) => update('organizationId', e.target.value)}
              >
                <option value="">Select an organization...</option>
                {orgs.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
              {errors.organizationId && <p className={ERR_TXT}>{errors.organizationId}</p>}
            </div>

            <div>
              <label htmlFor="firstName" className={FIELD_LABEL}>
                First Name{REQ}
              </label>
              <input
                id="firstName"
                type="text"
                className={errors.firstName ? INPUT_ERR : INPUT_BASE}
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
              />
              {errors.firstName && <p className={ERR_TXT}>{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="middleName" className={FIELD_LABEL}>
                Middle Name
              </label>
              <input
                id="middleName"
                type="text"
                className={INPUT_BASE}
                value={form.middleName}
                onChange={(e) => update('middleName', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="lastName" className={FIELD_LABEL}>
                Last Name{REQ}
              </label>
              <input
                id="lastName"
                type="text"
                className={errors.lastName ? INPUT_ERR : INPUT_BASE}
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
              />
              {errors.lastName && <p className={ERR_TXT}>{errors.lastName}</p>}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className={FIELD_LABEL}>
                Date of Birth{REQ}
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className={errors.dateOfBirth ? INPUT_ERR : INPUT_BASE}
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
              {errors.dateOfBirth && <p className={ERR_TXT}>{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label htmlFor="gender" className={FIELD_LABEL}>
                Gender{REQ}
              </label>
              <select
                id="gender"
                className={errors.gender ? INPUT_ERR : INPUT_BASE}
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="decline_to_state">Decline to state</option>
              </select>
              {errors.gender && <p className={ERR_TXT}>{errors.gender}</p>}
            </div>

            <div>
              <label htmlFor="admissionType" className={FIELD_LABEL}>
                Admission Type{REQ}
              </label>
              <select
                id="admissionType"
                className={errors.admissionType ? INPUT_ERR : INPUT_BASE}
                value={form.admissionType}
                onChange={(e) => update('admissionType', e.target.value)}
              >
                <option value="hospice">Hospice</option>
                <option value="home_health">Home Health</option>
                <option value="palliative">Palliative</option>
                <option value="other">Other</option>
              </select>
              {errors.admissionType && <p className={ERR_TXT}>{errors.admissionType}</p>}
            </div>

            <div>
              <label htmlFor="admittedAt" className={FIELD_LABEL}>
                Admitted At{REQ}
              </label>
              <input
                id="admittedAt"
                type="date"
                className={errors.admittedAt ? INPUT_ERR : INPUT_BASE}
                value={form.admittedAt}
                onChange={(e) => update('admittedAt', e.target.value)}
              />
              {errors.admittedAt && <p className={ERR_TXT}>{errors.admittedAt}</p>}
            </div>

            <div>
              <label htmlFor="medicareId" className={FIELD_LABEL}>
                Medicare ID
              </label>
              <input
                id="medicareId"
                type="text"
                className={INPUT_BASE}
                value={form.medicareId}
                onChange={(e) => update('medicareId', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="medicaidId" className={FIELD_LABEL}>
                Medicaid ID
              </label>
              <input
                id="medicaidId"
                type="text"
                className={INPUT_BASE}
                value={form.medicaidId}
                onChange={(e) => update('medicaidId', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !canCreate}
            title={!canCreate ? NO_PERMISSION : undefined}
            className="px-6 py-3 min-h-12 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Patient'}
          </button>
          <Link
            to="/patients"
            className="px-6 py-3 min-h-12 rounded-md border border-navy-200 text-navy-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
