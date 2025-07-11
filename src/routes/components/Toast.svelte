<script lang="ts">
    import { onMount } from 'svelte';
    
    interface ToastProps {
        message: string;
        type?: 'success' | 'error' | 'info';
        duration?: number;
        onClose?: () => void;
    }
    
    let { 
        message, 
        type = 'info', 
        duration = 3000, 
        onClose = () => {} 
    }: ToastProps = $props();
    
    let visible = $state(false);
    let timeoutId: number;
    
    onMount(() => {
        // Trigger animation
        setTimeout(() => visible = true, 10);
        
        // Auto-hide after duration
        timeoutId = setTimeout(() => {
            visible = false;
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);
        
        return () => {
            clearTimeout(timeoutId);
        };
    });
    
    function handleClose() {
        visible = false;
        setTimeout(onClose, 300);
    }
    
    const typeStyles = {
        success: 'bg-green-500/90 border-green-400/50 text-white',
        error: 'bg-red-500/90 border-red-400/50 text-white',
        info: 'bg-blue-500/90 border-blue-400/50 text-white'
    };
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
</script>

{#if visible}
    <div 
        class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border backdrop-blur-lg shadow-lg transform transition-all duration-300 {typeStyles[type]} {visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}"
        role="alert"
    >
        <div class="flex items-center gap-3">
            <span class="text-lg font-bold">{icons[type]}</span>
            <span class="font-medium">{message}</span>
            <button
                onclick={handleClose}
                class="ml-2 text-white/80 hover:text-white transition-colors"
                aria-label="Close notification"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    </div>
{/if}
