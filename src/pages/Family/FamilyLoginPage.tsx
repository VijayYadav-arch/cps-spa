import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { LanguagePicker } from '@/i18n/LanguagePicker';

export function FamilyLoginPage() {
  const { loginAsFamily } = usePortalAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const reason = search.get('reason');
  const { t } = useTranslation();

  const [patientId, setPatientId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pid = parseInt(patientId, 10);
    if (Number.isNaN(pid)) {
      setError(t('family.login.patientIdNumeric'));
      return;
    }
    setSubmitting(true);
    try {
      await loginAsFamily(pid, pin);
      navigate('/family/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('family.login.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-[360px] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1
          data-testid="family-login-title"
          className="m-0 mb-1 text-2xl text-teal-700"
        >
          {t('family.login.title')}
        </h1>
        <div className="mb-3 text-sm text-slate-500">
          {t('family.login.description')}
        </div>

        {reason === 'expired' && (
          <div
            role="status"
            className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
          >
            {t('family.login.sessionExpired')}
          </div>
        )}

        <label htmlFor="family-patient-id" className="text-sm font-medium text-slate-600">
          {t('family.login.patientIdLabel')}
        </label>
        <input
          id="family-patient-id"
          type="text"
          inputMode="numeric"
          data-testid="family-patient-id-input"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          required
          className="form-input"
        />

        <label htmlFor="family-pin" className="text-sm font-medium text-slate-600">
          {t('family.login.pinLabel')}
        </label>
        <input
          id="family-pin"
          type="password"
          data-testid="family-pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
          className="form-input"
        />

        {error && (
          <div
            role="alert"
            data-testid="family-login-error"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="family-login-submit"
          className="btn-primary mt-3 justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t('family.login.submitting') : t('family.login.submit')}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          {t('family.login.forgotPin')}
        </p>
        <div className="mt-4 text-slate-500">
          <LanguagePicker />
        </div>
      </form>
    </div>
  );
}
