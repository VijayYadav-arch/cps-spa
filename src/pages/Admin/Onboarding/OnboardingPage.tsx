import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import {
  assignOnboardingManager,
  getOrgsStatus,
  listOnboardingManagers,
  listOrgUsers,
  sendOnboardingEmail,
  type OnboardingManager,
  type OnboardingRollup,
  type OnboardingStatus,
  type OrgStatusRow,
  type OrgUser,
} from '@/api/onboardingStatus';
import { getWelcomeSequence } from '@/data/onboardingEmailTemplates';

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

  const [managers, setManagers] = useState<OnboardingManager[]>([]);
  const [assigningOrgId, setAssigningOrgId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [emailModalOrg, setEmailModalOrg] = useState<OrgStatusRow | null>(null);

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
    listOnboardingManagers()
      .then((rows) => {
        if (!cancelled) setManagers(rows);
      })
      .catch(() => {
        /* manager fetch failure is non-fatal; assign dropdown will just be empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleAssignManager = async (orgId: number, raw: string) => {
    setAssigningOrgId(orgId);
    setActionMessage(null);
    const managerUserId = raw === '' ? null : Number(raw);
    try {
      const updated = await assignOnboardingManager(orgId, managerUserId);
      const name = managerUserId === null
        ? null
        : (managers.find((m) => m.userId === managerUserId)?.name ?? null);
      setOrgs((prev) =>
        prev.map((o) =>
          o.orgId === orgId
            ? {
                ...o,
                assignedManagerUserId: updated.assignedManagerUserId,
                assignedManagerName: name,
                assignedManagerAt: updated.assignedManagerAt,
              }
            : o
        )
      );
      setActionMessage(`Manager ${managerUserId === null ? 'cleared' : 'assigned'} for org ${orgId}.`);
    } catch (e) {
      setActionMessage((e as Error).message || 'Failed to assign manager');
    } finally {
      setAssigningOrgId(null);
    }
  };

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
            {actionMessage && (
              <p role="status" className="text-xs text-slate-600 mb-2">{actionMessage}</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Organization</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Status</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Progress</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Manager</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Patients</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Claims</th>
                  <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">Actions</th>
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
                    <td className="px-3 py-2 text-slate-600">
                      <label className="sr-only" htmlFor={`mgr-${o.orgId}`}>Manager for {o.orgName}</label>
                      <select
                        id={`mgr-${o.orgId}`}
                        value={o.assignedManagerUserId ?? ''}
                        onChange={(e) => handleAssignManager(o.orgId, e.target.value)}
                        disabled={assigningOrgId === o.orgId}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {managers.map((m) => (
                          <option key={m.userId} value={m.userId}>{m.name || m.email}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{o.patientsCount}</td>
                    <td className="px-3 py-2 text-slate-600">{o.claimsCount}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setEmailModalOrg(o)}
                        className="text-xs text-teal-700 hover:text-teal-800 underline"
                      >
                        Send email
                      </button>
                    </td>
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

      {emailModalOrg && (
        <SendEmailModal
          org={emailModalOrg}
          onClose={(message) => {
            setEmailModalOrg(null);
            if (message) setActionMessage(message);
          }}
        />
      )}
    </section>
  );
}

function SendEmailModal({ org, onClose }: { org: OrgStatusRow; onClose: (msg?: string) => void }) {
  const templates = getWelcomeSequence();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [recipientUserId, setRecipientUserId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    listOrgUsers(org.orgId)
      .then((rows) => {
        if (cancelled) return;
        setUsers(rows);
        setRecipientUserId(rows[0]?.userId ?? null);
      })
      .catch((e) => {
        if (!cancelled) setUsersError((e as Error).message || 'Failed to load org users');
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [org.orgId]);

  const template = templates.find((t) => t.id === templateId) ?? null;
  const recipient = users.find((u) => u.userId === recipientUserId) ?? null;

  const render = (raw: string): string =>
    raw
      .replace(/\{\{firstName\}\}/g, recipient?.name?.split(' ')[0] ?? '')
      .replace(/\{\{organizationName\}\}/g, org.orgName)
      .replace(/\{\{dashboardUrl\}\}/g, '/admin');

  const handleSend = async () => {
    if (!template || !recipientUserId) return;
    setSending(true);
    setSendError(null);
    try {
      const subject = render(template.subject);
      const bodyHtml = render(template.bodyHtml);
      await sendOnboardingEmail(org.orgId, {
        templateId: template.id,
        recipientUserId,
        subject,
        bodyHtml,
      });
      onClose(`Email "${template.id}" sent to ${recipient?.email ?? 'recipient'}.`);
    } catch (e) {
      setSendError((e as Error).message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Send email to ${org.orgName}`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <header className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Send onboarding email</h2>
            <p className="text-xs text-slate-500">to {org.orgName}</p>
          </div>
          <button type="button" onClick={() => onClose()} aria-label="Close" className="text-slate-400 hover:text-slate-600">&times;</button>
        </header>

        {usersError && (
          <div role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{usersError}</div>
        )}
        {sendError && (
          <div role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{sendError}</div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="email-recipient" className="block text-xs font-medium text-slate-700 mb-1">Recipient</label>
            <select
              id="email-recipient"
              value={recipientUserId ?? ''}
              onChange={(e) => setRecipientUserId(e.target.value === '' ? null : Number(e.target.value))}
              disabled={usersLoading}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {usersLoading && <option>Loading users...</option>}
              {!usersLoading && users.length === 0 && <option value="">No active users in this org</option>}
              {!usersLoading && users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {(u.name || u.email)} &lt;{u.email}&gt; ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="email-template" className="block text-xs font-medium text-slate-700 mb-1">Template</label>
            <select
              id="email-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>Day {t.day}: {t.subject}</option>
              ))}
            </select>
          </div>
          {template && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject preview</label>
              <p className="text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">{render(template.subject)}</p>
            </div>
          )}
        </div>

        <footer className="mt-5 flex gap-2 justify-end">
          <button type="button" onClick={() => onClose()} disabled={sending} className="px-3 py-1.5 text-sm rounded text-slate-700 hover:bg-slate-100">Cancel</button>
          <button type="button" onClick={handleSend} disabled={sending || !recipientUserId || !template} className="px-4 py-1.5 text-sm rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
            {sending ? 'Sending...' : 'Send'}
          </button>
        </footer>
      </div>
    </div>
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
