import '@/styles/intake.css';

export function NewPatientForm() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-serif text-navy-900 mb-4">New Patient — placeholder</h1>
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
        <p>
          The simple single-page new-patient form lands in a follow-up commit. For multi-step intake
          use{' '}
          <a href="/patients/intake" className="text-teal-600 underline">
            /patients/intake
          </a>
          .
        </p>
      </div>
    </main>
  );
}
