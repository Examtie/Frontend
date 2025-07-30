<script lang="ts">
    import { streakStore } from '$lib/stores/streak';
    import { auth } from '$lib/stores/auth';
    import { onMount, onDestroy } from 'svelte';
    
    // Props
    let { variant = 'header' } = $props();
    
    let refreshInterval: number;
    
    onMount(() => {
        // Load initial streak data if user is authenticated
        if ($auth.isAuthenticated) {
            streakStore.loadStreak();
            
            // Set up periodic refresh (every 5 minutes)
            refreshInterval = setInterval(() => {
                if ($auth.isAuthenticated) {
                    streakStore.loadStreak();
                }
            }, 5 * 60 * 1000);
        }
    });
    
    onDestroy(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
    
    // Effect for reactive loading when auth state changes
    $effect(() => {
        if ($auth.isAuthenticated && $auth.isInitialized) {
            streakStore.loadStreak();
        } else if (!$auth.isAuthenticated) {
            streakStore.clear();
        }
    });
    
    function getStreakEmoji(streak: number): string {
        if (streak >= 100) return '🔥';
        if (streak >= 50) return '⚡';
        if (streak >= 30) return '🌟';
        if (streak >= 14) return '💎';
        if (streak >= 7) return '🎯';
        if (streak >= 3) return '🚀';
        return '⭐';
    }
    
    function getStreakTitle(streak: number): string {
        if (streak >= 100) return 'Legendary Streak!';
        if (streak >= 50) return 'Epic Streak!';
        if (streak >= 30) return 'Amazing Streak!';
        if (streak >= 14) return 'Great Streak!';
        if (streak >= 7) return 'Good Streak!';
        if (streak >= 3) return 'Nice Streak!';
        if (streak >= 1) return 'Keep it up!';
        return 'Start your streak!';
    }
</script>

{#if $auth.isAuthenticated && $streakStore.streak}
    <div class="hidden sm:flex items-center bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-400/30 rounded-xl px-3 py-2 hover:from-orange-500/30 hover:to-red-500/30 hover:border-orange-400/50 transition-all duration-300 group cursor-pointer" 
         title={getStreakTitle($streakStore.streak.current)}>
        <div class="flex items-center space-x-2">
            <!-- Streak icon with animation -->
            <div class="relative">
                <span class="text-lg group-hover:scale-110 transition-transform duration-300">
                    {getStreakEmoji($streakStore.streak.current)}
                </span>
            </div>
            
            <!-- Streak number -->
            <div class="flex flex-col">
                <span class="text-orange-200 font-bold text-sm leading-none">
                    {$streakStore.streak.current}
                </span>
                <span class="text-orange-300/70 text-xs leading-none">
                    streak
                </span>
            </div>
            
            <!-- Revives indicator (if any used) -->
            {#if $streakStore.streak.revives_used > 0}
                <div class="flex items-center ml-1" title="{$streakStore.streak.revives_used} revives used">
                    <span class="text-amber-400 text-xs">💊</span>
                    <span class="text-amber-300 text-xs ml-0.5">{$streakStore.streak.revives_used}</span>
                </div>
            {/if}
        </div>
    </div>
{:else if $auth.isAuthenticated && $streakStore.loading}
    <!-- Loading state -->
    <div class="hidden sm:flex items-center bg-slate-700/50 border border-slate-600/30 rounded-xl px-3 py-2">
        <div class="flex items-center space-x-2">
            <div class="w-4 h-4 bg-slate-500 rounded-full animate-pulse"></div>
            <div class="w-8 h-3 bg-slate-500 rounded animate-pulse"></div>
        </div>
    </div>
{:else if $auth.isAuthenticated && $streakStore.error}
    <!-- Error state (silent - just show empty) -->
    <!-- We could show a small error indicator if needed -->
{/if}

<!-- Mobile menu version (full width) - only show in mobile-menu variant -->
{#if variant === 'mobile-menu' && $auth.isAuthenticated && $streakStore.streak}
    <div class="flex w-full justify-center bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-400/30 rounded-xl px-4 py-3 hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300" 
         title={getStreakTitle($streakStore.streak.current)}>
        <div class="flex items-center space-x-3">
            <div class="relative">
                <span class="text-2xl">{getStreakEmoji($streakStore.streak.current)}</span>
                {#if $streakStore.streak.current > 0}
                    <div class="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                {/if}
            </div>
            
            <div class="flex flex-col items-center">
                <span class="text-orange-200 font-bold text-xl">
                    {$streakStore.streak.current}
                </span>
                <span class="text-orange-300/70 text-sm">
                    {$streakStore.streak.current === 1 ? 'day streak' : 'days streak'}
                </span>
            </div>
            
            {#if $streakStore.streak.revives_used > 0}
                <div class="flex items-center" title="{$streakStore.streak.revives_used} revives used">
                    <span class="text-amber-400 text-lg">💊</span>
                    <span class="text-amber-300 text-sm ml-1">{$streakStore.streak.revives_used}</span>
                </div>
            {/if}
        </div>
    </div>
{:else if variant === 'mobile-menu' && $auth.isAuthenticated && $streakStore.loading}
    <!-- Mobile menu loading state -->
    <div class="flex w-full justify-center bg-slate-700/50 border border-slate-600/30 rounded-xl px-4 py-3">
        <div class="flex items-center space-x-2">
            <div class="w-4 h-4 bg-slate-500 rounded-full animate-pulse"></div>
            <div class="w-16 h-4 bg-slate-500 rounded animate-pulse"></div>
        </div>
    </div>
{:else if variant === 'mobile-menu' && $auth.isAuthenticated && $streakStore.error}
    <!-- Mobile menu error state - show a simple message -->
    <div class="flex w-full justify-center text-gray-400 text-sm py-2">
        Streak data unavailable
    </div>
{/if}
