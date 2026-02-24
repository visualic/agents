import ArtifactCard from './ArtifactCard'
import type { Artifact } from '../../types/artifact'

interface ArtifactGridProps {
  artifacts: Artifact[]
}

function ArtifactGrid({ artifacts }: ArtifactGridProps): React.ReactElement {
  if (artifacts.length === 0) {
    return (
      <div className="bg-surface border border-elevated rounded-lg p-8 text-center">
        <p className="text-text-secondary text-sm">아티팩트가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </div>
  )
}

export default ArtifactGrid
