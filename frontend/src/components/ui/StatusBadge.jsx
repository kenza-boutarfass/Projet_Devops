function StatusBadge({ status }) {
  const variant = status.toLowerCase().replaceAll(' ', '-')

  return <span className={`status-badge status-${variant}`}>{status}</span>
}

export default StatusBadge