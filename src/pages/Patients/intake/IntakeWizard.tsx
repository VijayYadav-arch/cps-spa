import '@/styles/intake.css';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { intakeApi } from './intakeApi';
import { initialForm, STEP_NAMES, type DraftResponse, type FormData } from './intakeTypes';
import { DraftResumeBanner } from './DraftResumeBanner';
import { StepShell } from './StepShell';
import { Step1OrganizationAndBasics } from './steps/Step1OrganizationAndBasics';
import { Step2ContactAndFacility } from './steps/Step2ContactAndFacility';
import { Step3InsuranceAndClinical } from './steps/Step3InsuranceAndClinical';
import { Step4Admission } from './steps/Step4Admission';
import { Step5Certification } from './steps/Step5Certification';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface IntakeNavState {
  prefill?: Partial<FormData>;
  referralId?: number;
}

export function IntakeWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  // A referral conversion lands here with prefill + the referral id (see ReferralsPage).
  const navState = (location.state as IntakeNavState | null) ?? null;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(() =>
    navState?.prefill ? { ...initialForm, ...navState.prefill } : initialForm,
  );
  const [draftId, setDraftId] = useState<number | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DraftResponse | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Button-level permission gates:
  //  - Next persists a draft (POST/PATCH /patients/intake-drafts) → patients:intake.
  //  - Complete intake submits POST /patients (patients:create) AND deletes the
  //    draft (patients:intake), so it requires both policies.
  const canSaveDraft = usePermission(PERMISSIONS.PATIENTS_INTAKE);
  const canComplete = usePermission([PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_INTAKE]);

  useEffect(() => {
    // A referral conversion starts a fresh prefilled intake — don't offer to resume an
    // unrelated open draft over the top of it.
    if (navState?.referralId) return;
    // Best-effort: a failed draft lookup must not block starting a fresh intake.
    intakeApi
      .getMyOpenDraft()
      .then((d) => {
        if (d) setPendingDraft(d);
      })
      .catch(() => undefined);
  }, [navState?.referralId]);

  const totalSteps = form.admissionType === 'hospice' ? 5 : 4;

  function autoCalcEffectiveTo(bp: string, from: string): string {
    if (!from) return '';
    const d = new Date(from);
    const bpNum = parseInt(bp, 10);
    if (bpNum === 1 || bpNum === 2) d.setDate(d.getDate() + 90);
    else d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  }

  function update<K extends keyof FormData>(field: K, value: FormData[K]): void {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'benefitPeriod' || field === 'effectiveFrom') {
        const bp = field === 'benefitPeriod' ? String(value) : prev.benefitPeriod;
        const from = field === 'effectiveFrom' ? String(value) : prev.effectiveFrom;
        if (bp && from) next.effectiveTo = autoCalcEffectiveTo(bp, from);
      }
      return next;
    });
  }

  function validateStep(s: number): Partial<Record<keyof FormData, string>> {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (s === 1) {
      if (!form.organizationId) e.organizationId = 'Required';
      if (!form.firstName) e.firstName = 'Required';
      if (!form.lastName) e.lastName = 'Required';
    }
    if (s === 4) {
      if (!form.admissionType) e.admissionType = 'Required';
      if (!form.admittedAt) e.admittedAt = 'Required';
    }
    return e;
  }

  async function ensureDraft(): Promise<number> {
    if (draftId) return draftId;
    const created = await intakeApi.createDraft(parseInt(form.organizationId || '0', 10));
    setDraftId(created.id);
    return created.id;
  }

  function extractError(err: unknown, fallback: string): string {
    return (
      (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data
        ?.error
      ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      ?? fallback
    );
  }

  async function advanceStep() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setActionError(null);
    setSaving(true);
    try {
      const id = await ensureDraft();
      await intakeApi.updateDraft(id, step + 1, form);
      setStep(step + 1);
    } catch (err) {
      setActionError(extractError(err, 'Could not save your progress. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function submitFinal() {
    setActionError(null);
    setSubmitting(true);
    try {
      const result = await intakeApi.submitFinal(form);
      if (draftId) {
        // Draft cleanup is best-effort — the patient is already created.
        await intakeApi.deleteDraft(draftId).catch(() => undefined);
      }
      if (navState?.referralId) {
        // Link the originating referral to the new patient. Best-effort — the patient
        // is already created, so a convert failure must not strand the intake.
        await intakeApi
          .convertReferral(navState.referralId, result.id)
          .catch(() => undefined);
      }
      // Hospice admissions hand off straight into the election wizard, pre-filling
      // the election date from the admission date captured at intake.
      if (form.admissionType === 'hospice') {
        const electionDate = form.effectiveFrom || form.admittedAt;
        const q = electionDate ? `?electionDate=${electionDate}` : '';
        navigate(`/patients/${result.id}/hospice/new${q}`);
      } else {
        navigate(`/patients/${result.id}`);
      }
    } catch (err) {
      setActionError(extractError(err, 'Could not complete intake. Please review and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingDraft) {
    return (
      <DraftResumeBanner
        draft={pendingDraft}
        onResume={() => {
          setForm({ ...initialForm, ...JSON.parse(pendingDraft.formJson) });
          setStep(pendingDraft.currentStep);
          setDraftId(pendingDraft.id);
          setPendingDraft(null);
        }}
        onDiscard={async () => {
          await intakeApi.deleteDraft(pendingDraft.id);
          setPendingDraft(null);
        }}
      />
    );
  }

  return (
    <StepShell
      step={step}
      totalSteps={totalSteps}
      stepNames={STEP_NAMES.slice(0, totalSteps)}
      saving={saving}
    >
      {step === 1 && <Step1OrganizationAndBasics form={form} errors={errors} onChange={update} />}
      {step === 2 && <Step2ContactAndFacility form={form} errors={errors} onChange={update} />}
      {step === 3 && <Step3InsuranceAndClinical form={form} errors={errors} onChange={update} />}
      {step === 4 && <Step4Admission form={form} errors={errors} onChange={update} />}
      {step === 5 && form.admissionType === 'hospice' && (
        <Step5Certification form={form} errors={errors} onChange={update} />
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {actionError}
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t p-4 flex gap-2 lg:static lg:bg-transparent lg:border-0 lg:p-0 lg:mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="px-4 py-3 min-h-12 rounded-md border border-navy-200"
          >
            Back
          </button>
        )}
        <div className="flex-1" />
        {step < totalSteps ? (
          <button
            onClick={advanceStep}
            disabled={saving || !canSaveDraft}
            title={!canSaveDraft ? NO_PERMISSION : undefined}
            className="px-6 py-3 min-h-12 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Next'}
          </button>
        ) : (
          <button
            onClick={submitFinal}
            disabled={submitting || !canComplete}
            title={!canComplete ? NO_PERMISSION : undefined}
            className="px-6 py-3 min-h-12 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Complete intake'}
          </button>
        )}
      </nav>
    </StepShell>
  );
}
