import { useEffect, useState } from 'react';
import { Building2, ExternalLink, Megaphone, TreePine } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { database } from '../firebase';

export default function MunicipalInfoPage() {
  const [counts, setCounts] = useState({ trees: 0, alerts: 0, reports: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let loadedSources = 0;
    const handleLoaded = () => {
      loadedSources += 1;
      if (loadedSources === 3) setLoading(false);
    };
    const subscriptions = [
      ['trees', (data) => Object.keys(data || {}).length],
      ['Alerts', (data) => Object.values(data || {}).filter((alert) => alert?.active).length],
      ['reports', (data) => Object.keys(data || {}).length],
    ].map(([path, countRecords]) => onValue(
      ref(database, path),
      (snapshot) => {
        setCounts((current) => ({ ...current, [path === 'Alerts' ? 'alerts' : path]: countRecords(snapshot.val()) }));
        handleLoaded();
        setError('');
      },
      (firebaseError) => {
        setError(`Could not load municipal dashboard data: ${firebaseError.message}`);
        handleLoaded();
      },
    ));

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, []);

  const handleOpenBmcPortal = () => {
    window.open('https://portal.mcgm.gov.in', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="municipal-page-wrapper">
      <div className="dashboard-topbar">
        <div className="treemap-title-area">
          <Building2 size={24} className="municipal-header-icon" />
          <div>
            <h1 className="page-title">Municipal Info</h1>
            <p className="page-subtitle">Official municipal information</p>
          </div>
        </div>
      </div>

      <div className="panel municipal-main-panel">
        {error && <p className="trees-error-message" role="alert">{error}</p>}
        <div className="municipal-section-header">
          <h2>BMC / Municipal Information</h2>
          <p className="municipal-description">
            The official BMC site identifies the <strong>Garden and Tree Authority</strong> and lists responsibilities including removal of dead or dangerous trees and attending public complaints related to gardens and municipal tree areas.
          </p>
        </div>

        <div className="municipal-cards-grid">
          <div className="municipal-card">
            <div className="municipal-card-icon-title">
              <TreePine size={20} className="card-icon green-icon" />
              <span>Trees monitored</span>
            </div>
            <h4>{loading ? '…' : counts.trees}</h4>
          </div>
          <div className="municipal-card">
            <div className="municipal-card-icon-title">
              <Megaphone size={20} className="card-icon red-icon" />
              <span>Active alerts</span>
            </div>
            <h4>{loading ? '…' : counts.alerts}</h4>
          </div>
          <div className="municipal-card">
            <div className="municipal-card-icon-title">
              <Building2 size={20} className="card-icon" />
              <span>Public reports received</span>
            </div>
            <h4>{loading ? '…' : counts.reports}</h4>
          </div>
        </div>

        <div className="municipal-actions-row">
          <button className="open-bmc-portal-btn" onClick={handleOpenBmcPortal}>
            Open Official BMC Portal <ExternalLink size={15} />
          </button>
          <span className="portal-badge-tag">Garden &amp; Tree Authority</span>
        </div>
        <div className="municipal-footer-note">
          <p>Check the official portal for current contact details and complaint procedures.</p>
        </div>
      </div>
    </div>
  );
}
