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
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {error}
      </p>
    );
  }
  if (plans === null) {
    return (
      <p data-testid="family-loading" style={{ color: '#94a3b8', padding: 16 }}>
        Loading…
      </p>
    );
  }

  return (
    <section style={{ padding: 16 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}
      >
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
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#475569',
                  textTransform: 'capitalize',
                }}
              >
                {plan.status}
              </span>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span style={{ fontSize: 14, color: '#64748b' }}>
                Effective {new Date(plan.effectiveDate).toLocaleDateString()}
              </span>
            </div>
            <ul
              style={{
                fontSize: 14,
                color: '#475569',
                paddingLeft: 20,
                margin: 0,
                listStyle: 'disc',
              }}
            >
              {goals.map((g, i) => (
                <li key={`${i}:${String(g)}`} style={{ marginBottom: 4 }}>
                  {String(g)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {plans.length === 0 && (
        <p data-testid="care-plan-empty" style={{ color: '#94a3b8' }}>
          No care plan on file.
        </p>
      )}
    </section>
  );
}
