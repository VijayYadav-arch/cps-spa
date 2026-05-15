import { Routes, Route, Navigate } from 'react-router-dom';
import { BillingDashboard } from './BillingDashboard';

export function BillingRoutes() {
  return (
    <Routes>
      <Route index element={<BillingDashboard />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );
}
