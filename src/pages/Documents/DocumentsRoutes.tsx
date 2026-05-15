import { Routes, Route, Navigate } from 'react-router-dom';
import { DocumentsList } from './DocumentsList';

export function DocumentsRoutes() {
  return (
    <Routes>
      <Route index element={<DocumentsList />} />
      <Route path="*" element={<Navigate to="/documents" replace />} />
    </Routes>
  );
}
