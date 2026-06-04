import { Routes, Route, Navigate } from 'react-router-dom';
import { ClaimsList } from './ClaimsList';
import { ClaimDetail } from './ClaimDetail';
import { ClaimLifecyclePage } from './ClaimLifecyclePage';
import { NewClaimForm } from './NewClaimForm';

export function ClaimsRoutes() {
  return (
    <Routes>
      <Route index element={<ClaimsList />} />
      <Route path="new" element={<NewClaimForm />} />
      <Route path=":id" element={<ClaimDetail />} />
      <Route path=":id/lifecycle" element={<ClaimLifecyclePage />} />
      <Route path="*" element={<Navigate to="/claims" replace />} />
    </Routes>
  );
}
