export const ipc = {
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    return window.electronAPI.invoke(channel, ...args) as Promise<T>
  },
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    window.electronAPI.on(channel, callback)
  },
  removeListener: (channel: string, callback: (...args: unknown[]) => void): void => {
    window.electronAPI.removeListener(channel, callback)
  }
}
