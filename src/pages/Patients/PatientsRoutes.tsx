import { Routes, Route, Navigate } from 'react-router-dom';
import { PatientsList } from './PatientsList';
import { PatientDetail } from './PatientDetail';
import { PatientHistory } from './PatientHistory';
import { IntakeWizard } from './intake/IntakeWizard';
import { NewPatientForm } from './NewPatientForm';
import { HospiceElectionWizard } from '@/pages/Hospice/HospiceElectionWizard';
import { HospiceElectionDetail } from '@/pages/Hospice/HospiceElectionDetail';
import { HospiceRevocation } from '@/pages/Hospice/HospiceRevocation';
import { HospiceAttendanceGrid } from '@/pages/Hospice/HospiceAttendanceGrid';
import { HospicePerDiemClaim } from '@/pages/Hospice/HospicePerDiemClaim';
import { HospiceHopeForm } from '@/pages/Hospice/HospiceHopeForm';
import { HospiceIdgScheduler } from '@/pages/Hospice/HospiceIdgScheduler';
import { HospiceCarePlanReviewLog } from '@/pages/Hospice/HospiceCarePlanReviewLog';
import { HospiceCertificationSignPanel } from '@/pages/Hospice/HospiceCertificationSignPanel';
import { RoleRoute, PERMISSIONS } from '@/permissions';

export function PatientsRoutes() {
  return (
    <Routes>
      <Route
        path="intake"
        element={
          <RoleRoute required={PERMISSIONS.PATIENTS_INTAKE}>
            <IntakeWizard />
          </RoleRoute>
        }
      />
      <Route
        path="new"
        element={
          <RoleRoute required={PERMISSIONS.PATIENTS_INTAKE}>
            <NewPatientForm />
          </RoleRoute>
        }
      />
      <Route index element={<PatientsList />} />
      <Route path=":id" element={<PatientDetail />} />
      <Route path=":id/history" element={<PatientHistory />} />
      <Route path=":id/hospice/new" element={<HospiceElectionWizard />} />
      <Route path=":id/hospice/:electionId" element={<HospiceElectionDetail />} />
      <Route path=":id/hospice/:electionId/revoke" element={<HospiceRevocation />} />
      <Route path=":id/hospice/:electionId/attendance" element={<HospiceAttendanceGrid />} />
      <Route path=":id/hospice/:electionId/per-diem-claim" element={<HospicePerDiemClaim />} />
      <Route path=":id/hospice/:electionId/hope" element={<HospiceHopeForm />} />
      <Route path=":id/hospice/:electionId/hope/:assessmentId" element={<HospiceHopeForm />} />
      <Route path=":id/hospice/:electionId/idg" element={<HospiceIdgScheduler />} />
      <Route path=":id/hospice/:electionId/care-plan-reviews/:carePlanId" element={<HospiceCarePlanReviewLog />} />
      <Route path=":id/hospice/:electionId/certifications/:certId" element={<HospiceCertificationSignPanel />} />
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
