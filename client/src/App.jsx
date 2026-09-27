import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './styles/theme.css'
import './App.css'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardHome from './pages/DashboardHome'
import NewInterviewWizard from './pages/NewInterviewWizard'
import InterviewSessionPage from './pages/InterviewSessionPage'
import InterviewReportPage from './pages/InterviewReportPage'
import InterviewHistoryPage from './pages/InterviewHistoryPage'
import SavedJobsPage from './pages/SavedJobsPage'
import ProgressPage from './pages/ProgressPage'
import ResumePage from './pages/ResumePage'
import WorkspaceListPage from './pages/WorkspaceListPage'
import WorkspacePage from './pages/WorkspacePage'
import RecruiterDashboard from './pages/RecruiterDashboard'
import RecruiterInterviewPage from './pages/RecruiterInterviewPage'
import PublicWorkspacePage from './pages/PublicWorkspacePage'
import JobPostingsPage from './pages/JobPostingsPage'
import BrowseJobsPage from './pages/BrowseJobsPage'
import ApplicantsPage from './pages/ApplicantsPage'
import { apiRequest } from './lib/api'

function ProtectedRoute({ children }) {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true })
      return
    }

    apiRequest('/api/auth/me')
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login', { replace: true })
      })
      .finally(() => setIsChecking(false))
  }, [navigate])

  if (isChecking || !isAuthenticated) return null
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/interview-workspace/:slug/public" element={<PublicWorkspacePage />} />
        <Route path="/dashboard" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <DashboardHome />}</ProtectedRoute>} />
        <Route path="/new-interview" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <NewInterviewWizard />}</ProtectedRoute>} />
        <Route path="/interview/session" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <InterviewSessionPage />}</ProtectedRoute>} />
        <Route path="/interview/report" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <InterviewReportPage />}</ProtectedRoute>} />
        <Route path="/interview-history" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <InterviewHistoryPage />}</ProtectedRoute>} />
        <Route path="/saved-jobs" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <SavedJobsPage />}</ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <ProgressPage />}</ProtectedRoute>} />
        <Route path="/resume" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <Navigate to="/recruiter-dashboard" replace /> : <ResumePage />}</ProtectedRoute>} />
        <Route path="/workspaces" element={<ProtectedRoute><WorkspaceListPage /></ProtectedRoute>} />
        <Route path="/workspaces/:id" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
        <Route path="/recruiter-dashboard" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <RecruiterDashboard /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
        <Route path="/recruiter-interviews/:id" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <RecruiterInterviewPage /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
        <Route path="/job-postings" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <JobPostingsPage /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
        <Route path="/job-postings/:id/applicants" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role === 'recruiter' ? <ApplicantsPage /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
        <Route path="/browse-jobs" element={<ProtectedRoute>{JSON.parse(localStorage.getItem('user') || '{}').role !== 'recruiter' ? <BrowseJobsPage /> : <Navigate to="/job-postings" replace />}</ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
