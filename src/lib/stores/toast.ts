import { writable } from 'svelte/store';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

const { subscribe, update } = writable<Toast[]>([]);

let nextId = 1;

export const toastStore = {
    subscribe,
    
    add: (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
        const id = `toast-${nextId++}`;
        const toast: Toast = { id, message, type, duration };
        
        update(toasts => [...toasts, toast]);
        
        // Auto-remove after duration
        setTimeout(() => {
            toastStore.remove(id);
        }, duration);
        
        return id;
    },
    
    remove: (id: string) => {
        update(toasts => toasts.filter(t => t.id !== id));
    },
    
    clear: () => {
        update(() => []);
    },
    
    // Convenience methods
    success: (message: string, duration?: number) => toastStore.add(message, 'success', duration),
    error: (message: string, duration?: number) => toastStore.add(message, 'error', duration),
    info: (message: string, duration?: number) => toastStore.add(message, 'info', duration)
};
