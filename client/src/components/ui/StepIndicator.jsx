export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="wizard-steps" aria-label="Interview setup steps">
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStep
        const isDone = index + 1 < currentStep
        return (
          <div key={step.label} className={`wizard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
            <span className="step-number">{index + 1}</span>
            <span className="step-label">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}
