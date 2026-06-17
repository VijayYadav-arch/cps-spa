import { Routes, Route, Navigate } from 'react-router-dom';
import { ClinicalOverview } from './ClinicalOverview';
import { CarePlansList } from './CarePlansList';
import { PriorAuthList } from './PriorAuthList';

export function ClinicalRoutes() {
  return (
    <Routes>
      <Route index element={<ClinicalOverview />} />
      <Route path="care-plans" element={<CarePlansList />} />
      <Route path="prior-auth" element={<PriorAuthList />} />
      <Route path="*" element={<Navigate to="/clinical" replace />} />
    </Routes>
  );
}
