import { scoreTone } from '../../lib/score'

export default function StatCard({ icon, value, label, tone = 'indigo', score }) {
  const scoreClass = score === undefined ? '' : scoreTone(score)

  return (
    <div className={`stat-card ${scoreClass}`}>
      <div className={`stat-icon stat-icon--${tone}`}>{icon}</div>
      <div className="stat-text">
        <strong className="text-heading">{value}</strong>
        <span className="text-caption">{label}</span>
      </div>
    </div>
  )
}
