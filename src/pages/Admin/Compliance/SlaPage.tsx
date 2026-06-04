interface UptimeRow {
  id: number;
  checkUrl: string;
  status: string;
  responseMs: number;
  checkedAt: string;
}

export function SlaPage() {
  // Backend UptimeRecordController is not yet implemented in cps-dotnet.
  // Origin (cps Next.js) shipped with the same hardcoded empty array and TODO note.
  // This page renders the empty-state UI with target metrics until the
  // monitoring endpoint ships.
  const records: UptimeRow[] = [];
  const totalChecks = records.length;
  const upChecks = records.filter((r) => r.status === 'up').length;
  const uptimePercentage =
    totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : 99.9;
  const avgResponseMs =
    totalChecks > 0
      ? Math.round(records.reduce((sum, r) => sum + r.responseMs, 0) / totalChecks)
      : 0;
  const monthlyStatus = totalChecks === 0 || uptimePercentage >= 99.9 ? 'Met' : 'Not Met';

  const incidents = records.filter((r) => r.status !== 'up').slice(0, 10);
  const chartData = records.slice(0, 24).reverse();

  return (
    <section className="p-4 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">SLA Monitor</h1>
        <p className="text-slate-500 mt-1">
          Track system uptime and performance against SLA targets.
        </p>
        <p className="text-xs text-amber-700 mt-2">
          Backend pending: UptimeRecordController not yet implemented. Metrics show defaults
          until the cps-dotnet endpoint ships.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500">Current Uptime</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              uptimePercentage >= 99.9
                ? 'text-green-600'
                : uptimePercentage >= 99
                ? 'text-amber-600'
                : 'text-red-600'
            }`}
          >
            {uptimePercentage}%
          </p>
          <p className="text-xs text-slate-400 mt-1">Target: 99.9%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500">Avg Response Time</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{avgResponseMs}ms</p>
          <p className="text-xs text-slate-400 mt-1">Last {totalChecks} checks</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500">Monthly SLA</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-sm font-bold ${
                monthlyStatus === 'Met'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {monthlyStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">99.9% SLA guarantee</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500">Total Checks</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalChecks}</p>
          <p className="text-xs text-slate-400 mt-1">{upChecks} successful</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Response Time (Recent Checks)</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500">
            No uptime data recorded yet. Monitoring will appear here once checks begin.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {chartData.map((r, i) => {
              const maxMs = Math.max(...chartData.map((x) => x.responseMs), 1);
              const height = Math.max((r.responseMs / maxMs) * 100, 4);
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    r.status === 'up'
                      ? 'bg-teal-500'
                      : r.status === 'degraded'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${r.responseMs}ms — ${r.status}`}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Incidents</h2>
        {incidents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No incidents recorded. All systems operational.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
                  Time
                </th>
                <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
                  URL
                </th>
                <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
                  Status
                </th>
                <th className="text-left px-3 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
                  Response
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(incident.checkedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-600 font-mono text-xs">
                    {incident.checkUrl}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        incident.status === 'degraded'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{incident.responseMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
