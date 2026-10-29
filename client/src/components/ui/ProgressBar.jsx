export default function ProgressBar({ value, max = 100, className = '' }) {
  const width = `${Math.min(Math.max((value / max) * 100, 0), 100)}%`
  return (
    <div className={`progress-bar ${className}`.trim()}>
      <span style={{ width }} />
    </div>
  )
}
