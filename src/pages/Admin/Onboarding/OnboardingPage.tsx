import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface OnboardingStep {
  number: number;
  title: string;
  description: string;
  required: boolean;
}

interface OnboardingFlow {
  careType: string;
  steps: OnboardingStep[];
  totalSteps: number;
}

const CARE_TYPES = ['hospice', 'home-health', 'palliative'] as const;

export function OnboardingPage() {
  const [careType, setCareType] = useState<(typeof CARE_TYPES)[number]>('hospice');
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get<{ data: OnboardingFlow }>(`/onboarding/flow/${careType}`)
      .then((res) => {
        if (!cancelled) setFlow(res.data.data);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message || 'Failed to load flow');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [careType]);

  return (
    <section className="p-4 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-slate-900">Onboarding</h1>
        <p className="text-slate-600 mt-1">
          Customer onboarding flow definitions. Per-org progress tracking + manager assignment
          are tracked in a follow-up issue.
        </p>
        <div className="mt-3">
          <Link
            to="/admin/onboarding/emails"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            View email-template sequence &rarr;
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Care type</h2>
        <div className="flex gap-3 flex-wrap" role="tablist">
          {CARE_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              role="tab"
              aria-selected={careType === ct}
              onClick={() => setCareType(ct)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                careType === ct
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {ct.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading flow...</p>}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {flow && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 capitalize">
              {careType.replace('-', ' ')} flow
            </h2>
            <span className="text-sm text-slate-500">{flow.totalSteps} total steps</span>
          </div>
          <ol className="space-y-4">
            {flow.steps.map((step) => (
              <li key={step.number} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{step.title}</h3>
                    {step.required && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
