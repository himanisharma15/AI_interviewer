import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token')
    const error = searchParams.get('authError')
    if (token) {
      localStorage.setItem('token', token)
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json()).then((payload) => {
        if (payload?.success && payload.user) localStorage.setItem('user', JSON.stringify(payload.user))
        navigate('/dashboard', { replace: true })
      }).catch(() => navigate('/dashboard', { replace: true }))
      return
    }
    navigate(`/login${error ? `?authError=${encodeURIComponent(error)}` : ''}`, { replace: true })
  }, [navigate, searchParams])

  return <div className="auth-callback-page">Completing sign-in...</div>
}
