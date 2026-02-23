import { vi } from 'vitest'

export const mockElectronAPI = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}

export function setupElectronMock(): void {
  window.electronAPI = mockElectronAPI as never
}

export function resetElectronMock(): void {
  mockElectronAPI.invoke.mockReset()
  mockElectronAPI.on.mockReset()
  mockElectronAPI.removeListener.mockReset()
}
