import React from 'react';

export default function MetricCards() {
  const metrics = [
    { label: 'Total Trees', value: '3', sub: 'Registered trees' },
    { label: 'Online', value: '2', sub: 'Recent sensor data' },
    { label: 'Alerts', value: '1', sub: 'Open conditions' },
    { label: 'Public Reports', value: '1', sub: 'Citizen reports' },
  ];

  return (
    <div className="metrics-grid">
      {metrics.map((m, index) => (
        <div className="metric-card" key={index}>
          <span className="metric-label">{m.label}</span>
          <h3 className="metric-value">{m.value}</h3>
          <span className="metric-sub">{m.sub}</span>
        </div>
      ))}
    </div>
  );
}