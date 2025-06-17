<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';

    let email = '';
    let password = '';
    let full_name = '';
    let username = '';
    let isLogin = true; // To toggle between login and register forms

    let loading = false;
    let successMessage = ''; // Added for success messages

    async function handleSubmit() {
        if (loading) return;
        loading = true;
        auth.clearError();
        successMessage = ''; // Clear previous success messages

        let success = false;
        if (isLogin) {
            success = await auth.login(username, password);
            if (success) successMessage = $t('loginSuccess');
        } else {
            success = await auth.register({ email, password, full_name: full_name, username }); // Ensure full_name is passed
            if (success) successMessage = $t('registrationSuccess');
        }

        if (success) {
            setTimeout(() => goto('/'), 1500); // Redirect after a short delay
        } 
        loading = false;
    }

    function toggleForm() {
        isLogin = !isLogin;
        auth.clearError();
        successMessage = ''; // Clear success message on form toggle
    }
</script>

<svelte:head>
    <title>{isLogin ? $t('login') : $t('register')} - Examtie</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-slate-800 p-10 rounded-xl shadow-2xl">
        <div>
            <div class="flex justify-center">
                <a href="/" class="flex items-center space-x-2 mb-6">
                    <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-white font-bold text-xl">E</span>
                    </div>
                    <span class="text-sky-200 text-3xl font-bold">Examtie</span>
                </a>
            </div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
                {isLogin ? $t('signInToYourAccount') : $t('createNewAccount')}
            </h2>
        </div>
        <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
            {#if $auth.error}
                <div class="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                    <p>{$auth.error}</p>
                </div>
            {/if}
            {#if successMessage}
                <div class="bg-green-500/20 border border-green-700 text-green-300 px-4 py-3 rounded-lg" role="alert">
                    <p>{successMessage}</p>
                </div>
            {/if}

            {#if !isLogin}
                <div class="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label for="full_name" class="sr-only">{$t('fullName')}</label>
                        <input id="full_name" name="full_name" type="text" bind:value={full_name} required class="appearance-none rounded-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm rounded-t-md" placeholder={$t('fullNamePlaceholder')}>
                    </div>
                    <div>
                        <label for="email" class="sr-only">{$t('emailAddress')}</label>
                        <input id="email" name="email" type="email" bind:value={email} required class="appearance-none rounded-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder={$t('emailAddress')}> 
                    </div>
                </div>
            {/if}

            <div class="rounded-md shadow-sm -space-y-px">
                <div>
                    <label for="username" class="sr-only">{$t('username')}</label>
                    <input id="username" name="username" type="text" autocomplete="username" bind:value={username} required class="appearance-none rounded-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm {isLogin && !isLogin ? 'rounded-t-md' : (isLogin ? 'rounded-t-md' : '')}" placeholder={$t('usernamePlaceholder')}>
                </div>
                <div>
                    <label for="password" class="sr-only">{$t('password')}</label>
                    <input id="password" name="password" type="password" autocomplete="current-password" bind:value={password} required class="appearance-none rounded-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm rounded-b-md" placeholder={$t('passwordPlaceholder')}>
                </div>
            </div>

            {#if isLogin}
                <div class="flex items-center justify-between">
                    <div class="text-sm">
                        <a href="#" class="font-medium text-blue-400 hover:text-blue-300">
                            {$t('forgotPassword')}
                        </a>
                    </div>
                </div>
            {/if}

            <div>
                <button type="submit" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white {isLogin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 {isLogin ? 'focus:ring-blue-500' : 'focus:ring-green-500'} transition-colors duration-150 ease-in-out">
                    {#if loading}
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {$t('processing')}
                    {:else}
                        {isLogin ? $t('signIn') : $t('createAccount')}
                    {/if}
                </button>
            </div>
        </form>

        <div class="text-sm text-center">
            <button on:click={toggleForm} class="font-medium text-blue-400 hover:text-blue-300">
                {isLogin ? $t('needAnAccount') : $t('alreadyHaveAccount')}
            </button>
        </div>
    </div>
</div>
