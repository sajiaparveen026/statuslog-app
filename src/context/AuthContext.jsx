import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Create a "box" that holds login info for the whole app
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)   // the logged-in user
  const [role, setRole] = useState(null)   // 'admin' or 'employee'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if someone is already logged in when app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for login / logout events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchRole(session.user.id)
      } else {
        setUser(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Get the user's role from our users table
  async function fetchRole(userId) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    setRole(data?.role || null)
    setLoading(false)
  }

  // Logout function
  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Easy way to use auth anywhere in the app
export function useAuth() {
  return useContext(AuthContext)
}
