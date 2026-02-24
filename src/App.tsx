import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/Home'
import PatternLibrary from './pages/PatternLibrary'
import PatternDetail from './pages/PatternDetail'
import GuideDialogue from './pages/GuideDialogue'
import Preview from './pages/Preview'
import Workspace from './pages/Workspace'
import WorkDetail from './pages/WorkDetail'
import Discover from './pages/Discover'
import ArtifactDetail from './pages/ArtifactDetail'

function App(): React.ReactElement {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/patterns" element={<PatternLibrary />} />
        <Route path="/patterns/:id" element={<PatternDetail />} />
        <Route path="/guide/:workId" element={<GuideDialogue />} />
        <Route path="/guide/:workId/preview" element={<Preview />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<WorkDetail />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/discover/:id" element={<ArtifactDetail />} />
      </Routes>
    </AppLayout>
  )
}

export default App
