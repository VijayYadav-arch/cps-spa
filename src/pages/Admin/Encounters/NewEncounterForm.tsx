import '@/styles/encounters.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encountersApi } from './encountersApi';
import {
  initialEncounterForm,
  type CreateEncounterRequest,
  type PatientSearchResult,
} from './encountersTypes';

/**
 * Single-page create form. 6 fields: patient (typeahead), service date,
 * provider, diagnosis codes, procedure codes, notes.
 *
 * Layout: grid-cols-1 on mobile, md:grid-cols-2 on tablet+. The patient
 * typeahead spans both columns. Touch targets min-h-12 mobile, shrinking at
 * md/lg.
 *
 * Patient selection: text input calls searchPatients(q) debounced 300ms; the
 * results dropdown renders each match as a button; clicking sets patientId
 * and replaces the input with a chip showing the selected name + a "Change"
 * affordance.
 */
export function NewEncounterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateEncounterRequest>(initialEncounterForm);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CreateEncounterRequest>(field: K, value: CreateEncounterRequest[K]) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  // Debounced patient search — only fires when no patient is currently selected
  // and the user has typed something. Clears results when the query is empty.
  useEffect(() => {
    if (selectedPatient || !patientQuery.trim()) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(() => {
      encountersApi
        .searchPatients(patientQuery)
        .then(setPatientResults)
        .catch(() => setPatientResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, selectedPatient]);

  function pickPatient(p: PatientSearchResult) {
    setSelectedPatient(p);
    setPatientResults([]);
    set('patientId', p.id);
  }

  function clearPatient() {
    setSelectedPatient(null);
    set('patientId', 0);
    setPatientQuery('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId) {
      setError('Please select a patient.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await encountersApi.create(form);
      navigate('/admin/encounters');
    } catch (err) {
      setError((err as Error).message || 'Failed to create encounter');
      setSubmitting(false);
    }
  }

  const inputCls =
    'px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500';

  return (
    <section className="max-w-3xl mx-auto p-4 lg:p-8">
      <h1 className="text-2xl font-serif text-navy-900 mb-6">New encounter</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient typeahead — full-width on tablet+. */}
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">Patient *</span>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 min-h-12 bg-teal-50 border border-teal-200 rounded-md">
              <span className="text-navy-900">
                {selectedPatient.firstName} {selectedPatient.lastName}
                {selectedPatient.organizationName ? ` (${selectedPatient.organizationName})` : ''}
              </span>
              <button
                type="button"
                onClick={clearPatient}
                className="text-sm text-teal-700 hover:underline min-h-11"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Search by patient name…"
                aria-label="Search patients"
                className={`w-full ${inputCls}`}
              />
              {patientResults.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 border border-navy-200 rounded-md bg-white max-h-60 overflow-y-auto shadow-lg">
                  {patientResults.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => pickPatient(p)}
                        className="w-full text-left px-3 py-2 min-h-12 hover:bg-navy-50"
                      >
                        {p.firstName} {p.lastName}
                        {p.organizationName ? (
                          <span className="text-navy-500 text-sm"> · {p.organizationName}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Service date *</span>
          <input
            id="serviceDate"
            type="date"
            required
            value={form.serviceDate}
            onChange={(e) => set('serviceDate', e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Provider *</span>
          <input
            id="provider"
            type="text"
            required
            value={form.provider}
            onChange={(e) => set('provider', e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Diagnosis codes *</span>
          <input
            id="diagnosisCodes"
            type="text"
            required
            value={form.diagnosisCodes}
            onChange={(e) => set('diagnosisCodes', e.target.value)}
            placeholder="ICD-10, comma-separated"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Procedure codes *</span>
          <input
            id="procedureCodes"
            type="text"
            required
            value={form.procedureCodes}
            onChange={(e) => set('procedureCodes', e.target.value)}
            placeholder="CPT/HCPCS, comma-separated"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">Notes</span>
          <textarea
            id="notes"
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            rows={4}
            className="px-3 py-2 rounded-md border border-navy-200 focus:border-teal-500"
          />
        </label>

        {error && (
          <p role="alert" className="md:col-span-2 text-red-600 text-sm">
            {error}
          </p>
        )}

        <div className="md:col-span-2 flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create encounter'}
          </button>
        </div>
      </form>
    </section>
  );
}
