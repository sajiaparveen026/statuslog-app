import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { role } = useAuth()
  const navigate = useNavigate()

  function goHome() {
    if (role === 'admin') navigate('/dashboard')
    else if (role === 'employee') navigate('/entry')
    else navigate('/login')
  }

  return (
    <div className="auth-wrapper">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Page Not Found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={goHome}>
          Go Home
        </button>
      </div>
    </div>
  )
}