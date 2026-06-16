import { useEffect, useState } from 'react';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface ChannelPrefs {
  sms: boolean;
  email: boolean;
}

interface Prefs {
  visit_scheduled?: ChannelPrefs;
  visit_completed?: ChannelPrefs;
  care_plan_updated?: ChannelPrefs;
  medication_changed?: ChannelPrefs;
  document_uploaded?: ChannelPrefs;
}

interface PreferencesResponse {
  preferences: string;
}

const DEFAULT_PREFS: ChannelPrefs = { sms: true, email: true };

const EVENT_LABELS: Array<{ key: keyof Prefs; label: string }> = [
  { key: 'visit_scheduled', label: 'Visit Scheduled' },
  { key: 'visit_completed', label: 'Visit Completed' },
  { key: 'care_plan_updated', label: 'Care Plan Updated' },
  { key: 'medication_changed', label: 'Medication Changed' },
  { key: 'document_uploaded', label: 'Document Uploaded' },
];

export function FamilyPreferences() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<PreferencesResponse>(`/patients/${patientId}/preferences`)
      .then((r) => {
        try {
          const parsed = JSON.parse(r.data.preferences ?? '{}') as Prefs;
          setPrefs(parsed);
        } catch {
          setPrefs({});
        }
        setLoaded(true);
      })
      .catch(() => setFetchError('Unable to load preferences. Please refresh.'));
  }, [patientId]);

  async function save(updated: Prefs): Promise<void> {
    if (!patientId) return;
    await familyApi.put(`/patients/${patientId}/preferences`, {
      preferences: JSON.stringify(updated),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggle(key: keyof Prefs, channel: 'sms' | 'email'): Promise<void> {
    const current = prefs[key] ?? DEFAULT_PREFS;
    const updated: Prefs = { ...prefs, [key]: { ...current, [channel]: !current[channel] } };
    const previous = prefs;
    setPrefs(updated);
    setSaveError(null);
    try {
      await save(updated);
    } catch {
      setSaveError('Could not save your preferences. Please try again.');
      setPrefs(previous);
    }
  }

  if (fetchError) {
    return (
      <p
        data-testid="family-error"
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {fetchError}
      </p>
    );
  }
  if (!loaded) {
    return (
      <p data-testid="family-loading" role="status" className="p-4 text-slate-500">
        Loading…
      </p>
    );
  }

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <h1 data-testid="page-title" className="text-2xl">
        Notification Preferences
      </h1>
      {saved && (
        <p
          data-testid="preferences-saved"
          className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
        >
          Saved.
        </p>
      )}
      {saveError && (
        <p
          data-testid="preferences-save-error"
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {saveError}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-center">SMS</th>
              <th className="px-4 py-3 text-center">Email</th>
            </tr>
          </thead>
          <tbody>
            {EVENT_LABELS.map(({ key, label }) => {
              const ch = prefs[key] ?? DEFAULT_PREFS;
              return (
                <tr key={key} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{label}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={ch.sms}
                      onChange={() => {
                        void toggle(key, 'sms');
                      }}
                      aria-label={`${label} via SMS`}
                      data-testid={`pref-${key}-sms`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={ch.email}
                      onChange={() => {
                        void toggle(key, 'email');
                      }}
                      aria-label={`${label} via Email`}
                      data-testid={`pref-${key}-email`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
