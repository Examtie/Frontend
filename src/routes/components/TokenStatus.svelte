<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount, onDestroy } from 'svelte';
  
  let showWarning = false;
  let timeUntilExpiry = '';
  let checkInterval: number;
  
  function updateExpiryStatus() {
    const currentAuth = $auth;
    if (currentAuth.isAuthenticated && currentAuth.tokenExpiresAt) {
      const now = new Date();
      const expiresAt = currentAuth.tokenExpiresAt;
      const timeLeft = expiresAt.getTime() - now.getTime();
      
      // Show warning if less than 24 hours left
      showWarning = currentAuth.isTokenExpiringSoon && timeLeft > 0;
      
      if (showWarning) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          timeUntilExpiry = `${hours}h ${minutes}m`;
        } else {
          timeUntilExpiry = `${minutes}m`;
        }
      }
    } else {
      showWarning = false;
    }
  }
  
  onMount(() => {
    updateExpiryStatus();
    // Update every minute
    checkInterval = setInterval(updateExpiryStatus, 60000);
  });
  
  onDestroy(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
  
  // Reactive statement to update when auth state changes
  $: {
    $auth; // React to auth changes
    updateExpiryStatus();
  }
</script>

{#if showWarning}
  <div class="fixed top-20 right-4 z-50 bg-amber-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border border-amber-400/30">
    <div class="flex items-center space-x-2">
      <svg class="w-4 h-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span class="text-sm font-medium">
        Session expires in {timeUntilExpiry}
      </span>
    </div>
  </div>
{/if}
