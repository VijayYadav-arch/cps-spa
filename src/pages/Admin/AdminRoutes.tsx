import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

export function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
