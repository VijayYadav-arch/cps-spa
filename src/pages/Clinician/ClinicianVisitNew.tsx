import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const visitTypes = [
  { value: 'skilled-nursing', label: 'Skilled Nursing' },
  { value: 'social-work', label: 'Social Work' },
  { value: 'chaplain', label: 'Chaplain' },
  { value: 'aide', label: 'Aide' },
  { value: 'other', label: 'Other' },
];

// aide role intentionally excluded — aides do not document clinical vitals in hospice workflows
const CLINICAL_VITALS_ROLES = ['nurse', 'physician', 'case_manager'];

const ROLE_DEFAULT_VISIT_TYPE: Record<string, string> = {
  social_worker: 'social-work',
  chaplain: 'chaplain',
};

interface PatientsEnvelope {
  data: { id: number; firstName: string; lastName: string }[];
}

export function ClinicianVisitNew() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth.user;
  const primaryRole = user?.roles[0] ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Save Visit Note hits POST /clinician/visits, gated by the
  // clinical:visit_notes policy on VisitNotesController.
  const canCreate = usePermission(PERMISSIONS.CLINICAL_VISIT_NOTES);

  const [patients, setPatients] = useState<
    { id: number; firstName: string; lastName: string }[]
  >([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const [patientId, setPatientId] = useState(searchParams.get('patientId') ?? '');
  const [visitType, setVisitType] = useState('skilled-nursing');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));

  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [o2Saturation, setO2Saturation] = useState('');
  const [painLevel, setPainLevel] = useState('0');

  const [assessment, setAssessment] = useState('');
  const [planOfCare, setPlanOfCare] = useState('');

  // Sets default visit type once when role loads — visitType intentionally excluded from deps
  useEffect(() => {
    if (primaryRole && primaryRole in ROLE_DEFAULT_VISIT_TYPE) {
      setVisitType(ROLE_DEFAULT_VISIT_TYPE[primaryRole]);
    }
  }, [primaryRole]);

  const showVitals = CLINICAL_VITALS_ROLES.includes(primaryRole);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<PatientsEnvelope>('/patients?limit=200&active=true&orderBy=lastName:asc')
      .then((res) => {
        if (!cancelled) setPatients(res.data.data);
      })
      .catch(() => {
        /* silently degrade */
      })
      .finally(() => {
        if (!cancelled) setPatientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save the visit note. When `sign` is true, the freshly-created draft is immediately signed
  // (create → sign) so the clinician can finish documentation in one step rather than saving a
  // draft and signing separately from the detail view.
  const save = async (sign: boolean) => {
    setError('');
    setLoading(true);

    if (!user) {
      setError('Not signed in. Please log in and try again.');
      setLoading(false);
      return;
    }

    try {
      const vitals = {
        bloodPressure: { systolic: Number(bpSystolic), diastolic: Number(bpDiastolic) },
        heartRate: Number(heartRate),
        temperature: Number(temperature),
        respiratoryRate: Number(respiratoryRate),
        o2Saturation: Number(o2Saturation),
        painLevel: Number(painLevel),
      };

      const res = await apiClient.post<{ data?: { id?: number } }>('/clinician/visits', {
        patientId: Number(patientId),
        clinicianId: user.userId,
        visitType,
        visitDate,
        vitals: JSON.stringify(vitals),
        assessment,
        planOfCare,
        status: 'draft',
      });

      if (sign) {
        const newId = res.data?.data?.id;
        if (newId) await apiClient.post(`/clinician/visits/${newId}/sign`);
      }

      setSuccess(true);
      setTimeout(() => navigate('/clinician/dashboard'), 1500);
    } catch (err) {
      const message =
        (err as { message?: string })?.message || 'Failed to create visit';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save(false);
  };

  const labelClass = 'mb-1 block text-sm font-medium text-slate-700';
  const cardClass =
    'mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm';

  return (
    <div className="mx-auto max-w-[640px] p-4">
      <header className="flex items-center pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          data-testid="back-button"
          className="mr-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-slate-50"
        >
          ‹
        </button>
        <h1 data-testid="page-title" className="text-lg font-semibold">
          New Visit
        </h1>
      </header>

      <form onSubmit={handleSubmit} data-testid="visit-form">
        {error && (
          <div
            data-testid="form-error"
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            data-testid="form-success"
            role="status"
            className="mb-4 rounded-lg border border-success bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            Visit saved successfully! Redirecting...
          </div>
        )}

        <div className={cardClass}>
          <h2 className="mb-3 text-lg font-semibold">Visit Information</h2>

          <div className="mb-3">
            <label htmlFor="patientId" className={labelClass}>
              Patient
            </label>
            <select
              id="patientId"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={patientsLoading}
              data-testid="select-patient"
              className="form-input"
            >
              <option value="">
                {patientsLoading ? 'Loading patients...' : 'Select a patient...'}
              </option>
              {patients.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.lastName}, {p.firstName}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="visitType" className={labelClass}>
              Visit Type
            </label>
            <select
              id="visitType"
              required
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              data-testid="select-visit-type"
              className="form-input"
            >
              {visitTypes.map((vt) => (
                <option key={vt.value} value={vt.value}>
                  {vt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="visitDate" className={labelClass}>
              Date & Time
            </label>
            <input
              id="visitDate"
              type="datetime-local"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              data-testid="input-visit-date"
              className="form-input"
            />
          </div>
        </div>

        {showVitals && (
          <div className={cardClass} data-testid="vitals-section">
            <h2 className="mb-3 text-lg font-semibold">Vital Signs</h2>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bpSystolic" className={labelClass}>
                  BP Systolic
                </label>
                <input
                  id="bpSystolic"
                  type="number"
                  placeholder="120"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="bpDiastolic" className={labelClass}>
                  BP Diastolic
                </label>
                <input
                  id="bpDiastolic"
                  type="number"
                  placeholder="80"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="heartRate" className={labelClass}>
                  Heart Rate
                </label>
                <input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="temperature" className={labelClass}>
                  Temperature (F)
                </label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="respiratoryRate" className={labelClass}>
                  Respiratory Rate
                </label>
                <input
                  id="respiratoryRate"
                  type="number"
                  placeholder="16"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="o2Saturation" className={labelClass}>
                  O2 Saturation (%)
                </label>
                <input
                  id="o2Saturation"
                  type="number"
                  placeholder="98"
                  value={o2Saturation}
                  onChange={(e) => setO2Saturation(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="painLevel" className={labelClass}>
                Pain Level: {painLevel}/10
              </label>
              <input
                id="painLevel"
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(e.target.value)}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>No Pain</span>
                <span>Severe</span>
              </div>
            </div>
          </div>
        )}

        <div className={cardClass}>
          <h2 className="mb-3 text-lg font-semibold">Assessment &amp; Plan</h2>

          <div className="mb-3">
            <label htmlFor="assessment" className={labelClass}>
              Assessment Notes
            </label>
            <textarea
              id="assessment"
              rows={4}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Document your clinical assessment..."
              data-testid="input-assessment"
              className="form-input resize-none"
            />
          </div>

          <div>
            <label htmlFor="planOfCare" className={labelClass}>
              Plan of Care Notes
            </label>
            <textarea
              id="planOfCare"
              rows={4}
              value={planOfCare}
              onChange={(e) => setPlanOfCare(e.target.value)}
              placeholder="Document the plan of care..."
              data-testid="input-plan-of-care"
              className="form-input resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void save(false)}
            disabled={loading || success || !canCreate}
            title={!canCreate ? NO_PERMISSION : undefined}
            data-testid="submit-visit"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl border border-teal-600 bg-white p-4 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : success ? 'Saved!' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={loading || success || !canCreate}
            title={!canCreate ? NO_PERMISSION : undefined}
            data-testid="submit-visit-sign"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-teal-600 p-4 text-base font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : success ? 'Saved!' : 'Sign & complete'}
          </button>
        </div>
      </form>
    </div>
  );
}
