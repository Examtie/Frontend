<script lang="ts">
    import { toastStore } from '$lib/stores/toast';
    import Toast from './Toast.svelte';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
    {#each $toastStore as toast (toast.id)}
        <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => toastStore.remove(toast.id)}
        />
    {/each}
</div>
