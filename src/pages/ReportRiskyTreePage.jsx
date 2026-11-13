import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { onValue, push, ref } from 'firebase/database';
import { database } from '../firebase';

const initialFormData = {
  name: '',
  contact: '',
  treeId: '',
  location: '',
  condition: 'Tree leaning',
  urgency: 'Normal',
  description: '',
  photoUrl: '',
};

export default function ReportRiskyTreePage() {
  const [formData, setFormData] = useState(initialFormData);

  const [submitted, setSubmitted] = useState(false);
  const [trees, setTrees] = useState([]);
  const [isLoadingTrees, setIsLoadingTrees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onValue(
    ref(database, 'trees'),
    (snapshot) => {
      const data = snapshot.val();
      const loadedTrees = data && typeof data === 'object'
        ? Object.entries(data)
          .filter(([, tree]) => tree && typeof tree === 'object')
          .map(([id, tree]) => ({ id, name: tree.name || tree.profile?.name || id }))
          .sort((a, b) => a.id.localeCompare(b.id))
        : [];
      setTrees(loadedTrees);
      setIsLoadingTrees(false);
      setError('');
    },
    (firebaseError) => {
      setError(`Could not load trees from Firebase: ${firebaseError.message}`);
      setIsLoadingTrees(false);
    },
  ), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await push(ref(database, 'reports'), {
        ...formData,
        treeId: formData.treeId.trim(),
        createdAt: Date.now(),
        status: 'Open',
      });
      setFormData(initialFormData);
      setSubmitted(true);
    } catch (firebaseError) {
      setError(`Could not submit report to Firebase: ${firebaseError.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="dashboard-topbar">
        <div>
          <div className="page-title-row">
            <AlertTriangle size={24} className="title-icon-orange" />
            <h1 className="page-title">Report Risky Tree</h1>
          </div>
          <p className="page-subtitle">Public tree-risk reporting form</p>
        </div>
      </div>

      {submitted ? (
        <div className="panel success-panel">
          <CheckCircle2 size={48} className="success-icon" />
          <h2>Report Submitted Successfully</h2>
          <p>Thank you for helping keep public spaces safe. Your report has been logged for municipal/admin review.</p>
          <button className="btn-primary" onClick={() => setSubmitted(false)}>Submit Another Report</button>
        </div>
      ) : (
        <div className="report-grid-layout">
          {error && <p className="trees-error-message" role="alert">{error}</p>}
          {/* Left Form Section */}
          <div className="panel form-panel">
            <div className="panel-section-header">
              <h2>Report a Risky Tree</h2>
              <p className="panel-desc">
                Use this form to report a tree that may pose a public-safety risk. Avoid entering unnecessary personal information.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="risky-tree-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Your name (optional)</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="" 
                  />
                </div>
                <div className="form-group">
                  <label>Contact (optional)</label>
                  <input 
                    type="text" 
                    name="contact" 
                    value={formData.contact} 
                    onChange={handleChange} 
                    placeholder="" 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tree ID (if known)</label>
                  <select
                    name="treeId" 
                    value={formData.treeId} 
                    onChange={handleChange} 
                    disabled={isLoadingTrees}
                  >
                    <option value="">
                      {isLoadingTrees ? 'Loading trees…' : 'No tree selected'}
                    </option>
                    {trees.map((tree) => (
                      <option key={tree.id} value={tree.id}>
                        {tree.id} — {tree.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Location / landmark</label>
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    placeholder="Road, landmark, ward" 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Condition</label>
                  <select name="condition" value={formData.condition} onChange={handleChange}>
                    <option value="Tree leaning">Tree leaning</option>
                    <option value="Branch hanging">Branch hanging</option>
                    <option value="Root decay visible">Root decay visible</option>
                    <option value="Fungus growth">Fungus growth</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Urgency</label>
                  <select name="urgency" value={formData.urgency} onChange={handleChange}>
                    <option value="Normal">Normal</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea 
                  name="description" 
                  rows="4" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Describe what you observed..."
                  required
                ></textarea>
              </div>

              <div className="form-group full-width">
                <label>Photo URL (optional)</label>
                <input 
                  type="text" 
                  name="photoUrl" 
                  value={formData.photoUrl} 
                  onChange={handleChange} 
                  placeholder="Paste an image URL if available" 
                />
              </div>

              <button type="submit" className="submit-report-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </form>
          </div>

          {/* Right Workflow Steps Section */}
          <div className="workflow-sidebar-card">
            <h2>What happens after reporting?</h2>
            <div className="workflow-steps">
              <div className="workflow-step">
                <span className="step-badge">1</span>
                <span>Report submitted</span>
              </div>
              <div className="workflow-step">
                <span className="step-badge">2</span>
                <span>Municipal/admin review</span>
              </div>
              <div className="workflow-step">
                <span className="step-badge">3</span>
                <span>Physical inspection</span>
              </div>
              <div className="workflow-step">
                <span className="step-badge">4</span>
                <span>Status updated</span>
              </div>
            </div>

            <div className="workflow-note">
              <p>If a tree presents an immediate emergency hazard, please contact the appropriate municipal authority directly rather than using this form.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}