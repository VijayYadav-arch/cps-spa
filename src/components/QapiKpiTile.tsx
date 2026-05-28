import { Link } from 'react-router-dom';

export function QapiKpiTile({
  label,
  value,
  delta,
  trendDirection,
  linkTo,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  trendDirection?: 'up' | 'down' | 'flat' | null;
  linkTo?: string;
}) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : trendDirection === 'flat' ? '→' : '';
  const tile = (
    <div className="qapi-kpi-tile">
      <div className="qapi-kpi-label">{label}</div>
      <div className="qapi-kpi-value">{value}</div>
      {delta != null && (
        <div className={`qapi-kpi-delta qapi-kpi-delta--${trendDirection ?? 'flat'}`}>
          {arrow} {Math.abs(delta)}
        </div>
      )}
    </div>
  );
  return linkTo ? <Link to={linkTo}>{tile}</Link> : tile;
}
