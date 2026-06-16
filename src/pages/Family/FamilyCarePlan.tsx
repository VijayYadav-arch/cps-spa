import { useEffect, useState } from 'react';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface CarePlan {
  id: number;
  status: string;
  effectiveDate: string;
  goals: string;
}

interface CarePlanResponse {
  data: CarePlan[];
}

export function FamilyCarePlan() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [plans, setPlans] = useState<CarePlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<CarePlanResponse>(`/patients/${patientId}/care-plan`)
      .then((r) => setPlans(r.data.data ?? []))
      .catch(() =>
        setError('Unable to load care plan. Please refresh or contact your care team.'),
      );
  }, [patientId]);

  if (error) {
    return (
      <p
        data-testid="family-error"
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </p>
    );
  }
  if (plans === null) {
    return (
      <p data-testid="family-loading" role="status" className="p-4 text-slate-500">
        Loading…
      </p>
    );
  }

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <h1 data-testid="page-title" className="text-2xl">
        Care Plan
      </h1>
      {plans.map((plan) => {
        let goals: unknown[] = [];
        try {
          const parsed: unknown = JSON.parse(plan.goals);
          if (Array.isArray(parsed)) goals = parsed;
        } catch {
          // ignore malformed JSON
        }
        return (
          <div
            key={plan.id}
            data-testid="care-plan-item"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-medium capitalize text-slate-600">
                {plan.status}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">
                Effective {new Date(plan.effectiveDate).toLocaleDateString()}
              </span>
            </div>
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {goals.map((g, i) => (
                <li key={`${i}:${String(g)}`}>{String(g)}</li>
              ))}
            </ul>
          </div>
        );
      })}
      {plans.length === 0 && (
        <p data-testid="care-plan-empty" className="text-slate-500">
          No care plan on file.
        </p>
      )}
    </section>
  );
}
