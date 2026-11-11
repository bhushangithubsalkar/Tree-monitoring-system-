import React from 'react';
import { ToggleLeft, RotateCw } from 'lucide-react';

export default function Header({ title, subtitle }) {
  return (
    <div className="dashboard-topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <button className="topbar-btn">
          <ToggleLeft size={16} /> Demo mode
        </button>
        <button className="topbar-btn">
          <RotateCw size={14} /> Refresh
        </button>
      </div>
    </div>
  );
}