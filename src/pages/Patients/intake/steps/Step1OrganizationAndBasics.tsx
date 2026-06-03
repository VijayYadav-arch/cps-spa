import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { FormData } from '../intakeTypes';

interface StepProps {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

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

export function Step1OrganizationAndBasics({ form, errors, onChange }: StepProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    apiClient
      .get('/organizations', { params: { pageSize: 200 } })
      .then((res) => {
        const list = (res.data?.data ?? res.data ?? []) as Organization[];
        if (Array.isArray(list)) setOrgs(list);
      })
      .catch(() => {
        // Silently swallow — user sees empty dropdown; validation will block advance.
      });
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="md:col-span-2 lg:col-span-3">
        <label htmlFor="organizationId" className={FIELD_LABEL}>
          Organization{REQ}
        </label>
        <select
          id="organizationId"
          className={errors.organizationId ? INPUT_ERR : INPUT_BASE}
          value={form.organizationId}
          onChange={(e) => onChange('organizationId', e.target.value)}
        >
          <option value="">Select organization...</option>
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
          onChange={(e) => onChange('firstName', e.target.value)}
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
          onChange={(e) => onChange('middleName', e.target.value)}
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
          onChange={(e) => onChange('lastName', e.target.value)}
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
          onChange={(e) => onChange('dateOfBirth', e.target.value)}
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
          onChange={(e) => onChange('gender', e.target.value)}
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
        <label htmlFor="maritalStatus" className={FIELD_LABEL}>
          Marital Status
        </label>
        <select
          id="maritalStatus"
          className={INPUT_BASE}
          value={form.maritalStatus}
          onChange={(e) => onChange('maritalStatus', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
          <option value="separated">Separated</option>
        </select>
      </div>

      <div>
        <label htmlFor="race" className={FIELD_LABEL}>
          Race
        </label>
        <select
          id="race"
          className={INPUT_BASE}
          value={form.race}
          onChange={(e) => onChange('race', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="white">White</option>
          <option value="black_african_american">Black or African American</option>
          <option value="asian">Asian</option>
          <option value="american_indian_alaska_native">American Indian or Alaska Native</option>
          <option value="native_hawaiian_pacific_islander">
            Native Hawaiian or Pacific Islander
          </option>
          <option value="other_race">Other</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div>
        <label htmlFor="ethnicity" className={FIELD_LABEL}>
          Ethnicity
        </label>
        <select
          id="ethnicity"
          className={INPUT_BASE}
          value={form.ethnicity}
          onChange={(e) => onChange('ethnicity', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="hispanic_latino">Hispanic or Latino</option>
          <option value="not_hispanic_latino">Not Hispanic or Latino</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div>
        <label htmlFor="preferredLanguage" className={FIELD_LABEL}>
          Preferred Language
        </label>
        <input
          id="preferredLanguage"
          type="text"
          className={INPUT_BASE}
          value={form.preferredLanguage}
          onChange={(e) => onChange('preferredLanguage', e.target.value)}
        />
      </div>
    </div>
  );
}
