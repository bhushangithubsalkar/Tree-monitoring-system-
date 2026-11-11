import { AlertTriangle, Bell, RotateCw, ToggleLeft } from 'lucide-react';

const alerts = [
  {
    treeId: 'TREE-002',
    treeName: 'School Road Tree',
    severity: 'Warning',
    message: 'Sensor readings indicate a condition that requires inspection.',
    time: 'Recently detected',
  },
];

export default function AlertPage() {
  return (
    <div className="alerts-page-wrapper">
      <div className="dashboard-topbar">
        <div className="treemap-title-area">
          <Bell size={24} className="report-header-icon" />
          <div>
            <h1 className="page-title">Alerts</h1>
            <p className="page-subtitle">Active sensor conditions requiring attention</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="topbar-btn demo-mode-btn">
            <ToggleLeft size={16} /> Demo mode
          </button>
          <button className="topbar-btn refresh-btn">
            <RotateCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <section className="panel" aria-labelledby="active-alerts-heading">
        <div className="panel-header">
          <h2 id="active-alerts-heading">Active Alerts</h2>
          <span className="assistive-badge">{alerts.length} open</span>
        </div>
        <div className="tree-list">
          {alerts.map((alert) => (
            <article className="tree-item" key={alert.treeId}>
              <div className="tree-info">
                <h4>
                  <AlertTriangle size={15} aria-hidden="true" /> {alert.treeId} — {alert.treeName}
                </h4>
                <p>{alert.message}</p>
                <p>{alert.time}</p>
              </div>
              <span className="status-pill warning">{alert.severity}</span>
            </article>
          ))}
        </div>
        <p className="ai-disclaimer">
          Prototype alerts are informational and should be confirmed by an on-site inspection.
        </p>
      </section>
    </div>
  );
}
