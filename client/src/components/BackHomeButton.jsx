import { Link } from 'react-router-dom'

export default function BackHomeButton() {
  return <Link to="/dashboard" className="button button-ghost button-small back-home-button">← Go back to Home</Link>
}
