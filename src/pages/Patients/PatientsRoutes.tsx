import { Routes, Route, Navigate } from 'react-router-dom';
import { PatientsList } from './PatientsList';
import { PatientDetail } from './PatientDetail';
import { PatientHistory } from './PatientHistory';
import { HospiceElectionWizard } from '@/pages/Hospice/HospiceElectionWizard';
import { HospiceElectionDetail } from '@/pages/Hospice/HospiceElectionDetail';
import { HospiceRevocation } from '@/pages/Hospice/HospiceRevocation';
import { HospiceAttendanceGrid } from '@/pages/Hospice/HospiceAttendanceGrid';
import { HospicePerDiemClaim } from '@/pages/Hospice/HospicePerDiemClaim';

export function PatientsRoutes() {
  return (
    <Routes>
      <Route index element={<PatientsList />} />
      <Route path=":id" element={<PatientDetail />} />
      <Route path=":id/history" element={<PatientHistory />} />
      <Route path=":id/hospice/new" element={<HospiceElectionWizard />} />
      <Route path=":id/hospice/:electionId" element={<HospiceElectionDetail />} />
      <Route path=":id/hospice/:electionId/revoke" element={<HospiceRevocation />} />
      <Route path=":id/hospice/:electionId/attendance" element={<HospiceAttendanceGrid />} />
      <Route path=":id/hospice/:electionId/per-diem-claim" element={<HospicePerDiemClaim />} />
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
