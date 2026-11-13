import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import {
  TreePine,
  Plus,
  Edit,
  Trash2,
  Info,
  Activity,
  Droplet,
  Thermometer,
  Wind,
  AlertTriangle,
} from 'lucide-react';
import { get, onValue, ref, remove, set, update } from 'firebase/database';
import { database } from '../firebase';

const emptyTreeForm = {
  id: '',
  name: '',
  species: '',
  location: '',
  condition: 'Normal',
};

const getStatusType = (condition) => {
  const normalizedCondition = (condition || '').toLowerCase();
  if (normalizedCondition.includes('critical') || normalizedCondition.includes('danger')) {
    return 'critical';
  }
  if (normalizedCondition.includes('warning')) {
    return 'warning';
  }
  return 'normal';
};

export default function TreesManagement({ onSelectTree }) {
  const [trees, setTrees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  
  // Modals state
  const [activeModalTree, setActiveModalTree] = useState(null); // QR Code Modal
  const [selectedTreeInfo, setSelectedTreeInfo] = useState(null);
  const [treeSensorDetails, setTreeSensorDetails] = useState(null);
  const [isFetchingTelemetry, setIsFetchingTelemetry] = useState(false);
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTree, setEditingTree] = useState(null);
  const [formData, setFormData] = useState(emptyTreeForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTreeId, setDeletingTreeId] = useState(null);

  // Real-time listener for trees list
  useEffect(() => {
    const treesRef = ref(database, 'trees');
    const unsubscribe = onValue(
      treesRef,
      (snapshot) => {
        const data = snapshot.val();
        const loadedTrees = data
          ? Object.entries(data).map(([key, value]) => {
              const tree = value && typeof value === 'object' ? value : {};
          const latestStatus = tree.latest?.status;
          const condition = ['Normal', 'Warning', 'Critical'].includes(latestStatus)
            ? latestStatus
            : typeof tree.condition === 'string' ? tree.condition : 'Normal';

              return {
                databaseKey: key,
                id: tree.id || key,
                name: tree.name || '',
                species: tree.species || '',
                location: tree.location || '',
                condition,
                statusType: tree.statusType || getStatusType(condition),
                latest: tree.latest || null,
              };
            }).sort((a, b) => a.id.localeCompare(b.id))
          : [];

        setTrees(loadedTrees);
        setPageError('');
        setIsLoading(false);
      },
      (error) => {
        setPageError(`Could not load trees: ${error.message}`);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const handleTreeInfo = async (tree) => {
    setSelectedTreeInfo(tree);
    setIsFetchingTelemetry(true);
    try {
      const snapshot = await get(ref(database, `trees/${tree.databaseKey || tree.id}`));
      setTreeSensorDetails(snapshot.exists() ? snapshot.val() : tree);
    } catch (error) {
      setPageError(`Could not load telemetry for ${tree.id}: ${error.message}`);
      setTreeSensorDetails(tree);
    } finally {
      setIsFetchingTelemetry(false);
    }
  };

  const openAddForm = () => {
    setEditingTree(null);
    setFormData(emptyTreeForm);
    setPageError('');
    setIsFormOpen(true);
  };

  const openEditForm = (tree, e) => {
    e.stopPropagation(); // Prevent opening info modal
    setEditingTree(tree);
    setFormData({
      id: tree.id,
      name: tree.name,
      species: tree.species,
      location: tree.location,
      condition: tree.condition,
    });
    setPageError('');
    setIsFormOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleSaveTree = async (event) => {
    event.preventDefault();
    const id = formData.id.trim().toUpperCase();
    const treeData = {
      id,
      name: formData.name.trim(),
      species: formData.species.trim(),
      location: formData.location.trim(),
      condition: formData.condition,
      statusType: getStatusType(formData.condition),
    };

    if (!id || !treeData.name || !treeData.species || !treeData.location) {
      setPageError('Please complete all tree fields before saving.');
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(id)) {
      setPageError('Tree ID can contain only letters, numbers, hyphens, and underscores.');
      return;
    }

    setIsSaving(true);
    setPageError('');
    try {
      if (editingTree) {
        const { name, species, location, condition, statusType } = treeData;
        await update(ref(database, `trees/${editingTree.databaseKey}`), {
          name,
          species,
          location,
          condition,
          statusType,
          'latest/status': condition,
        });
      } else {
        const treeRef = ref(database, `trees/${id}`);
        const existingTree = await get(treeRef);
        if (existingTree.exists()) {
          setPageError(`Tree ID ${id} already exists. Choose a different ID.`);
          return;
        }
        await set(treeRef, {
          ...treeData,
          latest: { status: formData.condition },
        });
      }

      setIsFormOpen(false);
      setEditingTree(null);
      setFormData(emptyTreeForm);
    } catch (error) {
      setPageError(`Could not save tree: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tree, e) => {
    e.stopPropagation(); // Prevent opening info modal
    if (!window.confirm(`Delete ${tree.id} — ${tree.name}? This cannot be undone.`)) {
      return;
    }

    setDeletingTreeId(tree.id);
    setPageError('');
    try {
      await remove(ref(database, `trees/${tree.databaseKey}`));
    } catch (error) {
      setPageError(`Could not delete ${tree.id}: ${error.message}`);
    } finally {
      setDeletingTreeId(null);
    }
  };

  return (
    <div className="trees-content-wrapper">
      {/* Page Topbar */}
      <div className="dashboard-topbar">
        <div className="treemap-title-area">
          <TreePine size={24} className="trees-header-icon" />
          <div>
            <h1 className="page-title">Trees Management</h1>
            <p className="page-subtitle">Click any tree row to inspect live sensor telemetry and info</p>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="panel trees-main-panel">
        <div className="panel-header">
          <h2>Tree Registry ({trees.length})</h2>
          <button className="btn-add-tree" onClick={openAddForm}>
            <Plus size={16} /> Add Tree
          </button>
        </div>

        {pageError && <p className="trees-error-message" role="alert">{pageError}</p>}

        <div className="table-responsive">
          <table className="trees-table" style={{ cursor: 'pointer' }}>
            <thead>
              <tr>
                <th>TREE</th>
                <th>SPECIES</th>
                <th>LOCATION</th>
                <th>CONDITION</th>
                <th>ACTIONS</th>
                <th>BARCODE / QR</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="trees-table-message">Loading trees from Firebase…</td>
                </tr>
              ) : trees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="trees-table-message">No trees found. Select “Add Tree” to register one.</td>
                </tr>
              ) : trees.map((tree) => (
                <tr
                  key={tree.id}
                  onClick={() => onSelectTree?.(tree.id)}
                  title="Click to view this tree's analytics"
                >
                  <td>
                    <div className="table-tree-id">
                      <strong>{tree.id}</strong>
                      <span>{tree.name}</span>
                    </div>
                  </td>
                  <td>{tree.species}</td>
                  <td>{tree.location}</td>
                  <td>
                    <span className={`status-badge ${tree.statusType}`}>
                      {tree.condition}
                    </span>
                  </td>
                  <td className="tree-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="action-cell-content">
                      <button className="table-action-btn" onClick={() => handleTreeInfo(tree)}>
                        <Info size={13} /> Info
                      </button>
                      <button className="table-action-btn edit-btn" onClick={(e) => openEditForm(tree, e)}>
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        className="table-action-btn delete-btn"
                        onClick={(e) => handleDelete(tree, e)}
                        disabled={deletingTreeId === tree.id}
                      >
                        <Trash2 size={13} /> {deletingTreeId === tree.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                  <td className="tree-barcode-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="row-barcode-thumb"
                      onClick={() => setActiveModalTree(tree)}
                      title={`View QR code for ${tree.id}`}
                      aria-label={`View QR code for ${tree.id}`}
                    >
                      <QRCode
                        value={`https://treewatch.gov/tree/${tree.id}`}
                        size={56}
                        aria-hidden="true"
                      />
                      <span className="barcode-tooltip">View QR</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. TREE DETAILS & LIVE TELEMETRY INSPECT MODAL        */}
      {/* ---------------------------------------------------- */}
      {selectedTreeInfo && (
        <div className="barcode-modal-backdrop" onClick={() => setSelectedTreeInfo(null)}>
          <div 
            className="tree-form-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '550px', width: '90%', padding: '28px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Node Inspection Profile
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a2e23', marginTop: '2px' }}>
                  {selectedTreeInfo.id} — {selectedTreeInfo.name}
                </h2>
              </div>
              <span className={`status-badge ${selectedTreeInfo.statusType}`} style={{ fontSize: '13px', padding: '6px 12px' }}>
                {selectedTreeInfo.condition}
              </span>
            </div>

            {/* General Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#f8faf9', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #edf2ef' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>Species</span>
                <strong style={{ fontSize: '13.5px', color: '#1a2e23' }}>{selectedTreeInfo.species || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>Location / Ward</span>
                <strong style={{ fontSize: '13.5px', color: '#1a2e23' }}>{selectedTreeInfo.location || 'N/A'}</strong>
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1a2e23', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={17} style={{ color: '#2e7d32' }} /> Live IoT Sensor Telemetry
            </h3>

            {isFetchingTelemetry ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#6c7d73' }}>Fetching real-time sensor data from Firebase...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8e4', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Droplet size={20} style={{ color: '#0284c7' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>Soil Moisture</span>
                    <strong style={{ fontSize: '15px', color: '#1a2e23' }}>
                      {treeSensorDetails?.latest?.soil_moisture ?? treeSensorDetails?.latest?.soilMoisture ?? '—'}%
                    </strong>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8e4', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Thermometer size={20} style={{ color: '#ea580c' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>Temperature</span>
                    <strong style={{ fontSize: '15px', color: '#1a2e23' }}>
                      {treeSensorDetails?.latest?.temperature ?? '—'}°C
                    </strong>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8e4', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Droplet size={20} style={{ color: '#0284c7' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>Humidity</span>
                    <strong style={{ fontSize: '15px', color: '#1a2e23' }}>
                      {treeSensorDetails?.latest?.humidity ?? '—'}% RH
                    </strong>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8e4', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wind size={20} style={{ color: '#0d9488' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>MQ-2 Gas / Air</span>
                    <strong style={{ fontSize: '15px', color: '#1a2e23' }}>
                      {treeSensorDetails?.latest?.gas_level ?? '—'} PPM
                    </strong>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8e4', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={20} style={{ color: '#ca8a04' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#6c7d73', display: 'block' }}>Tilt</span>
                    <strong style={{ fontSize: '15px', color: '#1a2e23' }}>
                      {treeSensorDetails?.latest?.tilt ?? treeSensorDetails?.latest?.gyro_x ?? '—'}°
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="modal-close-btn" onClick={() => setSelectedTreeInfo(null)}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. ADD / EDIT TREE FORM MODAL                         */}
      {/* ---------------------------------------------------- */}
      {isFormOpen && (
        <div className="barcode-modal-backdrop" onClick={() => !isSaving && setIsFormOpen(false)}>
          <form
            className="tree-form-modal-card"
            onSubmit={handleSaveTree}
            onClick={(event) => event.stopPropagation()}
            aria-labelledby="tree-form-title"
          >
            <h2 id="tree-form-title">{editingTree ? 'Edit Tree' : 'Add Tree'}</h2>
            <p>{editingTree ? 'Update the tree information below.' : 'Enter the new tree information.'}</p>

            <div className="tree-form-fields">
              <div className="form-group">
                <label htmlFor="tree-id">Tree ID</label>
                <input
                  id="tree-id"
                  name="id"
                  value={formData.id}
                  onChange={handleFormChange}
                  placeholder="TREE-003"
                  disabled={Boolean(editingTree)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="tree-name">Tree name</label>
                <input
                  id="tree-name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="tree-species">Species</label>
                <input
                  id="tree-species"
                  name="species"
                  value={formData.species}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="tree-location">Location</label>
                <input
                  id="tree-location"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="tree-condition">Condition</label>
                <select
                  id="tree-condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleFormChange}
                >
                  <option>Normal</option>
                  <option>Warning</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>

            {pageError && <p className="trees-error-message" role="alert">{pageError}</p>}

            <div className="tree-form-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="modal-close-btn" disabled={isSaving}>
                {isSaving ? 'Saving…' : editingTree ? 'Save Changes' : 'Add Tree'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. QR CODE EXPANSION MODAL                            */}
      {/* ---------------------------------------------------- */}
      {activeModalTree && (
        <div className="barcode-modal-backdrop" onClick={() => setActiveModalTree(null)}>
          <div className="barcode-modal-card" onClick={e => e.stopPropagation()}>
            <h3>{activeModalTree.id} — {activeModalTree.name}</h3>
            <p>Scan to instantly access live profile &amp; sensor telemetry.</p>
            
            <div className="modal-qr-container">
              <QRCode 
                value={`https://treewatch.gov/tree/${activeModalTree.id}`} 
                size={180} 
              />
            </div>
            
            <span className="modal-url-text">https://treewatch.gov/tree/{activeModalTree.id}</span>
            
            <button className="modal-close-btn" onClick={() => setActiveModalTree(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}