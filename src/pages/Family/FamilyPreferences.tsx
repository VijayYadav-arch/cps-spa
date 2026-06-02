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
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {fetchError}
      </p>
    );
  }
  if (!loaded) {
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
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}
      >
        Notification Preferences
      </h1>
      {saved && (
        <p data-testid="preferences-saved" style={{ color: '#16a34a', fontSize: 14, marginBottom: 12 }}>
          Saved.
        </p>
      )}
      {saveError && (
        <p
          data-testid="preferences-save-error"
          role="alert"
          style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}
        >
          {saveError}
        </p>
      )}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Event
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                SMS
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {EVENT_LABELS.map(({ key, label }) => {
              const ch = prefs[key] ?? DEFAULT_PREFS;
              return (
                <tr key={key} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>{label}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
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
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
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
