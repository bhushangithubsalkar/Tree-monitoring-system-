import React from 'react';

export default function AiConditionAnalysis() {
  return (
    <div className="panel">
      <div className="panel-header ai-header">
        <h2>AI Condition Analysis</h2>
        <span className="assistive-badge">Assistive</span>
      </div>
      <div className="ai-content-box">
        <h4>Normal</h4>
        <p>Current readings do not cross the configured prototype alert thresholds. Continue routine monitoring.</p>
      </div>
      <p className="ai-disclaimer">AI analysis is an interpretation of sensor patterns, not a definitive diagnosis of root decay.</p>
    </div>
  );
}