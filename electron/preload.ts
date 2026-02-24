import { contextBridge, ipcRenderer } from 'electron'

export type ElectronAPI = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void
}

// Map original callbacks to their ipcRenderer wrappers so removeListener works correctly.
const listenerMap = new Map<(...args: unknown[]) => void, (...args: unknown[]) => void>()

const electronAPI: ElectronAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    const wrapper = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    listenerMap.set(callback, wrapper)
    ipcRenderer.on(channel, wrapper)
  },
  removeListener: (channel, callback) => {
    const wrapper = listenerMap.get(callback)
    if (wrapper) {
      ipcRenderer.removeListener(channel, wrapper as Parameters<typeof ipcRenderer.removeListener>[1])
      listenerMap.delete(callback)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
