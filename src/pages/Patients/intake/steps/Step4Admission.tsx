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
const TEXTAREA_BASE =
  'w-full px-3 py-2 rounded-md border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
const TEXTAREA_ERR =
  'w-full px-3 py-2 rounded-md border border-red-600 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-600';
const ERR_TXT = 'mt-1 text-xs text-red-700';
const REQ = <span className="text-red-600 ml-0.5">*</span>;

export function Step4Admission({ form, errors, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label htmlFor="admissionType" className={FIELD_LABEL}>
          Admission Type{REQ}
        </label>
        <select
          id="admissionType"
          className={errors.admissionType ? INPUT_ERR : INPUT_BASE}
          value={form.admissionType}
          onChange={(e) => onChange('admissionType', e.target.value)}
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
          onChange={(e) => onChange('admittedAt', e.target.value)}
        />
        {errors.admittedAt && <p className={ERR_TXT}>{errors.admittedAt}</p>}
      </div>

      <div>
        <label htmlFor="levelOfCare" className={FIELD_LABEL}>
          Level of Care
        </label>
        <select
          id="levelOfCare"
          className={INPUT_BASE}
          value={form.levelOfCare}
          onChange={(e) => onChange('levelOfCare', e.target.value)}
        >
          <option value="RHC">RHC — Routine Home Care</option>
          <option value="CHC">CHC — Continuous Home Care</option>
          <option value="IRC">IRC — Inpatient Respite Care</option>
          <option value="GIP">GIP — General Inpatient Care</option>
        </select>
      </div>

      <div>
        <label htmlFor="benefitPeriod" className={FIELD_LABEL}>
          Benefit Period
        </label>
        <select
          id="benefitPeriod"
          className={INPUT_BASE}
          value={form.benefitPeriod}
          onChange={(e) => onChange('benefitPeriod', e.target.value)}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="startOfCare" className={FIELD_LABEL}>
          Start of Care
        </label>
        <input
          id="startOfCare"
          type="date"
          className={INPUT_BASE}
          value={form.startOfCare}
          onChange={(e) => onChange('startOfCare', e.target.value)}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3 mt-2">
        <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
          <input
            id="homeboundStatus"
            type="checkbox"
            checked={form.homeboundStatus}
            onChange={(e) => onChange('homeboundStatus', e.target.checked)}
            className="w-4 h-4 rounded border-navy-300 text-teal-600 focus:ring-teal-500"
          />
          Patient is homebound
        </label>
      </div>

      {form.homeboundStatus && (
        <div className="md:col-span-2 lg:col-span-3">
          <label htmlFor="homeboundReason" className={FIELD_LABEL}>
            Homebound Reason{REQ}
          </label>
          <textarea
            id="homeboundReason"
            className={errors.homeboundReason ? TEXTAREA_ERR : TEXTAREA_BASE}
            rows={3}
            value={form.homeboundReason}
            onChange={(e) => onChange('homeboundReason', e.target.value)}
          />
          {errors.homeboundReason && <p className={ERR_TXT}>{errors.homeboundReason}</p>}
        </div>
      )}
    </div>
  );
}
