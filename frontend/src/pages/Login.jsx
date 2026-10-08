import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import AuthField from '../components/ui/AuthField.jsx'
import { login } from '../services/api.js'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setMessage(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout heading="Welcome back" intro="Sign in to access your data quality workspace." mode="login">
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          autoComplete="email"
          id="login-email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          type="email"
          value={email}
        />
        <AuthField
          autoComplete="current-password"
          id="login-password"
          label="Password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />
        <div className="auth-form-meta">
          <label className="checkbox-label"><input type="checkbox" /> Remember this device</label>
          <span className="muted-link">Forgot password?</span>
        </div>
        <button className="button button-primary auth-submit" disabled={loading} type="submit">
          {loading ? <span className="button-spinner" /> : null}
          {loading ? 'Checking...' : 'Sign in'}
        </button>
        {message && <p aria-live="polite" className="form-feedback">{message}</p>}
      </form>
      <p className="auth-switch">Don&apos;t have an account? <Link to="/register">Register</Link></p>
    </AuthLayout>
  )
}

export default Login