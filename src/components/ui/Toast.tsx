import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  type: ToastType
  message: string
  onClose: () => void
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
}

function Toast({ type, message, onClose }: ToastProps): React.ReactElement {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      role="alert"
      className={`${typeClasses[type]} text-white px-4 py-3 rounded-lg shadow-lg fixed bottom-4 right-4 z-50`}
    >
      {message}
    </div>
  )
}

export default Toast
