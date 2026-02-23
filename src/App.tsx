import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/Home'

function Placeholder({ name }: { name: string }): React.ReactElement {
  return <div className="p-8 text-text-secondary">{name} (TODO)</div>
}

function App(): React.ReactElement {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/patterns" element={<Placeholder name="Pattern Library" />} />
        <Route path="/patterns/:id" element={<Placeholder name="Pattern Detail" />} />
        <Route path="/guide/:workId" element={<Placeholder name="Guide Dialogue" />} />
        <Route path="/guide/:workId/preview" element={<Placeholder name="Preview" />} />
        <Route path="/workspace" element={<Placeholder name="Workspace" />} />
        <Route path="/workspace/:id" element={<Placeholder name="Work Detail" />} />
      </Routes>
    </AppLayout>
  )
}

export default App
