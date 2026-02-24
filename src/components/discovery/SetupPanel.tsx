import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'
import { useDiscoveryStore } from '../../stores/discoveryStore'

function SetupPanel(): React.ReactElement {
  const { config, setupOk, error, saveConfig, checkSetup } = useDiscoveryStore()
  const [projectPath, setProjectPath] = useState(config?.projectPath ?? '')
  const [pythonPath, setPythonPath] = useState(config?.pythonPath ?? '')

  // Sync local state when config loads asynchronously
  useEffect(() => {
    if (config) {
      setProjectPath(config.projectPath)
      setPythonPath(config.pythonPath ?? '')
    }
  }, [config])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!projectPath.trim()) return
    setSaving(true)
    await saveConfig({
      projectPath: projectPath.trim(),
      pythonPath: pythonPath.trim() || undefined
    })
    setSaving(false)
  }

  async function handleCheck() {
    setSaving(true)
    await checkSetup()
    setSaving(false)
  }

  return (
    <Card>
      <h3 className="text-text-primary font-semibold text-base mb-4">
        agents-casting 설정
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary text-sm mb-1">
            프로젝트 경로
          </label>
          <Input
            placeholder="/path/to/agents-casting"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-sm mb-1">
            Python 경로 (선택)
          </label>
          <Input
            placeholder="python3"
            value={pythonPath}
            onChange={(e) => setPythonPath(e.target.value)}
            className="w-full"
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {setupOk && (
          <div className="bg-green-900/20 border border-green-800 rounded p-3">
            <p className="text-green-400 text-sm">설정 확인 완료</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !projectPath.trim()}>
            저장
          </Button>
          <Button variant="secondary" onClick={handleCheck} disabled={saving}>
            연결 확인
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default SetupPanel
