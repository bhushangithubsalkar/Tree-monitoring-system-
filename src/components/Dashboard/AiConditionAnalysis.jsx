export default function AiConditionAnalysis({ health, loading, onViewAnalytics }) {
  const status = health?.status || 'No data';
  const statusClass = status.toLowerCase();
  const message = loading
    ? 'Checking the latest sensor readings from Firebase.'
    : !health
      ? 'No tree records are available for condition analysis.'
      : health.reasons.length > 0
        ? health.reasons.join('. ')
        : health.latest
          ? 'Latest available readings are within the configured operational ranges.'
          : 'No sensor readings have been received yet.';

  return (
    <div className="panel">
      <div className="panel-header ai-header">
        <h2>Tree Condition Analysis</h2>
        <span className="assistive-badge">{health?.name || 'Firebase status'}</span>
      </div>
      <div className={`ai-content-box ${statusClass}`}>
        <h4>{status}</h4>
        <p>{message}</p>
      </div>
      {health && (
        <button className="analytics-view-button" onClick={onViewAnalytics}>
          View sensor analytics
        </button>
      )}
      <p className="ai-disclaimer">
        Threshold-based guidance from Firebase readings; confirm concerning conditions with an on-site inspection.
      </p>
    </div>
  );
}
