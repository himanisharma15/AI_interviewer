import { Link } from 'react-router-dom'
import { scoreTone } from '../lib/score'

const steps = [
  ['01', 'Upload your resume', 'Give the interviewer context that makes every question feel relevant.'],
  ['02', 'Choose your role', 'Set your target role and the challenge level you want to practice.'],
  ['03', 'Enter the room', 'Answer naturally in a focused, voice-first interview experience.'],
  ['04', 'See what to improve', 'Get a clear scorecard with practical feedback you can act on.'],
]

const roles = ['Frontend', 'Backend', 'Full stack', 'MERN stack', 'Data analyst']

export default function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="topbar container">
        <Link className="brand" to="/">
          <span className="brand-mark">ai</span>
          <span>interviewer</span>
        </Link>

        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="button button-ghost">Sign in</Link>
          <Link to="/dashboard" className="button button-primary">Get started <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>

      <section className="hero container" id="top">
        <div className="hero-copy">
          <div className="eyebrow eyebrow--dark">
            <span className="pulse-dot" /> AI-powered Interview Preparation
          </div>
          <h1>
            Practice Today <span className="gradient-text">Get Hired</span> Tomorrow
          </h1>
          <p className="hero-intro">
            Personalized interview practice built from your resume and target job description so you can sharpen responses, build confidence, and move faster toward your next role.
          </p>

          <div className="hero-actions">
            <Link to="/new-interview" className="button button-primary">
              Get Started <span aria-hidden="true">↗</span>
            </Link>
            <button type="button" className="button button-ghost button-ghost--dark">
              <span className="play-icon" aria-hidden="true">▶</span> Watch Demo
            </button>
          </div>

          <div className="trust-row">
            <div className="avatars">
              <span>AS</span>
              <span>MK</span>
              <span>JR</span>
              <span>+</span>
            </div>
            <span>Built for thoughtful, job-ready preparation</span>
          </div>
        </div>

        <div className="interview-preview" aria-label="Interview interface preview">
          <div className="preview-top">
            <span className="preview-label"><i /> Live Interview</span>
            <span>04 / 10</span>
          </div>
          <div className="preview-body">
            <div className="preview-avatar">
              <span>ai</span>
              <div className="sound-bars" aria-hidden="true">
                <i /><i /><i /><i /><i />
              </div>
            </div>
            <p className="preview-status">AI interviewer <span>is speaking</span></p>
            <h2>Tell me about a project where you had to make a difficult technical decision.</h2>
            <div className="preview-bottom">
              <div>
                <span className="tiny-label">Session time</span>
                <strong>12:34</strong>
              </div>
              <div className="preview-progress"><span /></div>
              <button type="button" className="mini-button" aria-label="Replay question">↻</button>
            </div>
          </div>
          <button type="button" className="preview-footer">
            <span className="mic-icon">⌁</span>
            <span>Your turn when you’re ready</span>
            <span className="footer-arrow">→</span>
          </button>
        </div>
      </section>

      <section className="signal-strip">
        <div className="container signal-inner">
          <span>Designed for the moment before the interview</span>
          <div className="signal-line" />
          <span>Less anxiety. Better answers.</span>
        </div>
      </section>

      <section className="section container" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="section-kicker">The simple loop</span>
            <h2>Practice with purpose.</h2>
          </div>
          <p>Good interviews are not memorized. They are practiced, reflected on, and practiced again.</p>
        </div>

        <div className="step-grid">
          {steps.map(([number, title, copy]) => (
            <button type="button" className="step" key={number}>
              <span className="step-number">{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="step-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>

      <section className="feature-band" id="features">
        <div className="container feature-layout">
          <div>
            <span className="section-kicker">A better kind of feedback</span>
            <h2>Clarity you can carry forward.</h2>
            <p>Every session turns into an honest, useful snapshot of where you are today and what to work on next.</p>
            <Link to="/new-interview" className="button button-primary">
              Explore the experience <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="scorecard">
            <div className="scorecard-header">
              <span>Session scorecard</span>
              <span className="score-badge">Good</span>
            </div>
            <div className="score-main">
              <strong>78</strong>
              <span>/ 100</span>
              <div className={`score-ring ${scoreTone(78)}`}>78%</div>
            </div>
            <div className="score-row">
              <span>Technical knowledge</span>
              <div><i style={{ width: '82%' }} /></div>
              <b className={scoreTone(82)}>82</b>
            </div>
            <div className="score-row">
              <span>Communication</span>
              <div><i style={{ width: '74%' }} /></div>
              <b className={scoreTone(74)}>74</b>
            </div>
            <div className="score-row">
              <span>Answer relevance</span>
              <div><i style={{ width: '88%' }} /></div>
              <b className={scoreTone(88)}>88</b>
            </div>
            <div className="feedback-note">
              <span>✦</span>
              <p><b>What went well</b><br />You connected your decision to a clear outcome.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="roles-section container" id="roles">
        <div className="roles-copy">
          <span className="section-kicker">Your next role</span>
          <h2>Meet the interview you’re preparing for.</h2>
        </div>
        <div className="role-list">
          {roles.map((role) => (
            <Link key={role} to="/new-interview" className="role">
              {role}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">ai</span>
            <span>interviewer</span>
          </Link>
          <span>Practice with intention.</span>
          <span>© 2026 AI Interviewer</span>
        </div>
      </footer>
    </main>
  )
}
