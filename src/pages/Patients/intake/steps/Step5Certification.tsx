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
const ERR_TXT = 'mt-1 text-xs text-red-700';
const HELPER = 'mt-1 text-xs text-navy-500';
const REQ = <span className="text-red-600 ml-0.5">*</span>;

export function Step5Certification({ form, errors, onChange }: StepProps) {
  const bpNum = parseInt(form.benefitPeriod || '0', 10);
  const needsFaceToFace = bpNum >= 3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label htmlFor="certifiedByName" className={FIELD_LABEL}>
          Certifying Physician Name{REQ}
        </label>
        <input
          id="certifiedByName"
          type="text"
          className={errors.certifiedByName ? INPUT_ERR : INPUT_BASE}
          value={form.certifiedByName}
          onChange={(e) => onChange('certifiedByName', e.target.value)}
        />
        {errors.certifiedByName && <p className={ERR_TXT}>{errors.certifiedByName}</p>}
      </div>

      <div>
        <label htmlFor="certifiedByNPI" className={FIELD_LABEL}>
          Certifying Physician NPI
        </label>
        <input
          id="certifiedByNPI"
          type="text"
          className={INPUT_BASE}
          value={form.certifiedByNPI}
          onChange={(e) => onChange('certifiedByNPI', e.target.value)}
          maxLength={10}
        />
      </div>

      <div>
        <label htmlFor="secondCertifiedByName" className={FIELD_LABEL}>
          Second Physician Name
        </label>
        <input
          id="secondCertifiedByName"
          type="text"
          className={INPUT_BASE}
          value={form.secondCertifiedByName}
          onChange={(e) => onChange('secondCertifiedByName', e.target.value)}
        />
        <p className={HELPER}>Required for initial hospice certification.</p>
      </div>

      <div>
        <label htmlFor="secondCertifiedByNPI" className={FIELD_LABEL}>
          Second Physician NPI
        </label>
        <input
          id="secondCertifiedByNPI"
          type="text"
          className={INPUT_BASE}
          value={form.secondCertifiedByNPI}
          onChange={(e) => onChange('secondCertifiedByNPI', e.target.value)}
          maxLength={10}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3 border-t border-navy-100 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">Dates</h3>
      </div>

      <div>
        <label htmlFor="certificationDate" className={FIELD_LABEL}>
          Certification Date
        </label>
        <input
          id="certificationDate"
          type="date"
          className={INPUT_BASE}
          value={form.certificationDate}
          onChange={(e) => onChange('certificationDate', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="effectiveFrom" className={FIELD_LABEL}>
          Effective From{REQ}
        </label>
        <input
          id="effectiveFrom"
          type="date"
          className={errors.effectiveFrom ? INPUT_ERR : INPUT_BASE}
          value={form.effectiveFrom}
          onChange={(e) => onChange('effectiveFrom', e.target.value)}
        />
        {errors.effectiveFrom && <p className={ERR_TXT}>{errors.effectiveFrom}</p>}
      </div>

      <div>
        <label htmlFor="effectiveTo" className={FIELD_LABEL}>
          Effective To{REQ}
        </label>
        <input
          id="effectiveTo"
          type="date"
          className={errors.effectiveTo ? INPUT_ERR : INPUT_BASE}
          value={form.effectiveTo}
          onChange={(e) => onChange('effectiveTo', e.target.value)}
        />
        <p className={HELPER}>Auto-computed: +90 days for BP 1-2, +60 days for BP 3+.</p>
        {errors.effectiveTo && <p className={ERR_TXT}>{errors.effectiveTo}</p>}
      </div>

      <div className="md:col-span-2 lg:col-span-3 border-t border-navy-100 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">
          Face-to-Face{needsFaceToFace && REQ}
        </h3>
        {needsFaceToFace && (
          <p className={HELPER}>Required for benefit periods 3 and beyond.</p>
        )}
      </div>

      <div>
        <label htmlFor="faceToFaceDate" className={FIELD_LABEL}>
          Face-to-Face Date{needsFaceToFace && REQ}
        </label>
        <input
          id="faceToFaceDate"
          type="date"
          className={errors.faceToFaceDate ? INPUT_ERR : INPUT_BASE}
          value={form.faceToFaceDate}
          onChange={(e) => onChange('faceToFaceDate', e.target.value)}
        />
        {errors.faceToFaceDate && <p className={ERR_TXT}>{errors.faceToFaceDate}</p>}
      </div>

      <div>
        <label htmlFor="faceToFaceProvider" className={FIELD_LABEL}>
          Face-to-Face Provider{needsFaceToFace && REQ}
        </label>
        <input
          id="faceToFaceProvider"
          type="text"
          className={errors.faceToFaceProvider ? INPUT_ERR : INPUT_BASE}
          value={form.faceToFaceProvider}
          onChange={(e) => onChange('faceToFaceProvider', e.target.value)}
        />
        {errors.faceToFaceProvider && <p className={ERR_TXT}>{errors.faceToFaceProvider}</p>}
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <label htmlFor="certificationNotes" className={FIELD_LABEL}>
          Certification Notes
        </label>
        <textarea
          id="certificationNotes"
          className={TEXTAREA_BASE}
          rows={3}
          value={form.certificationNotes}
          onChange={(e) => onChange('certificationNotes', e.target.value)}
        />
      </div>
    </div>
  );
}
