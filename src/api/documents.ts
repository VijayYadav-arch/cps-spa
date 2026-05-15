import { apiClient } from './client';

export interface Document {
  id: number;
  organizationId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category: string;
  notes: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// GET /api/v2/documents?page=&pageSize=
export const getDocuments = (params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: Document[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: Document[]; pagination: PaginationMeta }>('/documents', { params })
    .then((r) => r.data);

// POST /api/v2/documents/upload  (multipart/form-data)
export const uploadDocument = (
  file: File,
  category?: string,
  notes?: string
): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  if (notes) formData.append('notes', notes);
  return apiClient
    .post<{ data: Document }>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.data);
};
