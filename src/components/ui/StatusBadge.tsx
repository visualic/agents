type WorkStatus = 'draft' | 'completed' | 'exported'

interface StatusBadgeProps {
  status: WorkStatus
}

const config: Record<WorkStatus, { label: string; className: string }> = {
  draft: { label: '초안', className: 'bg-elevated text-text-secondary' },
  completed: { label: '완료', className: 'bg-green-600 text-white' },
  exported: { label: '내보냄', className: 'bg-blue-600 text-white' },
}

function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const { label, className } = config[status]
  return (
    <span className={`${className} text-xs font-medium px-2 py-0.5 rounded-full`}>
      {label}
    </span>
  )
}

export default StatusBadge
