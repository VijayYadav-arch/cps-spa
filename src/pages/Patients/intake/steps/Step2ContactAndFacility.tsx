import type { FormData } from '../intakeTypes';

interface StepProps {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

const FIELD_LABEL = 'block text-sm font-medium text-navy-700 mb-1';
const INPUT_BASE =
  'w-full px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
const INPUT_ERR =
  'w-full px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-red-600 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-600';
const ERR_TXT = 'mt-1 text-xs text-red-700';

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'GU', name: 'Guam' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
];

export function Step2ContactAndFacility({ form, errors, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label htmlFor="phone" className={FIELD_LABEL}>
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          className={errors.phone ? INPUT_ERR : INPUT_BASE}
          value={form.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
        {errors.phone && <p className={ERR_TXT}>{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="email" className={FIELD_LABEL}>
          Email
        </label>
        <input
          id="email"
          type="email"
          className={errors.email ? INPUT_ERR : INPUT_BASE}
          value={form.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
        {errors.email && <p className={ERR_TXT}>{errors.email}</p>}
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <label htmlFor="address" className={FIELD_LABEL}>
          Address Line 1
        </label>
        <input
          id="address"
          type="text"
          className={INPUT_BASE}
          value={form.address}
          onChange={(e) => onChange('address', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="city" className={FIELD_LABEL}>
          City
        </label>
        <input
          id="city"
          type="text"
          className={INPUT_BASE}
          value={form.city}
          onChange={(e) => onChange('city', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="state" className={FIELD_LABEL}>
          State
        </label>
        <select
          id="state"
          className={INPUT_BASE}
          value={form.state}
          onChange={(e) => onChange('state', e.target.value)}
        >
          <option value="">Select...</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="zipCode" className={FIELD_LABEL}>
          ZIP Code
        </label>
        <input
          id="zipCode"
          type="text"
          maxLength={10}
          className={INPUT_BASE}
          value={form.zipCode}
          onChange={(e) => onChange('zipCode', e.target.value)}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3 border-t border-navy-100 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">Facility</h3>
      </div>

      <div>
        <label htmlFor="facilityName" className={FIELD_LABEL}>
          Facility Name
        </label>
        <input
          id="facilityName"
          type="text"
          className={INPUT_BASE}
          value={form.facilityName}
          onChange={(e) => onChange('facilityName', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="facilityType" className={FIELD_LABEL}>
          Facility Type
        </label>
        <select
          id="facilityType"
          className={INPUT_BASE}
          value={form.facilityType}
          onChange={(e) => onChange('facilityType', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="home">Home</option>
          <option value="snf">Skilled Nursing Facility</option>
          <option value="assisted_living">Assisted Living</option>
          <option value="inpatient">Inpatient</option>
          <option value="hospital">Hospital</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="md:col-span-2 lg:col-span-3 border-t border-navy-100 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">
          Emergency Contact
        </h3>
      </div>

      <div>
        <label htmlFor="emergencyContactName" className={FIELD_LABEL}>
          Contact Name
        </label>
        <input
          id="emergencyContactName"
          type="text"
          className={INPUT_BASE}
          value={form.emergencyContactName}
          onChange={(e) => onChange('emergencyContactName', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="emergencyContactPhone" className={FIELD_LABEL}>
          Contact Phone
        </label>
        <input
          id="emergencyContactPhone"
          type="tel"
          className={INPUT_BASE}
          value={form.emergencyContactPhone}
          onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="emergencyContactRelation" className={FIELD_LABEL}>
          Relationship
        </label>
        <select
          id="emergencyContactRelation"
          className={INPUT_BASE}
          value={form.emergencyContactRelation}
          onChange={(e) => onChange('emergencyContactRelation', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="spouse">Spouse</option>
          <option value="parent">Parent</option>
          <option value="child">Child</option>
          <option value="sibling">Sibling</option>
          <option value="friend">Friend</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}
