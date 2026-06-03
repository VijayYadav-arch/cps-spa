import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { initialForm, type FormData } from '@/pages/Patients/intake/intakeTypes';
import { Step1OrganizationAndBasics } from '@/pages/Patients/intake/steps/Step1OrganizationAndBasics';
import { Step2ContactAndFacility } from '@/pages/Patients/intake/steps/Step2ContactAndFacility';
import { Step3InsuranceAndClinical } from '@/pages/Patients/intake/steps/Step3InsuranceAndClinical';
import { Step4Admission } from '@/pages/Patients/intake/steps/Step4Admission';
import { Step5Certification } from '@/pages/Patients/intake/steps/Step5Certification';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

import { apiClient } from '@/api/client';

interface RenderProps {
  formOverrides?: Partial<FormData>;
}

function renderStep1({ formOverrides = {} }: RenderProps = {}) {
  const onChange = vi.fn();
  const result = render(
    <Step1OrganizationAndBasics
      form={{ ...initialForm, ...formOverrides }}
      errors={{}}
      onChange={onChange}
    />
  );
  return { ...result, onChange };
}

function renderStep4({ formOverrides = {} }: RenderProps = {}) {
  const onChange = vi.fn();
  const result = render(
    <Step4Admission
      form={{ ...initialForm, ...formOverrides }}
      errors={{}}
      onChange={onChange}
    />
  );
  return { ...result, onChange };
}

describe('intake step components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Step1 calls the Organizations fetch on mount', async () => {
    renderStep1();
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/organizations',
        expect.objectContaining({ params: { pageSize: 200 } })
      );
    });
  });

  it('Step1 renders all 10 inputs (org dropdown + 9 name/demographic fields)', () => {
    renderStep1();
    // Use a combination of role-based queries to assert input count.
    const selects = screen.getAllByRole('combobox');
    const textboxes = screen.getAllByRole('textbox');
    // Selects: organizationId, gender, maritalStatus, race, ethnicity = 5
    // Textboxes (input type=text plus date inputs default to no role; date inputs render as 'textbox' in jsdom): firstName, middleName, lastName, preferredLanguage
    // dateOfBirth (type=date) renders without a 'textbox' role in jsdom, so query by label.
    expect(selects.length).toBeGreaterThanOrEqual(5);
    expect(textboxes.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
  });

  it('Step2 renders contact + facility + emergency-contact field clusters', () => {
    render(
      <Step2ContactAndFacility form={initialForm} errors={{}} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^state$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/facility name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/facility type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
  });

  it('Step3 renders insurance, diagnosis, and physician fields', () => {
    render(
      <Step3InsuranceAndClinical form={initialForm} errors={{}} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText(/medicare id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/medicaid id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/primary diagnosis \(icd-10\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diagnosis description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secondary diagnoses/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/physician name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^npi$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/physician phone/i)).toBeInTheDocument();
  });

  it('Step4 hides homeboundReason when homeboundStatus is false', () => {
    renderStep4({ formOverrides: { homeboundStatus: false } });
    expect(screen.queryByLabelText(/homebound reason/i)).not.toBeInTheDocument();
  });

  it('Step4 shows homeboundReason when homeboundStatus is true', () => {
    renderStep4({ formOverrides: { homeboundStatus: true } });
    expect(screen.getByLabelText(/homebound reason/i)).toBeInTheDocument();
  });

  it('Step5 renders certification + dates + face-to-face fields', () => {
    render(
      <Step5Certification
        form={{ ...initialForm, admissionType: 'hospice' }}
        errors={{}}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/certifying physician name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/certifying physician npi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/second physician name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/second physician npi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/certification date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/effective from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/effective to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/face-to-face date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/face-to-face provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/certification notes/i)).toBeInTheDocument();
  });
});
