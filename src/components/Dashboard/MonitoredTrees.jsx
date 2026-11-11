import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { database } from '../../firebase';

const getTreeStatusClass = (status) => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes('critical') || normalizedStatus.includes('danger')) {
    return 'critical';
  }
  if (normalizedStatus.includes('warning')) {
    return 'warning';
  }
  return 'normal';
};

export default function MonitoredTrees({ onAddTree }) {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(
      ref(database, 'trees'),
      (snapshot) => {
        const data = snapshot.val();
        const loadedTrees = data
          ? Object.entries(data).map(([key, value]) => {
            const tree = value && typeof value === 'object' ? value : {};
            const profile = tree.profile && typeof tree.profile === 'object' ? tree.profile : {};
            const latest = tree.latest && typeof tree.latest === 'object' ? tree.latest : {};
            const species = tree.species || profile.species || 'Unknown species';
            const location = tree.location || profile.location || profile.gps_coordinates || 'Location unavailable';
            const status = tree.condition || latest.status || 'Normal';
            const onlineValue = tree.online ?? tree.isOnline ?? latest.online;

            return {
              id: tree.id || key,
              name: tree.name || profile.name || species,
              species: `${species} • ${location}`,
              status,
              online: typeof onlineValue === 'boolean' ? onlineValue : null,
            };
          }).sort((a, b) => a.id.localeCompare(b.id))
          : [];

        setTrees(loadedTrees);
        setError('');
        setLoading(false);
      },
      (firebaseError) => {
        setError(`Could not load trees from Firebase: ${firebaseError.message}`);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Monitored Trees</h2>
        <button className="btn-add-tree" onClick={onAddTree}>
          <Plus size={14} /> Add Tree
        </button>
      </div>

      <div className="tree-list">
        {error ? (
          <p className="trees-error-message" role="alert">{error}</p>
        ) : loading ? (
          <p className="trees-table-message">Loading trees from Firebase…</p>
        ) : trees.length === 0 ? (
          <p className="trees-table-message">No trees found in Firebase.</p>
        ) : (
          trees.map((tree) => (
            <div className="tree-item" key={tree.id}>
              <div className="tree-info">
                <h4>{tree.id} — {tree.name}</h4>
                <p>{tree.species}</p>
              </div>
              <div className="tree-status-box">
                <span className={`status-pill ${getTreeStatusClass(tree.status)}`}>
                  {tree.status}
                </span>
                <span className="connection-text">
                  • {tree.online === null ? 'Connection unknown' : tree.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
