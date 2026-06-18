export interface FormData {
  organizationId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  race: string;
  ethnicity: string;
  preferredLanguage: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  facilityName: string;
  facilityType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  medicareId: string;
  medicaidId: string;
  primaryDiagnosis: string;
  primaryDiagnosisDesc: string;
  secondaryDiagnosesText: string;
  attendingPhysicianName: string;
  attendingPhysicianNPI: string;
  attendingPhysicianPhone: string;
  admissionType: string;
  admittedAt: string;
  levelOfCare: string;
  benefitPeriod: string;
  startOfCare: string;
  homeboundStatus: boolean;
  homeboundReason: string;
  certifiedByName: string;
  certifiedByNPI: string;
  secondCertifiedByName: string;
  secondCertifiedByNPI: string;
  certificationDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  faceToFaceDate: string;
  faceToFaceProvider: string;
  certificationNotes: string;
}

export const initialForm: FormData = {
  organizationId: '', firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: '', maritalStatus: '', race: '', ethnicity: '',
  preferredLanguage: 'English',
  phone: '', email: '', address: '', city: '', state: '', zipCode: '',
  facilityName: '', facilityType: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  medicareId: '', medicaidId: '',
  primaryDiagnosis: '', primaryDiagnosisDesc: '', secondaryDiagnosesText: '',
  attendingPhysicianName: '', attendingPhysicianNPI: '', attendingPhysicianPhone: '',
  admissionType: 'hospice',
  admittedAt: new Date().toISOString().split('T')[0],
  levelOfCare: 'RHC', benefitPeriod: '1',
  startOfCare: '',
  homeboundStatus: false, homeboundReason: '',
  certifiedByName: '', certifiedByNPI: '',
  secondCertifiedByName: '', secondCertifiedByNPI: '',
  certificationDate: new Date().toISOString().split('T')[0],
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo: '', faceToFaceDate: '', faceToFaceProvider: '',
  certificationNotes: '',
};

export interface DraftResponse {
  id: number;
  ownerUserId: string;
  organizationId: number;
  currentStep: number;
  formJson: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/**
 * Hospice certification details captured at intake Step 5, handed off to the
 * election wizard via router state so they aren't lost at the intake→election
 * boundary (H8). These are free-text/coordinator-entered values; structured
 * HospiceCertification / FaceToFace records are created later in the hospice
 * workflow once the certifying physician is resolved to a user.
 */
export interface IntakeCertificationHandoff {
  benefitPeriod: string;
  levelOfCare: string;
  certifiedByName: string;
  certifiedByNPI: string;
  secondCertifiedByName: string;
  secondCertifiedByNPI: string;
  certificationDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  faceToFaceDate: string;
  faceToFaceProvider: string;
  certificationNotes: string;
}

export function toCertificationHandoff(form: FormData): IntakeCertificationHandoff {
  return {
    benefitPeriod: form.benefitPeriod,
    levelOfCare: form.levelOfCare,
    certifiedByName: form.certifiedByName,
    certifiedByNPI: form.certifiedByNPI,
    secondCertifiedByName: form.secondCertifiedByName,
    secondCertifiedByNPI: form.secondCertifiedByNPI,
    certificationDate: form.certificationDate,
    effectiveFrom: form.effectiveFrom,
    effectiveTo: form.effectiveTo,
    faceToFaceDate: form.faceToFaceDate,
    faceToFaceProvider: form.faceToFaceProvider,
    certificationNotes: form.certificationNotes,
  };
}

export const STEP_NAMES = [
  'Organization & Patient',
  'Contact & Facility',
  'Insurance & Clinical',
  'Admission',
  'Certification',
] as const;
