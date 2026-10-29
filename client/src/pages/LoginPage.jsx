import { Link } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import BackHomeButton from '../components/BackHomeButton'

export default function LoginPage() {
  const goToDashboard = () => {
    const role = JSON.parse(localStorage.getItem('user') || '{}').role
    window.location.assign(role === 'recruiter' ? '/recruiter-dashboard' : '/dashboard')
  }
  return (
    <div className="auth-page-shell">
      <div className="auth-panel auth-panel--dark">
        <div className="sidebar-brand sidebar-brand--light">
          <span className="brand-mark">ai</span>
          <span>interviewer</span>
        </div>

        <div className="auth-intro">
          <p className="eyebrow eyebrow--light">Welcome back</p>
          <h1>Welcome Back!</h1>
          <p>Continue your interview preparation with focused practice, clear feedback, and structured improvement.</p>
        </div>

        <div className="auth-illustration" aria-hidden="true">
          <div className="illustration-device">
            <div className="device-screen" />
            <div className="device-person">
              <span className="dot dot--head" />
              <span className="dot dot--body" />
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel--light">
        <div className="auth-home-link"><BackHomeButton /></div>
        <AuthForm mode="login" onStart={goToDashboard} />
        <p className="auth-footer-link">
          Don’t have an account? <Link to="/login">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
