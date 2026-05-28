import { useState } from 'react';
import type { HospiceRcaMethod, HospiceQapiPipCategory } from '@/api/qapi';

const METHODS: HospiceRcaMethod[] = ['FiveWhys', 'FishboneIshikawa', 'FailureModeAnalysis'];
const PIP_CATEGORIES: HospiceQapiPipCategory[] = ['PatientSafety', 'ClinicalOutcome', 'CarePlanning', 'PatientExperience', 'Other'];

export interface RcaFormSubmitPayload {
  method: HospiceRcaMethod;
  contributingFactors: string;
  rootCauseSummary: string;
  createPip: boolean;
  pipTitle?: string;
  pipDescription?: string;
  pipCategory?: HospiceQapiPipCategory;
}

export function RcaForm({ onSubmit, submitting = false }: {
  onSubmit: (payload: RcaFormSubmitPayload) => void;
  submitting?: boolean;
}) {
  const [method, setMethod] = useState<HospiceRcaMethod>('FiveWhys');
  const [contributingFactors, setContributingFactors] = useState('');
  const [rootCauseSummary, setRootCauseSummary] = useState('');
  const [createPip, setCreatePip] = useState(false);
  const [pipTitle, setPipTitle] = useState('');
  const [pipDescription, setPipDescription] = useState('');
  const [pipCategory, setPipCategory] = useState<HospiceQapiPipCategory>('PatientSafety');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      method,
      contributingFactors,
      rootCauseSummary,
      createPip,
      pipTitle: createPip ? pipTitle : undefined,
      pipDescription: createPip ? pipDescription : undefined,
      pipCategory: createPip ? pipCategory : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rca-form" aria-label="RCA form">
      <label htmlFor="rca-method">Method</label>
      <select id="rca-method" value={method} onChange={e => setMethod(e.target.value as HospiceRcaMethod)}>
        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <label htmlFor="rca-factors">Contributing Factors</label>
      <textarea id="rca-factors" value={contributingFactors} onChange={e => setContributingFactors(e.target.value)} rows={4} />

      <label htmlFor="rca-root-cause">Root Cause Summary</label>
      <textarea id="rca-root-cause" value={rootCauseSummary} onChange={e => setRootCauseSummary(e.target.value)} rows={4} />

      <label>
        <input type="checkbox" checked={createPip} onChange={e => setCreatePip(e.target.checked)} /> Create linked PIP
      </label>

      {createPip && (
        <>
          <label htmlFor="pip-title">PIP Title</label>
          <input id="pip-title" value={pipTitle} onChange={e => setPipTitle(e.target.value)} />
          <label htmlFor="pip-description">PIP Description</label>
          <textarea id="pip-description" value={pipDescription} onChange={e => setPipDescription(e.target.value)} rows={3} />
          <label htmlFor="pip-category">PIP Category</label>
          <select id="pip-category" value={pipCategory} onChange={e => setPipCategory(e.target.value as HospiceQapiPipCategory)}>
            {PIP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </>
      )}

      <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit RCA'}</button>
    </form>
  );
}
