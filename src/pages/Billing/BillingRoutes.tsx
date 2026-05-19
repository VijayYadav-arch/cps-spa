import { Routes, Route, Navigate } from 'react-router-dom';
import { BillingDashboard } from './BillingDashboard';
import { DenialQueuePage } from './DenialQueuePage';
import { ArDashboardPage } from './ArDashboardPage';
import { SecondaryClaimsPage } from './SecondaryClaimsPage';

export function BillingRoutes() {
  return (
    <Routes>
      <Route index element={<BillingDashboard />} />
      <Route path="denials" element={<DenialQueuePage />} />
      <Route path="ar" element={<ArDashboardPage />} />
      <Route path="secondary" element={<SecondaryClaimsPage />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );
}
