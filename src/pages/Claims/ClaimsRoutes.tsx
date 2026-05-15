import { Routes, Route } from 'react-router-dom';
import { ClaimsList } from './ClaimsList';
import { ClaimDetail } from './ClaimDetail';

export function ClaimsRoutes() {
  return (
    <Routes>
      <Route index element={<ClaimsList />} />
      <Route path=":id" element={<ClaimDetail />} />
    </Routes>
  );
}
