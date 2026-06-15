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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

      await apiClient.post('/clinician/visits', {
        patientId: Number(patientId),
        clinicianId: user.userId,
        visitType,
        visitDate,
        vitals: JSON.stringify(vitals),
        assessment,
        planOfCare,
        status: 'draft',
      });

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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    minHeight: 48,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#334155',
    marginBottom: 4,
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #f1f5f9',
    marginBottom: 16,
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 0 16px 0',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          data-testid="back-button"
          style={{
            padding: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginRight: 8,
          }}
        >
          ‹
        </button>
        <h1 data-testid="page-title" style={{ fontSize: 18, fontWeight: 600 }}>
          New Visit
        </h1>
      </header>

      <form onSubmit={handleSubmit} data-testid="visit-form">
        {error && (
          <div
            data-testid="form-error"
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            data-testid="form-success"
            role="status"
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            Visit saved successfully! Redirecting...
          </div>
        )}

        <div style={cardStyle}>
          <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Visit Information</h2>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="patientId" style={labelStyle}>
              Patient
            </label>
            <select
              id="patientId"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={patientsLoading}
              data-testid="select-patient"
              style={inputStyle}
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

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="visitType" style={labelStyle}>
              Visit Type
            </label>
            <select
              id="visitType"
              required
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              data-testid="select-visit-type"
              style={inputStyle}
            >
              {visitTypes.map((vt) => (
                <option key={vt.value} value={vt.value}>
                  {vt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="visitDate" style={labelStyle}>
              Date & Time
            </label>
            <input
              id="visitDate"
              type="datetime-local"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              data-testid="input-visit-date"
              style={inputStyle}
            />
          </div>
        </div>

        {showVitals && (
          <div style={cardStyle} data-testid="vitals-section">
            <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Vital Signs</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="bpSystolic" style={labelStyle}>
                  BP Systolic
                </label>
                <input
                  id="bpSystolic"
                  type="number"
                  placeholder="120"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="bpDiastolic" style={labelStyle}>
                  BP Diastolic
                </label>
                <input
                  id="bpDiastolic"
                  type="number"
                  placeholder="80"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="heartRate" style={labelStyle}>
                  Heart Rate
                </label>
                <input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="temperature" style={labelStyle}>
                  Temperature (F)
                </label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="respiratoryRate" style={labelStyle}>
                  Respiratory Rate
                </label>
                <input
                  id="respiratoryRate"
                  type="number"
                  placeholder="16"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="o2Saturation" style={labelStyle}>
                  O2 Saturation (%)
                </label>
                <input
                  id="o2Saturation"
                  type="number"
                  placeholder="98"
                  value={o2Saturation}
                  onChange={(e) => setO2Saturation(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label htmlFor="painLevel" style={labelStyle}>
                Pain Level: {painLevel}/10
              </label>
              <input
                id="painLevel"
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(e.target.value)}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                <span>No Pain</span>
                <span>Severe</span>
              </div>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Assessment &amp; Plan</h2>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="assessment" style={labelStyle}>
              Assessment Notes
            </label>
            <textarea
              id="assessment"
              rows={4}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Document your clinical assessment..."
              data-testid="input-assessment"
              style={{ ...inputStyle, resize: 'none', minHeight: 'auto' }}
            />
          </div>

          <div>
            <label htmlFor="planOfCare" style={labelStyle}>
              Plan of Care Notes
            </label>
            <textarea
              id="planOfCare"
              rows={4}
              value={planOfCare}
              onChange={(e) => setPlanOfCare(e.target.value)}
              placeholder="Document the plan of care..."
              data-testid="input-plan-of-care"
              style={{ ...inputStyle, resize: 'none', minHeight: 'auto' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success || !canCreate}
          title={!canCreate ? NO_PERMISSION : undefined}
          data-testid="submit-visit"
          style={{
            width: '100%',
            padding: 16,
            background: '#0d9488',
            color: 'white',
            fontWeight: 600,
            border: 'none',
            borderRadius: 12,
            cursor: loading || success || !canCreate ? 'not-allowed' : 'pointer',
            opacity: loading || success || !canCreate ? 0.5 : 1,
            fontSize: 16,
            minHeight: 56,
          }}
        >
          {loading ? 'Saving...' : success ? 'Saved!' : 'Save Visit Note'}
        </button>
      </form>
    </div>
  );
}
