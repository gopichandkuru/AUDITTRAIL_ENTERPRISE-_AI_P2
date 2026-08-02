import React from 'react';

export default function StatCard({ icon, label, value, change, changeLabel, accent, loading }) {
  return (
    <div className={`card stat-card ${accent ? `stat-accent-${accent}` : ''}`}>
      <div className="stat-card-top">
        <div className="stat-card-icon">{icon}</div>
        {change !== undefined && (
          <span className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 36, width: '60%', marginBottom: 8 }} />
      ) : (
        <div className="stat-number">{value ?? '—'}</div>
      )}
      <div className="stat-label">{label}</div>
      {changeLabel && <div className="stat-change-label">{changeLabel}</div>}
    </div>
  );
}
