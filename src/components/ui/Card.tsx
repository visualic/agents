interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

function Card({ children, className = '', onClick }: CardProps): React.ReactElement {
  return (
    <div
      className={`bg-surface border border-elevated rounded-lg p-4 transition-colors hover:border-primary/30 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
