import { Link } from 'react-router-dom';
import type { HospiceQapiPip } from '@/api/qapi';

export function PipScorecard({ pip }: { pip: HospiceQapiPip }) {
  const baseline = pip.baselineMeasurement;
  const current = pip.currentMeasurement;
  const target = pip.targetMeasurement;
  const delta = current != null && baseline != null ? Number(current) - Number(baseline) : null;
  const movingTowardTarget =
    delta != null && target != null && baseline != null
      && Math.sign(Number(target) - Number(baseline)) === Math.sign(delta);

  return (
    <div className="pip-scorecard">
      <Link to={`/quality/qapi/pips/${pip.id}`}>
        <h3>{pip.title}</h3>
      </Link>
      <span className="pip-category">{pip.category}</span>
      <div className="pip-measurements">
        <span>Baseline: {baseline ?? '—'}</span>
        <span>Current: {current ?? '—'}</span>
        <span>Target: {target ?? '—'}</span>
      </div>
      {delta != null && (
        <div className={`pip-delta ${movingTowardTarget ? 'pip-delta--good' : 'pip-delta--bad'}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'} {Math.abs(delta)}
        </div>
      )}
    </div>
  );
}
