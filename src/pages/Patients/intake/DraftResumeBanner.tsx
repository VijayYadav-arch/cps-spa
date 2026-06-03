import type { DraftResponse } from './intakeTypes';

interface Props {
  draft: DraftResponse;
  onResume: () => void;
  onDiscard: () => void;
}

export function DraftResumeBanner({ draft, onResume, onDiscard }: Props) {
  return (
    <section className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-serif text-navy-900 mb-2">Resume in-progress intake?</h1>
        <p className="text-navy-700 mb-6">
          You left an intake at step {draft.currentStep} of 5 (last saved{' '}
          {new Date(draft.updatedAt).toLocaleString()}).
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <button
            onClick={onResume}
            className="flex-1 px-4 py-3 min-h-12 rounded-md bg-teal-600 text-white"
          >
            Resume draft
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-3 min-h-12 rounded-md border border-navy-200"
          >
            Discard and start fresh
          </button>
        </div>
      </div>
    </section>
  );
}
