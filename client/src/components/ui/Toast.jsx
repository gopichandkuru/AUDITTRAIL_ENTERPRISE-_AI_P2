import React from 'react';
import { useUIStore } from '../../store/uiStore';
import './Toast.css';

export default function Toast() {
  const { toast, dismissToast } = useUIStore();
  if (!toast) return null;

  const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✕' };
  return (
    <div className={`toast toast-${toast.type}`} onClick={dismissToast}>
      <span className="toast-icon">{icons[toast.type] || icons.info}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={dismissToast}>✕</button>
    </div>
  );
}
