import React from 'react';
import { MapPin, RotateCw, ToggleLeft, ExternalLink } from 'lucide-react';

export default function TreeMap() {
  const treeLocations = [
    {
      id: 'TREE-001',
      name: 'Main Road Banyan',
      ward: 'Ward A',
      coords: '19.2215, 72.8541', // Example coordinates (e.g., Kandivali, Mumbai)
    },
    {
      id: 'TREE-002',
      name: 'School Road Tree',
      ward: 'Ward B',
      coords: '19.2230, 72.8560',
    },
    {
      id: 'TREE-003',
      name: 'Park Tree',
      ward: 'Ward C',
      coords: '19.2198, 72.8512',
    },
  ];

  const handleOpenLocation = (tree) => {
    // Opens Google Maps using the coordinates
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tree.coords)}`
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="treemap-content-wrapper">
      {/* Page Header */}
      <div className="dashboard-topbar">
        <div className="treemap-title-area">
          <MapPin size={24} className="treemap-header-icon" />
          <div>
            <h1 className="page-title">Tree Map</h1>
            <p className="page-subtitle">GPS locations of monitored trees</p>
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

      {/* Main Panel Card */}
      <div className="panel treemap-main-panel">
        <div className="treemap-section-header">
          <h2>Tree Locations</h2>
          <p className="treemap-notice">
            For a production deployment, replace the simple location links below with Google Maps, Leaflet/OpenStreetMap, or another approved mapping service.
          </p>
        </div>

        {/* Tree Location Cards Grid */}
        <div className="treemap-grid">
          {treeLocations.map((tree) => (
            <div className="treemap-card" key={tree.id}>
              <div className="treemap-card-info">
                <h4>{tree.id} — {tree.name}</h4>
                <p>{tree.ward}</p>
              </div>
              <button 
                className="open-location-link"
                onClick={() => handleOpenLocation(tree)}
              >
                Open location <ExternalLink size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}