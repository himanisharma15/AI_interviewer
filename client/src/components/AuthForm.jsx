import { useState } from 'react'

export default function AuthForm({ mode = 'login', onStart }) {
  const [formMode, setFormMode] = useState(mode)
  const [isResetting, setIsResetting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('candidate')
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('authError') || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSignup = formMode === 'signup'
  const isReset = formMode === 'reset'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const endpoint = isReset ? '/api/auth/reset-password' : isSignup ? '/api/auth/register' : '/api/auth/login'
      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, ...(isSignup ? { role } : {}) }),
        })
      } catch {
        throw new Error('Cannot reach the authentication server. Start the server on port 5002 and try again.')
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success || (!isReset && !payload.token)) {
        throw new Error(payload?.message || 'Authentication failed. Please try again.')
      }

      if (isReset) {
        setIsResetting(true)
        setFormMode('login')
        setPassword('')
        return
      }

      localStorage.setItem('token', payload.token)
      const meResponse = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${payload.token}` } })
      const mePayload = await meResponse.json().catch(() => null)
      const authenticatedUser = mePayload?.success ? mePayload.user : payload.user
      if (authenticatedUser) localStorage.setItem('user', JSON.stringify(authenticatedUser))
      if (authenticatedUser?.role === 'recruiter') return onStart()
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-card">
      <span className="eyebrow eyebrow--dark">{isReset ? 'Reset your password' : isSignup ? 'Create your space' : 'Welcome back'}</span>
      <h2>{isReset ? 'Choose a new password' : isSignup ? 'Start practicing with intention.' : 'Log in to your account'}</h2>
      <p className="section-copy">{isReset ? 'Enter your account email and a new password.' : isSignup ? 'Your first interview setup takes less than a minute.' : 'Continue building confidence with personalized interview practice.'}</p>

      {isResetting && <p className="form-success">Password updated. Log in with your new password.</p>}

      {submitted ? (
        <div className="auth-success">
          <div className="success-badge">✓</div>
          <strong>{isSignup ? 'Account ready to go.' : 'You’re signed in.'}</strong>
          <p>Continue to the interview setup to choose your role.</p>
          <button className="button button-primary" type="button" onClick={onStart}>
            Set up interview <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="field-label">
              Name
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
          )}

          {isSignup && <fieldset className="role-selector"><legend>Account type</legend><label><input type="radio" name="role" value="candidate" checked={role === 'candidate'} onChange={(event) => setRole(event.target.value)} /> Candidate</label><label><input type="radio" name="role" value="recruiter" checked={role === 'recruiter'} onChange={(event) => setRole(event.target.value)} /> Recruiter</label></fieldset>}

          <label className="field-label">
            Email
            <div className="input-with-icon input-with-icon--mail">
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </div>
          </label>

          <label className="field-label">
            Password
            <div className="input-with-icon input-with-icon--lock">
              <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" placeholder="At least 8 characters" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {!isSignup && !isReset && <button type="button" className="inline-link inline-link--right auth-link-button" onClick={() => { setError(''); setIsResetting(false); setFormMode('reset') }}>Forgot password?</button>}

          {error && <p className="form-error">{error}</p>}

          <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isReset ? 'Update password' : isSignup ? 'Create account' : 'Log In'} <span aria-hidden="true">↗</span>
          </button>
        </form>
      )}

      {!submitted && (
        <>
          {!isReset && <div className="divider"><span>Or continue with</span></div>}
          {!isReset && <div className="social-row"><button type="button" className="social-button google-button" onClick={() => { window.location.assign('/api/auth/google') }}><span className="google-icon" aria-hidden="true">G</span> Continue with Google</button></div>}
          <button className="switch-mode" type="button" onClick={() => { setError(''); setIsResetting(false); setFormMode(isReset || isSignup ? 'login' : 'signup') }}>
            {isReset || isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </>
      )}
    </div>
  )
}
