import { Link } from 'react-router-dom'

function Button({
  children,
  to,
  variant = 'primary',
  icon: Icon,
  className = '',
  ...props
}) {
  const classes = `button button-${variant} ${className}`.trim()
  const content = (
    <>
      <span>{children}</span>
      {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
    </>
  )

  if (to) {
    return (
      <Link className={classes} to={to} {...props}>
        {content}
      </Link>
    )
  }

  return (
    <button className={classes} type="button" {...props}>
      {content}
    </button>
  )
}

export default Button