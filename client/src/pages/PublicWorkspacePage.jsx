import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function PublicWorkspacePage() {
  const { slug } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/public/workspace/${slug}`).then(async (response) => {
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'Public workspace not found.')
      setProfile(payload.data)
    }).catch((requestError) => setError(requestError.message))
  }, [slug])

  if (error) return <main className="public-workspace"><section className="public-workspace__panel"><p className="eyebrow eyebrow--dark">Interview workspace</p><h1>Profile unavailable</h1><p>{error}</p></section></main>
  if (!profile) return <main className="public-workspace"><section className="public-workspace__panel"><p className="text-caption">Loading public profile...</p></section></main>

  return <main className="public-workspace"><section className="public-workspace__panel"><p className="eyebrow eyebrow--dark">Interview workspace</p><h1>{profile.candidateName}</h1><p className="public-workspace__role">{profile.jobRole} at {profile.company}</p>{profile.status && <span className="status-pill status-pill--stable">{profile.status.replace('_', ' ')}</span>}{profile.skills?.length > 0 && <section><h2>Skills</h2><div className="skill-tags">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section>}{profile.achievements?.length > 0 && <section><h2>Achievements</h2><ul>{profile.achievements.map((achievement) => <li key={achievement}>{achievement}</li>)}</ul></section>}{profile.interviewSummary && <section><h2>Interview summary</h2><p>{profile.interviewSummary}</p></section>}{profile.resume && <section><h2>Resume</h2><p className="text-caption">{profile.resume.filename}</p><pre>{profile.resume.fileText}</pre></section>}</section></main>
}
