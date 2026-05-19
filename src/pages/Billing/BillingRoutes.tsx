import { Routes, Route, Navigate } from 'react-router-dom';
import { BillingDashboard } from './BillingDashboard';
import { DenialQueuePage } from './DenialQueuePage';

export function BillingRoutes() {
  return (
    <Routes>
      <Route index element={<BillingDashboard />} />
      <Route path="denials" element={<DenialQueuePage />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );
}
