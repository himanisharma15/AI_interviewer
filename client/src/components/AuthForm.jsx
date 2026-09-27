import { useState } from 'react'

const emailRegex = /^\S+@\S+\.\S+$/

const getPasswordChecks = (value = '') => {
  const password = String(value)
  return {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^a-zA-Z0-9]/.test(password),
  }
}

export default function AuthForm({ mode = 'login', onStart }) {
  const [formMode, setFormMode] = useState(mode)
  const [isResetting, setIsResetting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [resetStep, setResetStep] = useState('request')
  const [role, setRole] = useState('candidate')
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('authError') || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSignup = formMode === 'signup'
  const isReset = formMode === 'reset'
  const passwordChecks = getPasswordChecks(password)

  const validateEmail = (value) => emailRegex.test(String(value || '').trim())
  const validatePassword = (value) => {
    const checks = getPasswordChecks(value)
    return checks.minLength && checks.hasLetter && checks.hasNumber
  }

  const toggleMode = () => {
    setError('')
    setIsResetting(false)
    setResetStep('request')
    setFormMode((currentMode) => (currentMode === 'login' ? 'signup' : 'login'))
    setPassword('')
    setOtp('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (isSignup && (!name.trim() || !validateEmail(email) || !validatePassword(password))) {
      setError('Please enter your full name, a valid email, and a password with at least 8 characters including a letter and a number.')
      return
    }

    if (!isSignup && !isReset && (!validateEmail(email) || !validatePassword(password))) {
      setError('Please enter a valid email and a password with at least 8 characters, including a letter and number.')
      return
    }

    if (isReset && resetStep === 'request' && !validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (isReset && resetStep === 'otp' && (!otp || otp.length !== 6 || !validatePassword(password))) {
      setError('Please enter a valid 6-digit code and a new password with at least 8 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      let endpoint = '/api/auth/login'
      let body = { email, password }

      if (isSignup) {
        endpoint = '/api/auth/register'
        body = { name, email, password, role }
      } else if (isReset) {
        if (resetStep === 'request') {
          endpoint = '/api/auth/forgot-password'
          body = { email }
        } else {
          endpoint = '/api/auth/reset-password'
          body = { email, otp, password }
        }
      }

      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        throw new Error('Cannot reach the authentication server. Start the server on port 5002 and try again.')
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || (response.status >= 500 ? 'The authentication service is temporarily unavailable. Please try again in a moment.' : 'Authentication failed. Please try again.'))
      }

      if (isReset && resetStep === 'request') {
        setResetStep('otp')
        setError('')
        return
      }

      if (isReset && resetStep === 'otp') {
        setIsResetting(true)
        setFormMode('login')
        setResetStep('request')
        setPassword('')
        setOtp('')
        return
      }

      localStorage.setItem('token', payload.token)
      const meResponse = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${payload.token}` } })
      const mePayload = await meResponse.json().catch(() => null)
      const authenticatedUser = mePayload?.success ? mePayload.user : payload.user
      if (authenticatedUser) localStorage.setItem('user', JSON.stringify(authenticatedUser))
      if (authenticatedUser?.role === 'recruiter') return onStart && onStart()
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetHeading = resetStep === 'request' ? 'Reset your password' : 'Enter the OTP'
  const resetCopy = resetStep === 'request'
    ? 'Enter your account email to receive a secure reset code.'
    : 'Enter the 6-digit code we sent to your email, then choose a new password.'

  return (
    <div className="auth-card">
      <span className="eyebrow eyebrow--dark">{isReset ? resetHeading : isSignup ? 'Create your account' : 'Welcome back'}</span>
      <h2>{isReset ? resetHeading : isSignup ? 'Build your professional profile.' : 'Log in to your account'}</h2>
      <p className="section-copy">{isReset ? resetCopy : isSignup ? 'Set up your workspace in minutes and start interviewing with confidence.' : 'Continue building confidence with personalized interview practice.'}</p>

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
              Full Name
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Doe" />
            </label>
          )}

          {isSignup && (
            <fieldset className="role-selector">
              <legend>Account type</legend>
              <div className="role-option-grid">
                <label className={`role-option ${role === 'candidate' ? 'active' : ''}`}>
                  <input type="radio" name="role" value="candidate" checked={role === 'candidate'} onChange={(event) => setRole(event.target.value)} />
                  <span className="role-option-card">
                    <span className="role-option-title">Candidate</span>
                    <span className="role-option-copy">Practice interviews</span>
                  </span>
                </label>
                <label className={`role-option ${role === 'recruiter' ? 'active' : ''}`}>
                  <input type="radio" name="role" value="recruiter" checked={role === 'recruiter'} onChange={(event) => setRole(event.target.value)} />
                  <span className="role-option-card">
                    <span className="role-option-title">Recruiter</span>
                    <span className="role-option-copy">Manage hiring</span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          <label className="field-label">
            Email
            <div className="input-with-icon input-with-icon--mail">
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </label>

          {isReset && resetStep === 'otp' && (
            <label className="field-label">
              OTP
              <input
                required
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
              />
            </label>
          )}

          {!isReset || (isReset && resetStep === 'otp') ? (
            <label className="field-label">
              Password
              <div className="input-with-icon input-with-icon--lock">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength="8"
                  placeholder={isReset ? 'New password' : isSignup ? 'Create a secure password' : 'Enter your password'}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {!isReset && (
                <div className="password-strength">
                  <span className={passwordChecks.minLength ? 'valid' : ''}>8+ chars</span>
                  <span className={passwordChecks.hasLetter ? 'valid' : ''}>Letter</span>
                  <span className={passwordChecks.hasNumber ? 'valid' : ''}>Number</span>
                </div>
              )}
            </label>
          ) : null}

          {!isSignup && !isReset && <button type="button" className="inline-link inline-link--right auth-link-button" onClick={() => { setError(''); setIsResetting(false); setFormMode('reset'); setResetStep('request'); setPassword(''); setOtp(''); }}>Forgot password?</button>}

          {error && <p className="form-error">{error}</p>}

          <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isReset ? (resetStep === 'request' ? 'Send reset code' : 'Update password') : isSignup ? 'Create account' : 'Log In'} <span aria-hidden="true">↗</span>
          </button>
        </form>
      )}

      {!submitted && (
        <>
          <button className="switch-mode" type="button" onClick={toggleMode}>
            {isSignup ? 'Already have an account? Log in' : isReset ? 'Back to log in' : "Don't have an account? Sign up"}
          </button>
        </>
      )}
    </div>
  )
}
