interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

function Input({ className = '', ...props }: InputProps): React.ReactElement {
  return (
    <input
      className={`bg-surface border border-elevated rounded-md px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors ${className}`}
      {...props}
    />
  )
}

export default Input
