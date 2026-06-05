import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import {
  getOrgsStatus,
  type OnboardingRollup,
  type OnboardingStatus,
  type OrgStatusRow,
} from '@/api/onboardingStatus';

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

const STATUS_LABEL: Record<OnboardingStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'at-risk': 'At risk',
  'not-started': 'Not started',
};

const STATUS_BADGE: Record<OnboardingStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  'in-progress': 'bg-teal-100 text-teal-700',
  'at-risk': 'bg-amber-100 text-amber-700',
  'not-started': 'bg-slate-100 text-slate-600',
};

export function OnboardingPage() {
  const [careType, setCareType] = useState<(typeof CARE_TYPES)[number]>('hospice');
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [flowLoading, setFlowLoading] = useState(true);
  const [flowError, setFlowError] = useState<string | null>(null);

  const [rollup, setRollup] = useState<OnboardingRollup | null>(null);
  const [orgs, setOrgs] = useState<OrgStatusRow[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OnboardingStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    setFlowLoading(true);
    setFlowError(null);
    apiClient
      .get<{ data: OnboardingFlow }>(`/onboarding/flow/${careType}`)
      .then((res) => {
        if (!cancelled) setFlow(res.data.data);
      })
      .catch((e) => {
        if (!cancelled) setFlowError((e as Error).message || 'Failed to load flow');
      })
      .finally(() => {
        if (!cancelled) setFlowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [careType]);

  useEffect(() => {
    let cancelled = false;
    setStatusLoading(true);
    setStatusError(null);
    getOrgsStatus(statusFilter === 'all' ? undefined : { statusFilter })
      .then((res) => {
        if (cancelled) return;
        setRollup(res.rollup);
        setOrgs(res.data);
      })
      .catch((e) => {
        if (!cancelled) setStatusError((e as Error).message || 'Failed to load onboarding status');
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <section className="p-4 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-slate-900">Onboarding</h1>
        <p className="text-slate-600 mt-1">
          Track per-customer onboarding progress and explore the care-type flow definitions.
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

      {statusError && (
        <div role="alert" className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{statusError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Total orgs" value={rollup?.totalOrgs ?? 0} loading={statusLoading} />
        <KpiCard label="Completed" value={rollup?.completed ?? 0} loading={statusLoading} color="text-green-700" />
        <KpiCard label="In progress" value={rollup?.inProgress ?? 0} loading={statusLoading} color="text-teal-700" />
        <KpiCard label="At risk" value={rollup?.atRisk ?? 0} loading={statusLoading} color="text-amber-700" />
        <KpiCard
          label="Activation rate"
          value={`${rollup?.activationRate ?? 0}%`}
          loading={statusLoading}
          color="text-slate-900"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Per-org status</h2>
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filter by status">
            {(['all', 'completed', 'in-progress', 'at-risk', 'not-started'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={statusFilter === f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  statusFilter === f
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {statusLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : orgs.length === 0 ? (
          <p className="text-sm text-slate-500">No organizations match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Organization</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Status</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Progress</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Patients</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Claims</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.orgId} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-900">
                      <div className="font-medium">{o.orgName}</div>
                      <div className="text-xs text-slate-500 font-mono">{o.slug}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[o.status]}`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      Step {o.currentStep} of {o.totalSteps} &middot; {o.onboardingPercent}%
                    </td>
                    <td className="px-3 py-2 text-slate-600">{o.patientsCount}</td>
                    <td className="px-3 py-2 text-slate-600">{o.claimsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Care-type flow</h2>
        <div className="flex gap-3 flex-wrap" role="tablist" aria-label="Care type">
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

      {flowLoading && <p className="text-slate-500 text-sm">Loading flow...</p>}
      {flowError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{flowError}</p>
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

function KpiCard({
  label,
  value,
  loading,
  color = 'text-slate-900',
}: {
  label: string;
  value: number | string;
  loading: boolean;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{loading ? '—' : value}</p>
    </div>
  );
}
