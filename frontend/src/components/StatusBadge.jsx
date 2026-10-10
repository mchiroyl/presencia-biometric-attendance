export function StatusBadge({ status, label }) {
  return <span className={`status-badge ${status === 'ok' ? 'is-ok' : status === 'error' ? 'is-error' : status === 'warning' ? 'is-warning' : ''}`}><span className="status-dot"/>{label}</span>;
}
