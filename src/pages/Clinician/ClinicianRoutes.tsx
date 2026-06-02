import { Routes, Route } from 'react-router-dom';
import { ClinicianDashboard } from './ClinicianDashboard';
import { ClinicianPatients } from './ClinicianPatients';
import { ClinicianPatientDetail } from './ClinicianPatientDetail';
import { ClinicianVisitNew } from './ClinicianVisitNew';

export function ClinicianRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<ClinicianDashboard />} />
      <Route path="patients" element={<ClinicianPatients />} />
      <Route path="patients/:id" element={<ClinicianPatientDetail />} />
      <Route path="visits/new" element={<ClinicianVisitNew />} />
    </Routes>
  );
}
