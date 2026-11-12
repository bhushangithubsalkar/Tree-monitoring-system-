import { Plus } from 'lucide-react';

const getStatusClass = (status) => status.toLowerCase();

export default function MonitoredTrees({ trees, loading, error, onAddTree }) {
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
                <h4>{tree.id} — {tree.health.name}</h4>
                <p>{tree.health.species} • {tree.health.location}</p>
              </div>
              <div className="tree-status-box">
                <span className={`status-pill ${getStatusClass(tree.health.status)}`}>
                  {tree.health.status}
                </span>
                <span className="connection-text">
                  • {tree.health.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
