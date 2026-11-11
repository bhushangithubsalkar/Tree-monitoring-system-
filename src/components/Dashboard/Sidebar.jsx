import { LayoutDashboard, TreePine, BarChart3, MapPin, Bell, AlertTriangle, Building2 } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trees', label: 'Trees', icon: TreePine },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'map', label: 'Tree Map', icon: MapPin },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'report', label: 'Report Risky Tree', icon: AlertTriangle },
    { id: 'municipal', label: 'Municipal Info', icon: Building2 },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🌳</div>
        <div className="brand-text">
          <h2>TreeWatch</h2>
          <span>IoT Monitoring Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p>Firebase-ready • ESP32-ready • Blynk-compatible</p>
      </div>
    </aside>
  );
}