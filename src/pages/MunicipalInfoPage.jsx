import { Building2, ExternalLink, Megaphone, RotateCw, ToggleLeft, TreePine } from 'lucide-react';

export default function MunicipalInfoPage() {
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
        <div className="topbar-actions">
          <button className="topbar-btn demo-mode-btn">
            <ToggleLeft size={16} /> Demo mode
          </button>
          <button className="topbar-btn refresh-btn">
            <RotateCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="panel municipal-main-panel">
        <div className="municipal-section-header">
          <h2>BMC / Municipal Information</h2>
          <p className="municipal-description">
            The official BMC site identifies the <strong>Garden and Tree Authority</strong> and lists responsibilities including removal of dead or dangerous trees and attending public complaints related to gardens and municipal tree areas.
          </p>
        </div>

        <div className="municipal-cards-grid">
          <div className="municipal-card">
            <div className="municipal-card-icon-title">
              <Building2 size={20} className="card-icon" />
              <span>Department</span>
            </div>
            <h4>Garden and Tree Authority</h4>
          </div>
          <div className="municipal-card">
            <div className="municipal-card-icon-title">
              <TreePine size={20} className="card-icon green-icon" />
              <span>Tree-related work</span>
            </div>
            <h4>Planting, pruning and action concerning dead or dangerous trees and branches.</h4>
          </div>
          <div className="municipal-card">
            <div className="municipal-card-icon-title">
              <Megaphone size={20} className="card-icon red-icon" />
              <span>Public complaints</span>
            </div>
            <h4>Use official BMC complaint and contact channels for current reporting procedures.</h4>
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
