import { Routes, Route, Navigate } from 'react-router-dom';
import { PlatformDashboard } from './PlatformDashboard';

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={<PlatformDashboard />} />
      <Route path="*" element={<Navigate to="/platform" replace />} />
    </Routes>
  );
}
