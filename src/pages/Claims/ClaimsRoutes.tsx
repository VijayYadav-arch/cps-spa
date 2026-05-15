import { Routes, Route, Navigate } from 'react-router-dom';
import { ClaimsList } from './ClaimsList';
import { ClaimDetail } from './ClaimDetail';

export function ClaimsRoutes() {
  return (
    <Routes>
      <Route index element={<ClaimsList />} />
      <Route path=":id" element={<ClaimDetail />} />
      <Route path="*" element={<Navigate to="/claims" replace />} />
    </Routes>
  );
}
