export default function MetricCards({
  totalTrees,
  onlineTrees,
  alerts,
  reports,
  loadingTrees,
  loadingReports,
  loadingAlerts,
}) {
  const metrics = [
    { label: 'Total Trees', value: totalTrees, sub: 'Registered in Firebase', loading: loadingTrees },
    { label: 'Online', value: onlineTrees, sub: 'Reporting within 5 minutes', loading: loadingTrees },
    { label: 'Alerts', value: alerts, sub: 'Active alerts in Firebase', loading: loadingAlerts },
    { label: 'Public Reports', value: reports, sub: 'Citizen reports in Firebase', loading: loadingReports },
  ];

  return (
    <div className="metrics-grid">
      {metrics.map((metric) => (
        <div className="metric-card" key={metric.label}>
          <span className="metric-label">{metric.label}</span>
          <h3 className="metric-value">{metric.loading ? '…' : metric.value}</h3>
          <span className="metric-sub">{metric.sub}</span>
        </div>
      ))}
    </div>
  );
}
