import { Routes, Route, Navigate } from 'react-router-dom';
import { PlatformDashboard } from './PlatformDashboard';
import { ApiKeysPage } from './ApiKeysPage';
import { WebhooksPage } from './WebhooksPage';
import { BackgroundJobsPage } from './BackgroundJobsPage';

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={<PlatformDashboard />} />
      <Route path="api-keys" element={<ApiKeysPage />} />
      <Route path="webhooks" element={<WebhooksPage />} />
      <Route path="background-jobs" element={<BackgroundJobsPage />} />
      <Route path="*" element={<Navigate to="/platform" replace />} />
    </Routes>
  );
}
