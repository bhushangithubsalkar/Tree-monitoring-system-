import { useEffect, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { database } from '../firebase';

export default function AlertPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    return onValue(
      ref(database, 'Alerts'),
      (snapshot) => {
        const data = snapshot.val();
        const loadedAlerts = data && typeof data === 'object'
          ? Object.entries(data)
            .filter(([, alert]) => (
              alert
              && typeof alert === 'object'
              && alert.active === true
              && ['Warning', 'Critical'].includes(alert.severity)
            ))
            .map(([id, alert]) => ({ id, ...alert }))
            .sort((a, b) => (b.updatedAt || b.triggeredAt || 0) - (a.updatedAt || a.triggeredAt || 0))
          : [];
        setAlerts(loadedAlerts);
        setLoading(false);
        setError('');
      },
      (firebaseError) => {
        setError(`Could not load alerts from Firebase: ${firebaseError.message}`);
        setLoading(false);
      },
    );
  }, []);

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
      </div>

      <section className="panel" aria-labelledby="active-alerts-heading">
        <div className="panel-header">
          <h2 id="active-alerts-heading">Active Alerts</h2>
          <span className="assistive-badge">{alerts.length} open</span>
        </div>
        {error && <p className="trees-error-message" role="alert">{error}</p>}
        {loading ? (
          <p className="trees-table-message">Loading alerts from Firebase…</p>
        ) : alerts.length === 0 ? (
          <p className="trees-table-message">No active alerts. Alerts are created from each tree’s latest status.</p>
        ) : (
          <div className="tree-list">
            {alerts.map((alert) => (
              <article className="tree-item" key={alert.id}>
                <div className="tree-info">
                  <h4>
                    <AlertTriangle size={15} aria-hidden="true" /> {alert.treeId} — {alert.treeName}
                  </h4>
                  {alert.location && <p>{alert.location}</p>}
                  <p>{alert.message}</p>
                  <p>{alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'Time unavailable'}</p>
                </div>
                <span className={`status-pill ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
              </article>
            ))}
          </div>
        )}
        <p className="ai-disclaimer">
          Alerts reflect the latest tree status and should be confirmed by an on-site inspection.
        </p>
      </section>
    </div>
  );
}
