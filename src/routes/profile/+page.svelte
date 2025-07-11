<script lang="ts">
    import { auth, type User } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { API_BASE_URL } from '$lib/config';
    import { t } from '$lib/i18n';

    let currentUser: User | null = $state(null);
    let loading = $state(true);

    onMount(() => {
        const unsubscribe = auth.subscribe(value => {
            currentUser = value.user;
            loading = false;
            if (!value.isAuthenticated && !loading) {
                // Optional: redirect if not authenticated after a brief check
                // goto('/login'); 
            }
        });

        // Ensure auth is initialized if not already
        if (typeof window !== 'undefined' && !$auth.token) {
            auth.initialize();
        }
        
        return unsubscribe;
    });

    // Form fields for profile update
    let fullName = $derived((currentUser as User | null)?.full_name || '');
    let bio = $derived((currentUser as User | null)?.bio || '');
    // Profile image handling would be more complex (file upload)
    // For now, let's assume it's a URL
    let profileImage = $derived((currentUser as User | null)?.profile_image || '');

    let updateError: string | null = $state(null);
    let updateSuccess: string | null = $state(null);
    let updating = $state(false);

    async function handleProfileUpdate(event: Event) {
        event.preventDefault();
        if (!currentUser || !$auth.token) return;
        updating = true;
        updateError = null;
        updateSuccess = null;

        try {
            const response = await fetch(`${API_BASE_URL}/user/api/v1/@me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${$auth.token}`
                },
                body: JSON.stringify({
                    full_name: fullName,
                    bio: bio,
                    profile_image: profileImage // Assuming this is a URL for now
                })
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.detail || 'Failed to update profile');
            }

            const updatedUser = await response.json() as User;
            auth.setUser(updatedUser); // Update the store with the new user details
            updateSuccess = $t('profileUpdatedSuccessfully');

        } catch (err: any) {
            updateError = err.message;
        }
        updating = false;
    }

</script>

<svelte:head>
    <title>{$t('userProfile')} - Examtie</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl shadow-2xl">
        <h1 class="text-3xl font-bold text-white mb-8">{$t('userProfile')}</h1>

        {#if loading}
            <p class="text-slate-300">{$t('loadingProfile')}...</p>
        {:else if currentUser}
            <form onsubmit={handleProfileUpdate} class="space-y-6">
                {#if updateSuccess}
                    <div class="bg-green-500/20 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
                        {updateSuccess}
                    </div>
                {/if}
                {#if updateError}
                    <div class="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                        {updateError}
                    </div>
                {/if}

                <div>
                    <label for="username" class="block text-sm font-medium text-slate-300">{$t('username')}</label>
                    <input type="text" id="username" value={currentUser.username} readonly class="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-400 shadow-sm sm:text-sm cursor-not-allowed">
                </div>
                <div>
                    <label for="email" class="block text-sm font-medium text-slate-300">{$t('emailAddress')}</label>
                    <input type="email" id="email" value={currentUser.email} readonly class="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-400 shadow-sm sm:text-sm cursor-not-allowed">
                </div>
                <div>
                    <label for="full-name" class="block text-sm font-medium text-slate-300">{$t('fullName')}</label>
                    <input type="text" id="full-name" bind:value={fullName} class="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder={$t('fullNamePlaceholder')}>
                </div>
                <div>
                    <label for="bio" class="block text-sm font-medium text-slate-300">{$t('bio')}</label>
                    <textarea id="bio" bind:value={bio} rows={3} class="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder={$t('bioPlaceholder')}></textarea>
                </div>
                <div>
                    <label for="profile-image" class="block text-sm font-medium text-slate-300">{$t('profileImageUrl')}</label>
                    <input type="url" id="profile-image" bind:value={profileImage} class="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder={$t('profileImageUrlPlaceholder')}>
                    {#if currentUser.profile_image}
                        <img src={currentUser.profile_image} alt="Current profile" class="mt-2 w-20 h-20 rounded-full object-cover">
                    {/if}
                </div>

                <div class="flex justify-end">
                    <button type="submit" disabled={updating} class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 disabled:opacity-50 transition-colors">
                        {#if updating}
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {$t('updating')}
                        {:else}
                            {$t('updateProfile')}
                        {/if}
                    </button>
                </div>
            </form>
        {:else}
            <p class="text-slate-300">{$t('pleaseLogInToViewProfile')}. <a href="/login" class="text-blue-400 hover:text-blue-300">{$t('login')}</a></p>
        {/if}
    </div>
</div>
