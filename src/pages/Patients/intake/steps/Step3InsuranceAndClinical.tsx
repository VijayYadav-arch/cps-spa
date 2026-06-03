import type { FormData } from '../intakeTypes';

interface StepProps {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

const FIELD_LABEL = 'block text-sm font-medium text-navy-700 mb-1';
const INPUT_BASE =
  'w-full px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
const TEXTAREA_BASE =
  'w-full px-3 py-2 rounded-md border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
const HELPER = 'mt-1 text-xs text-navy-500';

export function Step3InsuranceAndClinical({ form, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label htmlFor="medicareId" className={FIELD_LABEL}>
          Medicare ID
        </label>
        <input
          id="medicareId"
          type="text"
          className={INPUT_BASE}
          value={form.medicareId}
          onChange={(e) => onChange('medicareId', e.target.value)}
          placeholder="1EG4-TE5-MK72"
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
          onChange={(e) => onChange('medicaidId', e.target.value)}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3 border-t border-navy-100 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">Diagnosis</h3>
      </div>

      <div>
        <label htmlFor="primaryDiagnosis" className={FIELD_LABEL}>
          Primary Diagnosis (ICD-10)
        </label>
        <input
          id="primaryDiagnosis"
          type="text"
          className={INPUT_BASE}
          value={form.primaryDiagnosis}
          onChange={(e) => onChange('primaryDiagnosis', e.target.value)}
          placeholder="e.g. C34.90"
        />
      </div>

      <div className="md:col-span-1 lg:col-span-2">
        <label htmlFor="primaryDiagnosisDesc" className={FIELD_LABEL}>
          Diagnosis Description
        </label>
        <input
          id="primaryDiagnosisDesc"
          type="text"
          className={INPUT_BASE}
          value={form.primaryDiagnosisDesc}
          onChange={(e) => onChange('primaryDiagnosisDesc', e.target.value)}
          placeholder="e.g. Lung cancer, unspecified"
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <label htmlFor="secondaryDiagnosesText" className={FIELD_LABEL}>
          Secondary Diagnoses
        </label>
        <textarea
          id="secondaryDiagnosesText"
          className={TEXTAREA_BASE}
          rows={3}
          value={form.secondaryDiagnosesText}
          onChange={(e) => onChange('secondaryDiagnosesText', e.target.value)}
          placeholder={'E11.9 - Type 2 diabetes\nI10 - Hypertension'}
        />
        <p className={HELPER}>One per line.</p>
      </div>

      <div className="md:col-span-2 lg:col-span-3 border-t border-navy-100 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">
          Attending Physician
        </h3>
      </div>

      <div>
        <label htmlFor="attendingPhysicianName" className={FIELD_LABEL}>
          Physician Name
        </label>
        <input
          id="attendingPhysicianName"
          type="text"
          className={INPUT_BASE}
          value={form.attendingPhysicianName}
          onChange={(e) => onChange('attendingPhysicianName', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="attendingPhysicianNPI" className={FIELD_LABEL}>
          NPI
        </label>
        <input
          id="attendingPhysicianNPI"
          type="text"
          className={INPUT_BASE}
          value={form.attendingPhysicianNPI}
          onChange={(e) => onChange('attendingPhysicianNPI', e.target.value)}
          placeholder="10 digits"
          maxLength={10}
        />
        <p className={HELPER}>10-digit National Provider Identifier.</p>
      </div>

      <div>
        <label htmlFor="attendingPhysicianPhone" className={FIELD_LABEL}>
          Physician Phone
        </label>
        <input
          id="attendingPhysicianPhone"
          type="tel"
          className={INPUT_BASE}
          value={form.attendingPhysicianPhone}
          onChange={(e) => onChange('attendingPhysicianPhone', e.target.value)}
        />
      </div>
    </div>
  );
}
