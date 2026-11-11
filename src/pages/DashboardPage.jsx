import { useState } from 'react';
import Header from '../components/Dashboard/Header.jsx';
import MetricCards from '../components/Dashboard/MetricCards.jsx';
import MonitoredTrees from '../components/Dashboard/MonitoredTrees.jsx';
import AiConditionAnalysis from '../components/Dashboard/AiConditionAnalysis.jsx';

export default function DashboardPage({ onNavigate }) {
  const [selectedTree, setSelectedTree] = useState('TREE-001 — Main Road Banyan');

  return (
    <>
      <Header />
      <MetricCards />

      <div className="dashboard-grid-row">
        <MonitoredTrees onAddTree={() => onNavigate('trees')} />
        <AiConditionAnalysis />
      </div>

      <div className="panel trends-panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>Latest Sensor Trends</h2>
          <select
            className="tree-trend-selector"
            value={selectedTree}
            onChange={(e) => setSelectedTree(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dcdcdc', fontSize: '13px', backgroundColor: '#fff', fontWeight: '500' }}
          >
            <option value="TREE-001 — Main Road Banyan">TREE-001 — Main Road Banyan</option>
            <option value="TREE-002 — School Road Tree">TREE-002 — School Road Tree</option>
            <option value="TREE-003 — Park Tree">TREE-003 — Park Tree</option>
          </select>
        </div>

        <div className="trends-grid-preview" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div className="trend-box" style={{ background: '#f9fbf9', padding: '15px', borderRadius: '8px', border: '1px solid #edf2ef' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1b4d3e' }}>H₂S Gas Level (ppm)</span>
            <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8da898', fontSize: '12px' }}>
              [Live Chart.js / Recharts Stream for {selectedTree}]
            </div>
          </div>
          <div className="trend-box" style={{ background: '#f9fbf9', padding: '15px', borderRadius: '8px', border: '1px solid #edf2ef' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1b4d3e' }}>Soil Moisture (%)</span>
            <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8da898', fontSize: '12px' }}>
              [Capacitive Moisture Stream Active]
            </div>
          </div>
        </div>
      </div>
    </>
  );
}