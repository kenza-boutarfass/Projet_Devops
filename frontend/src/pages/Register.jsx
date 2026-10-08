import { Check, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import AuthField from '../components/ui/AuthField.jsx'

function Register() {
  const [profile, setProfile] = useState('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const strength = useMemo(() => getPasswordStrength(password), [password])

  function handleSubmit(event) {
    event.preventDefault()
    if (password !== confirmation) {
      setMessage('Passwords do not match.')
      return
    }
    setLoading(true)
    setMessage('')
    window.setTimeout(() => {
      setLoading(false)
      setMessage('Registration is not connected yet. No account was created.')
    }, 550)
  }

  return (
    <AuthLayout heading="Create your workspace" intro="Start with a clearer view of data quality." mode="register">
      <form className="auth-form" onSubmit={handleSubmit}>
        <fieldset className="profile-choice">
          <legend>Choose your profile</legend>
          <div className="profile-choice-options">
            <label className={`profile-choice-option ${profile === 'student' ? 'profile-choice-selected' : ''}`}>
              <input checked={profile === 'student'} name="profile" onChange={() => setProfile('student')} type="radio" value="student" />
              <span className="profile-choice-copy"><strong>Student</strong><small>Learning and academic projects</small></span>
              {profile === 'student' && <Check className="profile-choice-check" size={15} aria-hidden="true" />}
            </label>
            <label className={`profile-choice-option ${profile === 'professor' ? 'profile-choice-selected' : ''}`}>
              <input checked={profile === 'professor'} name="profile" onChange={() => setProfile('professor')} type="radio" value="professor" />
              <span className="profile-choice-copy"><strong>Professor</strong><small>Teaching, reviewing, monitoring</small></span>
              {profile === 'professor' && <Check className="profile-choice-check" size={15} aria-hidden="true" />}
            </label>
            <label className={`profile-choice-option ${profile === 'professional' ? 'profile-choice-selected' : ''}`}>
              <input checked={profile === 'professional'} name="profile" onChange={() => setProfile('professional')} type="radio" value="professional" />
              <span className="profile-choice-copy"><strong>Professional</strong><small>Real-world quality workflows</small></span>
              {profile === 'professional' && <Check className="profile-choice-check" size={15} aria-hidden="true" />}
            </label>
          </div>
        </fieldset>
        <AuthField
          autoComplete="name"
          id="register-name"
          label="Full name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          value={name}
        />
        <AuthField
          autoComplete="email"
          id="register-email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          type="email"
          value={email}
        />
        <AuthField
          autoComplete="new-password"
          id="register-password"
          label="Password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          type="password"
          value={password}
        />
        <div className={`password-strength strength-${strength.score}`} aria-live="polite">
          <span className="strength-bars" aria-hidden="true">
            {[1, 2, 3, 4].map((bar) => <i className={bar <= strength.score ? 'is-filled' : ''} key={bar} />)}
          </span>
          <span>{password ? strength.label : 'Use 8+ characters'}</span>
        </div>
        <div className="password-requirements">
          <span>{password.length >= 8 ? <Check size={13} /> : <Minus size={13} />} 8 characters</span>
          <span>{/[0-9]/.test(password) ? <Check size={13} /> : <Minus size={13} />} one number</span>
        </div>
        <AuthField
          autoComplete="new-password"
          id="register-confirm"
          label="Confirm password"
          minLength={8}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Repeat your password"
          type="password"
          value={confirmation}
        />
        {message && <p aria-live="polite" className="form-feedback">{message}</p>}
        <button className="button button-primary auth-submit" disabled={loading} type="submit">
          {loading ? <span className="button-spinner" /> : null}
          {loading ? 'Validating...' : 'Register'}
        </button>
      </form>
      <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  )
}

function getPasswordStrength(password) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][score]
  return { score, label }
}

export default Register