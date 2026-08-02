import React from 'react';

export default function SeverityBadge({ severity }) {
  const map = {
    INFO: { cls: 'badge-info', label: 'INFO' },
    WARNING: { cls: 'badge-warning', label: 'WARN' },
    CRITICAL: { cls: 'badge-critical', label: 'CRIT' },
    SUCCESS: { cls: 'badge-success', label: 'OK' },
  };
  const cfg = map[severity] || map.INFO;
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}
