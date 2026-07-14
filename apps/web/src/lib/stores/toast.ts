import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'default';
  title?: string;
  message: string;
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    subscribe,
    add: (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, ...toast };

      update(toasts => [...toasts, newToast]);

      if (toast.duration !== 0) {
        const timeout = setTimeout(() => {
          timeoutMap.delete(id);
          update(toasts => toasts.filter(t => t.id !== id));
        }, toast.duration || 3000);
        timeoutMap.set(id, timeout);
      }

      return id;
    },
    remove: (id: string) => {
      const timeout = timeoutMap.get(id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutMap.delete(id);
      }
      update(toasts => toasts.filter(t => t.id !== id));
    },
    clear: () => {
      // Clear all pending timeouts
      for (const timeout of timeoutMap.values()) {
        clearTimeout(timeout);
      }
      timeoutMap.clear();
      update(() => []);
    }
  };
}

export const toasts = createToastStore();

export function toast(message: string, type: Toast['type'] = 'default', duration = 3000) {
  return toasts.add({ message, type, duration });
}

export function toastSuccess(message: string, duration = 3000) {
  return toasts.add({ message, type: 'success', duration });
}

export function toastError(message: string, duration = 3000) {
  return toasts.add({ message, type: 'error', duration });
}

export function toastWarning(message: string, duration = 3000) {
  return toasts.add({ message, type: 'warning', duration });
}

export function toastInfo(message: string, duration = 3000) {
  return toasts.add({ message, type: 'info', duration });
}
