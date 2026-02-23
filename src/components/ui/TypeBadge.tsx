type PatternType = 'skill' | 'agent' | 'orchestration'

interface TypeBadgeProps {
  type: PatternType
}

const config: Record<PatternType, { label: string; className: string }> = {
  skill: { label: '스킬', className: 'bg-skill' },
  agent: { label: '에이전트', className: 'bg-agent' },
  orchestration: { label: '오케스트레이션', className: 'bg-orchestration' },
}

function TypeBadge({ type }: TypeBadgeProps): React.ReactElement {
  const { label, className } = config[type]
  return (
    <span className={`${className} text-white text-xs font-medium px-2 py-0.5 rounded-full`}>
      {label}
    </span>
  )
}

export default TypeBadge
