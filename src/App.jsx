import { lazy, Suspense, useState } from 'react';
import Sidebar from './components/Dashboard/Sidebar';
import DashboardPage from './pages/DashboardPage';
import TreesManagement from './pages/TreesManagement';
import TreeMap from './pages/TreeMap';
import AlertPage from './pages/AlertPage';
import ReportRiskyTreePage from './pages/ReportRiskyTreePage';
import MunicipalInfoPage from './pages/MunicipalInfoPage';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

export default function App() {
  const [activePage, setActivePage] = useState('report'); // Default to 'report' to view your form
  const [selectedTreeId, setSelectedTreeId] = useState('');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(page, treeId) => {
              if (treeId) setSelectedTreeId(treeId);
              setActivePage(page);
            }}
          />
        );
      case 'trees':
        return (
          <TreesManagement
            onSelectTree={(treeId) => {
              setSelectedTreeId(treeId);
              setActivePage('analytics');
            }}
          />
        );
      case 'analytics':
        return (
          <Suspense fallback={<div className="analytics-message">Loading analytics…</div>}>
            <AnalyticsPage
              initialSelectedTreeId={selectedTreeId}
              onTreeSelect={setSelectedTreeId}
            />
          </Suspense>
        );
      case 'map': return <TreeMap />;
      case 'alerts': return <AlertPage />;
      case 'report': return <ReportRiskyTreePage />;
      case 'municipal': return <MunicipalInfoPage />;
      default: return <ReportRiskyTreePage />;
    }
  };

  return (
    <div className="dashboard-layout-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="dashboard-main-content">
        {renderPage()}
      </main>
    </div>
  );
}