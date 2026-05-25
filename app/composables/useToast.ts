export type ToastType = 'error' | 'success' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  details?: string
  link?: { label: string; href: string }
  duration?: number
}

let counter = 0

export function useToast() {
  const toasts = useState<Toast[]>('app-toasts', () => [])

  function add(toast: Omit<Toast, 'id'>) {
    const id = `toast-${++counter}-${Date.now()}`
    const entry: Toast = { id, ...toast }
    toasts.value.push(entry)

    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000)
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    return id
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function clear() {
    toasts.value = []
  }

  function error(title: string, opts?: { message?: string; details?: string; statusCode?: number; path?: string }) {
    return add({
      type: 'error',
      title,
      message: opts?.message,
      details: opts?.details,
    })
  }

  function success(title: string, message?: string) {
    return add({ type: 'success', title, message })
  }

  function warning(title: string, message?: string) {
    return add({ type: 'warning', title, message })
  }

  function info(title: string, message?: string) {
    return add({ type: 'info', title, message })
  }

  return { toasts: readonly(toasts), add, remove, clear, error, success, warning, info }
}
