export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token') || ''
  let response
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('Cannot reach the authentication server. Start the server on port 5002 and try again.')
  }
  const payload = await response.json().catch(() => null)
  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }
  if (!response.ok || !payload?.success) throw new Error(payload?.message || 'Request failed.')
  return payload.data
}
