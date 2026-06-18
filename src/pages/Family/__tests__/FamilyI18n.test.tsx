/**
 * Confirms the four translated family-portal surfaces switch language with
 * i18next at runtime. Each page is rendered twice (en-US then es-US) and we
 * assert key UI strings appear in the active locale.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { FamilyLoginPage } from '../FamilyLoginPage';
import { FamilyMedications } from '../FamilyMedications';
import { FamilyVisits } from '../FamilyVisits';
import { FamilyDocuments } from '../FamilyDocuments';
import { FamilyBilling } from '../FamilyBilling';

// Stub the portal auth context + family API the pages use. Keep the surface
// minimal: only what each page touches in render.
vi.mock('@/portal/PortalAuthContext', () => ({
  usePortalAuth: () => ({
    session: { patientId: 42 },
    loginAsFamily: vi.fn(),
  }),
}));

vi.mock('@/portal/familyApi', () => ({
  familyApi: {
    get: vi.fn(async (path: string) => {
      if (path.endsWith('/medications')) return { data: { data: [] } };
      if (path.endsWith('/visits')) return { data: { data: [] } };
      if (path.endsWith('/documents')) return { data: { data: [] } };
      if (path.endsWith('/billing')) return { data: { data: [] } };
      return { data: {} };
    }),
  },
}));

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('family portal i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en-US');
  });
  afterEach(() => {
    cleanup();
  });

  it('login page renders English then Spanish', async () => {
    renderWithRouter(<FamilyLoginPage />);
    expect(screen.getByText('Family Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Patient ID')).toBeInTheDocument();
    cleanup();

    await i18n.changeLanguage('es-US');
    renderWithRouter(<FamilyLoginPage />);
    expect(screen.getByText('Acceso para familiares')).toBeInTheDocument();
    expect(screen.getByLabelText('ID del paciente')).toBeInTheDocument();
  });

  it('medications page renders English then Spanish (empty state)', async () => {
    renderWithRouter(<FamilyMedications />);
    await waitFor(() => {
      expect(screen.getByText('Medications')).toBeInTheDocument();
    });
    expect(screen.getByText('No active medications.')).toBeInTheDocument();
    cleanup();

    await i18n.changeLanguage('es-US');
    renderWithRouter(<FamilyMedications />);
    await waitFor(() => {
      expect(screen.getByText('Medicamentos')).toBeInTheDocument();
    });
    expect(screen.getByText('No hay medicamentos activos.')).toBeInTheDocument();
  });

  it('visits page renders English then Spanish (empty state)', async () => {
    renderWithRouter(<FamilyVisits />);
    await waitFor(() => {
      expect(screen.getByText('Visit History')).toBeInTheDocument();
    });
    expect(screen.getByText('No visits found')).toBeInTheDocument();
    cleanup();

    await i18n.changeLanguage('es-US');
    renderWithRouter(<FamilyVisits />);
    await waitFor(() => {
      expect(screen.getByText('Historial de visitas')).toBeInTheDocument();
    });
    expect(screen.getByText('No se encontraron visitas')).toBeInTheDocument();
  });

  it('documents page renders English then Spanish (M15)', async () => {
    renderWithRouter(<FamilyDocuments />);
    await waitFor(() => expect(screen.getByText('Documents')).toBeInTheDocument());
    expect(screen.getByText('No documents')).toBeInTheDocument();
    cleanup();

    await i18n.changeLanguage('es-US');
    renderWithRouter(<FamilyDocuments />);
    await waitFor(() => expect(screen.getByText('Documentos')).toBeInTheDocument());
    expect(screen.getByText('No hay documentos')).toBeInTheDocument();
  });

  it('billing page renders English then Spanish (M15)', async () => {
    renderWithRouter(<FamilyBilling />);
    await waitFor(() => expect(screen.getByText('Billing')).toBeInTheDocument());
    expect(screen.getByText('No billing records')).toBeInTheDocument();
    cleanup();

    await i18n.changeLanguage('es-US');
    renderWithRouter(<FamilyBilling />);
    await waitFor(() => expect(screen.getByText('Facturación')).toBeInTheDocument());
    expect(screen.getByText('No hay registros de facturación')).toBeInTheDocument();
  });
});
