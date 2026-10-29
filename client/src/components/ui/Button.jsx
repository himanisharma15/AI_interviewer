export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const classes = ['button', `button-${variant}`, `button-${size}`, className].filter(Boolean).join(' ')
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
