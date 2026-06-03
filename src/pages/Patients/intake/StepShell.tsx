import type { ReactNode } from 'react';

interface Props {
  step: number;
  totalSteps: number;
  stepNames: readonly string[];
  saving: boolean;
  children: ReactNode;
}

export function StepShell({ step, totalSteps, stepNames, saving, children }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto p-4 lg:p-8">
      <aside className="hidden lg:block lg:col-span-1">
        <ol className="space-y-2 sticky top-8">
          {stepNames.map((name, i) => {
            const n = i + 1;
            const state = n < step ? 'done' : n === step ? 'active' : 'pending';
            return (
              <li
                key={n}
                className={`flex items-center gap-3 p-3 rounded-md ${
                  state === 'active'
                    ? 'bg-teal-50 text-teal-700'
                    : state === 'done'
                      ? 'text-navy-700'
                      : 'text-navy-500'
                }`}
              >
                <span
                  className={`w-7 h-7 inline-flex items-center justify-center rounded-full ${
                    state === 'done'
                      ? 'bg-teal-600 text-white'
                      : state === 'active'
                        ? 'border-2 border-teal-600'
                        : 'border border-navy-200'
                  }`}
                >
                  {state === 'done' ? '✓' : n}
                </span>
                <span className="text-sm">{name}</span>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="lg:col-span-3 pb-32 lg:pb-0">
        <header className="sticky top-0 bg-white py-3 mb-4 lg:relative lg:py-0 lg:mb-6">
          <p className="text-sm text-navy-500">
            Step {step} of {totalSteps}
          </p>
          <h1 className="text-xl md:text-2xl font-serif text-navy-900">{stepNames[step - 1]}</h1>
          {saving && <p className="text-xs text-teal-600 mt-1">Saving…</p>}
        </header>
        {children}
      </section>
    </div>
  );
}
