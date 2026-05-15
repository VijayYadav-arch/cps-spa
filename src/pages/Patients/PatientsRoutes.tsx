import { Routes, Route, Navigate } from 'react-router-dom';
import { PatientsList } from './PatientsList';
import { PatientDetail } from './PatientDetail';
import { PatientHistory } from './PatientHistory';

export function PatientsRoutes() {
  return (
    <Routes>
      <Route index element={<PatientsList />} />
      <Route path=":id" element={<PatientDetail />} />
      <Route path=":id/history" element={<PatientHistory />} />
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
