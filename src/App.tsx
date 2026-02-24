import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/Home'
import PatternLibrary from './pages/PatternLibrary'
import PatternDetail from './pages/PatternDetail'
import GuideDialogue from './pages/GuideDialogue'
import Preview from './pages/Preview'

function Placeholder({ name }: { name: string }): React.ReactElement {
  return <div className="p-8 text-text-secondary">{name} (TODO)</div>
}

function App(): React.ReactElement {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/patterns" element={<PatternLibrary />} />
        <Route path="/patterns/:id" element={<PatternDetail />} />
        <Route path="/guide/:workId" element={<GuideDialogue />} />
        <Route path="/guide/:workId/preview" element={<Preview />} />
        <Route path="/workspace" element={<Placeholder name="Workspace" />} />
        <Route path="/workspace/:id" element={<Placeholder name="Work Detail" />} />
      </Routes>
    </AppLayout>
  )
}

export default App
