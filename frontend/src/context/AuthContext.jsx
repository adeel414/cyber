// context/AuthContext.jsx - Authentication context for CyberLens AI
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  const loadUser = useCallback(async () => {
    try {
      const response = await authAPI.me()
      setUser(response.data)
      setIsAuthenticated(true)
      connectSocket(response.data.id)
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password })
    const { accessToken, refreshToken, user: userData } = response.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(userData)
    setIsAuthenticated(true)
    connectSocket(userData.id)
    return userData
  }

  const signup = async (name, email, password) => {
    const response = await authAPI.signup({ name, email, password })
    return response
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // Continue even if server logout fails
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setIsAuthenticated(false)
    disconnectSocket()
  }

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        signup,
        logout,
        loadUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
