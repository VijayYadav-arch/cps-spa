import type { FormData } from '../intakeTypes';

interface StepProps {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

export function Step1OrganizationAndBasics(_props: StepProps) {
  return (
    <div className="p-6 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
      <p className="font-medium">Step 1: Organization & Patient — placeholder</p>
      <p className="text-sm mt-2">
        This step component is a placeholder. The full field set will land in a follow-up commit.
        Reference: <code>git show pre-p4-b-cutover:src/app/admin/patients/intake/page.tsx</code>{' '}
        (lines covering step 1: org dropdown, firstName, middleName, lastName, dateOfBirth, gender,
        maritalStatus, race, ethnicity, preferredLanguage).
      </p>
    </div>
  );
}
