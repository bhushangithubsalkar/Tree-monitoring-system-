import { lazy, Suspense, useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import Sidebar from './components/Dashboard/Sidebar';
import DashboardPage from './pages/DashboardPage';
import TreesManagement from './pages/TreesManagement';
import TreeMap from './pages/TreeMap';
import AlertPage from './pages/AlertPage';
import ReportRiskyTreePage from './pages/ReportRiskyTreePage';
import MunicipalInfoPage from './pages/MunicipalInfoPage';
import { database } from './firebase';
import syncTreeAlert from './firebase/syncTreeAlert';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

export default function App() {
  const [activePage, setActivePage] = useState('report'); // Default to 'report' to view your form
  const [selectedTreeId, setSelectedTreeId] = useState('');
  const [alertSyncError, setAlertSyncError] = useState('');

  useEffect(() => onValue(
    ref(database, 'trees'),
    (snapshot) => {
      const trees = snapshot.val();
      if (!trees || typeof trees !== 'object') {
        return;
      }

      Promise.all(
        Object.entries(trees)
          .filter(([, tree]) => tree && typeof tree === 'object')
          .map(([treeId, tree]) => syncTreeAlert(treeId, tree)),
      ).then(() => setAlertSyncError('')).catch((error) => {
        setAlertSyncError(`Could not update alerts in Firebase: ${error.message}`);
      });
    },
    (error) => setAlertSyncError(`Could not load tree statuses for alerts: ${error.message}`),
  ), []);

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
        {alertSyncError && <p className="trees-error-message" role="alert">{alertSyncError}</p>}
        {renderPage()}
      </main>
    </div>
  );
}