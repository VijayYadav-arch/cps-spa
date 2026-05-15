import { Routes, Route, Navigate } from 'react-router-dom';
import { ClinicalOverview } from './ClinicalOverview';

export function ClinicalRoutes() {
  return (
    <Routes>
      <Route index element={<ClinicalOverview />} />
      <Route path="*" element={<Navigate to="/clinical" replace />} />
    </Routes>
  );
}
