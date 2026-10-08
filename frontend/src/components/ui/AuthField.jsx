import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}) {
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          autoComplete={autoComplete}
          id={id}
          minLength={minLength}
          onChange={onChange}
          placeholder={placeholder}
          required
          type={isPassword && visible ? 'text' : type}
          value={value}
        />
        {isPassword && (
          <button
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="password-toggle"
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default AuthField