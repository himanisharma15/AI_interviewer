import { useState } from 'react'
import { durations } from '../lib/interview'

export default function DurationPicker({ value = '30 minutes', onChange }) {
  const [duration, setDuration] = useState(value)

  const updateDuration = (nextValue) => {
    setDuration(nextValue)
    window.dispatchEvent(new CustomEvent('interview-duration-change', { detail: nextValue }))
    if (onChange) onChange(nextValue)
  }

  return (
    <div className="duration-picker">
      <span className="section-kicker">Interview length</span>
      <strong>How much time do you need?</strong>
      <div className="duration-options">
        {durations.map((item) => (
          <button
            type="button"
            key={item}
            className={duration === item ? 'duration-option active' : 'duration-option'}
            onClick={() => updateDuration(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {duration === 'Custom' && (
        <input
          type="number"
          min="5"
          max="180"
          defaultValue="45"
          onChange={(event) => updateDuration(`${event.target.value} minutes`)}
          aria-label="Custom interview duration in minutes"
        />
      )}
    </div>
  )
}
