import type { ArtifactStatus } from '../../types/artifact'

interface ArtifactStatusBadgeProps {
  status: ArtifactStatus
}

const config: Record<ArtifactStatus, { label: string; className: string }> = {
  curated: { label: '수집됨', className: 'bg-blue-600 text-white' },
  review: { label: '검토중', className: 'bg-yellow-600 text-white' },
  verified: { label: '검증됨', className: 'bg-green-600 text-white' },
  promoted: { label: '승격됨', className: 'bg-purple-600 text-white' },
  rejected: { label: '거부됨', className: 'bg-red-600 text-white' },
}

function ArtifactStatusBadge({ status }: ArtifactStatusBadgeProps): React.ReactElement {
  const { label, className } = config[status] ?? { label: status, className: 'bg-gray-600 text-white' }
  return (
    <span className={`${className} text-xs font-medium px-2 py-0.5 rounded-full`}>
      {label}
    </span>
  )
}

export default ArtifactStatusBadge
