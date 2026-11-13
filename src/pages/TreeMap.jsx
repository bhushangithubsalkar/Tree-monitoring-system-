import { useEffect, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { database } from '../firebase';

function getTreeLocation(tree) {
  const profile = tree.profile && typeof tree.profile === 'object' ? tree.profile : {};
  const coordinates = tree.gps_coordinates || profile.gps_coordinates;
  return {
    coordinates: Array.isArray(coordinates) ? coordinates.join(', ') : coordinates || '',
    location: tree.location || profile.location || profile.ward || '',
    name: tree.name || profile.name || '',
  };
}

export default function TreeMap() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => onValue(
    ref(database, 'trees'),
    (snapshot) => {
      const data = snapshot.val();
      const loadedTrees = data && typeof data === 'object'
        ? Object.entries(data)
          .filter(([, tree]) => tree && typeof tree === 'object')
          .map(([id, tree]) => ({ id, ...tree }))
          .sort((a, b) => a.id.localeCompare(b.id))
        : [];
      setTrees(loadedTrees);
      setLoading(false);
      setError('');
    },
    (firebaseError) => {
      setError(`Could not load tree locations from Firebase: ${firebaseError.message}`);
      setLoading(false);
    },
  ), []);

  const handleOpenLocation = (tree) => {
    const { coordinates, location, name } = getTreeLocation(tree);
    const query = coordinates || [name, location, tree.id].filter(Boolean).join(', ');
    if (!query) {
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="treemap-content-wrapper">
      <div className="dashboard-topbar">
        <div className="treemap-title-area">
          <MapPin size={24} className="treemap-header-icon" />
          <div>
            <h1 className="page-title">Tree Map</h1>
            <p className="page-subtitle">Locations of monitored trees from Firebase</p>
          </div>
        </div>
      </div>

      <div className="panel treemap-main-panel">
        <div className="treemap-section-header">
          <h2>Tree Locations</h2>
          <p className="treemap-notice">
            Map searches use saved GPS coordinates when available, or the tree’s location and name.
          </p>
        </div>

        {error && <p className="trees-error-message" role="alert">{error}</p>}
        {loading ? (
          <p className="trees-table-message">Loading tree locations from Firebase…</p>
        ) : trees.length === 0 ? (
          <p className="trees-table-message">No trees are registered in Firebase.</p>
        ) : (
          <div className="treemap-grid">
            {trees.map((tree) => {
              const { coordinates, location, name } = getTreeLocation(tree);
              const hasLocation = Boolean(coordinates || location || name);
              return (
                <div className="treemap-card" key={tree.id}>
                  <div className="treemap-card-info">
                    <h4>{tree.id} — {name || 'Unnamed tree'}</h4>
                    <p>{location || coordinates || 'Location unavailable'}</p>
                  </div>
                  {hasLocation ? (
                    <button className="open-location-link" onClick={() => handleOpenLocation(tree)}>
                      Open location <ExternalLink size={13} />
                    </button>
                  ) : (
                    <span className="trees-table-message">Add a location to this tree</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
