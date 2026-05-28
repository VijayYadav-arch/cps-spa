import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listPips,
  type HospiceQapiPip,
  type HospiceQapiPipStatus,
  type HospiceQapiPipCategory,
} from '@/api/qapi';

const STATUSES: HospiceQapiPipStatus[] = ['Planning', 'Active', 'Completed', 'OnHold'];
const CATEGORIES: HospiceQapiPipCategory[] = ['PatientSafety', 'ClinicalOutcome', 'CarePlanning', 'PatientExperience', 'Other'];

export function QapiPipListPage() {
  const [pips, setPips] = useState<HospiceQapiPip[]>([]);
  const [statusFilter, setStatusFilter] = useState<HospiceQapiPipStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<HospiceQapiPipCategory | ''>('');

  useEffect(() => {
    void listPips({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    }).then(setPips);
  }, [statusFilter, categoryFilter]);

  return (
    <div>
      <header>
        <h1>Performance Improvement Projects</h1>
        <Link to="/quality/qapi/pips/new" className="btn btn-primary">+ New PIP</Link>
      </header>
      <div className="filters">
        <label htmlFor="status-filter">Status</label>
        <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as HospiceQapiPipStatus | '')}>
          <option value="">All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label htmlFor="category-filter">Category</label>
        <select id="category-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as HospiceQapiPipCategory | '')}>
          <option value="">All</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          {pips.map(p => (
            <tr key={p.id}>
              <td><Link to={`/quality/qapi/pips/${p.id}`}>{p.title}</Link></td>
              <td>{p.category}</td>
              <td>{p.status}</td>
              <td>{p.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
