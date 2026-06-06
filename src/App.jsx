import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EntryForm from './pages/EntryForm'
import Dashboard from './pages/Dashboard'
import NotFound from './components/NotFound'
import { AuthProvider, useAuth } from './context/AuthContext'

function LoadingScreen() {
  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  )
}

function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" />
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'admin' ? '/dashboard' : '/entry'} />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user && role) {
    return <Navigate to={role === 'admin' ? '/dashboard' : '/entry'} />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          {/* Signup removed — admin creates employees from dashboard */}
          <Route path="/entry" element={
            <ProtectedRoute allowedRole="employee"><EntryForm /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRole="admin"><Dashboard /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
