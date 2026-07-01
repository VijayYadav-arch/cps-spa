import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '@/api/client';
import {
  getCarePlans, getMedications, getOrders, getPatientVitals, getPatientVisits,
  type CarePlan, type Medication, type PhysicianOrder, type PatientVitalsEntry, type PatientVisitSummary,
} from '@/api/clinical';

interface PatientDetail {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  mrn: string | null;
  primaryDiagnosis: string | null;
  primaryDiagnosisDesc: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  admittedAt: string | null;
}

type Tab = 'overview' | 'visits' | 'vitals' | 'medications' | 'orders' | 'care-plans';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'visits', label: 'Visits' },
  { key: 'vitals', label: 'Vitals' },
  { key: 'medications', label: 'Medications' },
  { key: 'orders', label: 'Orders' },
  { key: 'care-plans', label: 'Care Plan' },
];

function fmt(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export function ClinicianPatientDetail() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : 0;
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  // Per-tab data
  const [visits, setVisits] = useState<PatientVisitSummary[]>([]);
  const [vitals, setVitals] = useState<PatientVitalsEntry[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [orders, setOrders] = useState<PhysicianOrder[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    apiClient.get<{ data: PatientDetail }>(`/patients/${pid}`)
      .then((r) => { if (!cancelled) setPatient(r.data.data); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        status === 404 ? setNotFound(true) : setError(true);
      });
    return () => { cancelled = true; };
  }, [pid]);

  useEffect(() => {
    if (!pid || tab === 'overview') return;
    let cancelled = false;
    setTabLoading(true);
    setTabError(null);
    const run = async () => {
      if (tab === 'visits') setVisits(await getPatientVisits(pid));
      else if (tab === 'vitals') setVitals(await getPatientVitals(pid));
      else if (tab === 'medications') setMeds((await getMedications({ patientId: pid })).data);
      else if (tab === 'orders') setOrders((await getOrders({ patientId: pid })).data);
      else if (tab === 'care-plans') setCarePlans((await getCarePlans({ patientId: pid })).data);
    };
    run()
      .catch(() => { if (!cancelled) setTabError('Failed to load this section.'); })
      .finally(() => { if (!cancelled) setTabLoading(false); });
    return () => { cancelled = true; };
  }, [pid, tab]);

  if (notFound) return <div role="alert" className="m-4 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-600">Patient not found.</div>;
  if (error) return <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">Failed to load patient.</div>;
  if (!patient) return <div role="status" className="p-4 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-[900px] p-4">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/clinician/patients" aria-label="Back to patients" data-testid="back-link" className="rounded-md p-2 text-slate-600 no-underline hover:bg-slate-50">‹</Link>
        <h1 data-testid="page-title" className="text-xl font-serif text-navy-900">
          <span data-testid="patient-name">{patient.lastName}, {patient.firstName}</span>
        </h1>
        <Link to={`/clinician/visits/new?patientId=${patient.id}`} data-testid="action-new-visit-note" className="btn-primary ml-auto">New Visit Note</Link>
      </div>

      <div role="tablist" aria-label="Patient chart" className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} data-testid={`chart-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="chart-overview">
          <Row label="MRN" value={patient.mrn} />
          <Row label="Date of Birth" value={patient.dateOfBirth ? fmt(patient.dateOfBirth) : null} />
          <Row label="Primary Diagnosis" value={patient.primaryDiagnosis ? `${patient.primaryDiagnosis} — ${patient.primaryDiagnosisDesc ?? ''}` : null} />
          <Row label="Phone" value={patient.phone} />
          <Row label="Address" value={patient.address} />
          <Row label="Admitted" value={patient.admittedAt ? fmt(patient.admittedAt) : null} />
          <Row label="Status" value={patient.active ? 'Active' : 'Inactive'} />
        </div>
      )}

      {tab !== 'overview' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {tabLoading && <div role="status" className="text-slate-500">Loading…</div>}
          {tabError && <div role="alert" className="text-red-700">{tabError}</div>}
          {!tabLoading && !tabError && (
            <>
              {tab === 'visits' && <SimpleList testId="chart-visits" empty="No visits." rows={visits.map((v) => ({
                key: v.id, to: `/clinician/visits/${v.id}`,
                primary: `Visit ${fmt(v.visitDate ?? v.scheduledStart)}`, secondary: `${v.visitType ?? ''} ${v.status ?? ''}`.trim(),
              }))} />}
              {tab === 'vitals' && <SimpleList testId="chart-vitals" empty="No vitals recorded." rows={vitals.map((v) => ({
                key: v.id, primary: fmt(v.visitDate), secondary: v.vitals || '—',
              }))} />}
              {tab === 'medications' && <SimpleList testId="chart-medications" empty="No medications." rows={meds.map((m) => ({
                key: m.id, primary: `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`,
                secondary: `${m.route} · ${m.frequency}${m.isActive ? '' : ' · inactive'}`,
              }))} />}
              {tab === 'orders' && <SimpleList testId="chart-orders" empty="No orders." rows={orders.map((o) => ({
                key: o.id, primary: `${o.orderType}: ${o.orderText}`,
                secondary: `${fmt(o.orderDate)} · ${o.status}${o.signedBy ? ` · signed ${o.signedBy}` : ' · unsigned'}`,
              }))} />}
              {tab === 'care-plans' && <SimpleList testId="chart-care-plans" empty="No care plans." rows={carePlans.map((c) => ({
                key: c.id, primary: `Care Plan v${c.version}`, secondary: `${c.status} · effective ${fmt(c.effectiveDate)}`,
              }))} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

function SimpleList({ testId, empty, rows }: {
  testId: string;
  empty: string;
  rows: { key: number; to?: string; primary: string; secondary?: string }[];
}) {
  if (rows.length === 0) return <p data-testid={`${testId}-empty`} className="text-slate-500">{empty}</p>;
  return (
    <ul data-testid={testId} className="m-0 list-none p-0">
      {rows.map((r) => {
        const body = (
          <>
            <div className="font-medium text-slate-700">{r.primary}</div>
            {r.secondary && <div className="text-sm text-slate-500">{r.secondary}</div>}
          </>
        );
        return (
          <li key={r.key} className="border-b border-slate-100 py-2.5 last:border-b-0">
            {r.to ? <Link to={r.to} className="block no-underline hover:opacity-80">{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}
