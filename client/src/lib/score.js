export function scoreTone(score) {
  const value = Number(score)
  if (value >= 85) return 'score-good'
  if (value >= 70) return 'score-amber'
  return 'score-danger'
}
