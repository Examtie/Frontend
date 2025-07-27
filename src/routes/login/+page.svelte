<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { t } from '$lib/i18n';

    let email = '';
    let password = '';
    let full_name = '';
    let username = '';
    let isLogin = true; // To toggle between login and register forms
    let showPassword = false;

    let loading = false;
    let successMessage = ''; // Added for success messages
    $: redirectPath = $page.url.searchParams.get('redirect') || '/';
    let formErrors: { [key: string]: string } = {};

    // Form validation
    function validateForm() {
        formErrors = {};
        
        if (!email.trim()) {
            formErrors.email = $t('emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            formErrors.email = $t('invalidEmail');
        }

        if (!password.trim()) {
            formErrors.password = $t('passwordRequired');
        } else if (password.length < 8) {
            formErrors.password = $t('passwordLength');
        }

        if (!isLogin) {
            if (!full_name.trim()) {
                formErrors.full_name = $t('fullNameRequired');
            }
            
            if (!username.trim()) {
                formErrors.username = $t('usernameRequired');
            } else if (username.length < 3 || username.length > 30) {
                formErrors.username = $t('usernameLength');
            }
        }

        return Object.keys(formErrors).length === 0;
    }

    async function handleSubmit() {
        if (loading) return;
        
        if (!validateForm()) {
            return;
        }

        loading = true;
        auth.clearError();
        successMessage = ''; // Clear previous success messages

        let success = false;
        if (isLogin) {
            success = await auth.login(email, password);
            if (success) successMessage = $t('loginSuccess');
        } else {
            success = await auth.register({ email, password, full_name: full_name, username }); // Ensure full_name is passed
            if (success) successMessage = $t('registrationSuccess');
        }

        if (success) {
            setTimeout(() => goto(redirectPath), 1500); // Redirect after a short delay
        } 
        loading = false;
    }

    function toggleForm() {
        isLogin = !isLogin;
        auth.clearError();
        successMessage = ''; // Clear success message on form toggle
        formErrors = {}; // Clear form errors
        // Clear form fields when switching modes
        email = '';
        password = '';
        full_name = '';
        username = '';
    }

    function togglePasswordVisibility() {
        showPassword = !showPassword;
    }
</script>

<svelte:head>
    <title>{isLogin ? $t('login') : $t('register')} - Examtie</title>
    <meta name="description" content={isLogin ? $t('signInToYourAccount') : $t('createNewAccount')} />
</svelte:head>

<div class="min-h-screen flex">
    <!-- Left Side - Branding & Features -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 relative overflow-hidden">
        <!-- Background Pattern -->
        <div class="absolute inset-0 bg-black/20"></div>
        <div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"></div>
        
        <div class="relative z-10 flex flex-col justify-center px-12 text-white">
            <!-- Logo -->
            <div class="mb-8">
                <a href="/" class="inline-flex items-center space-x-3">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                        <span class="text-white font-bold text-xl">E</span>
                    </div>
                    <span class="text-3xl font-bold">Examtie</span>
                </a>
            </div>

            <!-- Hero Content -->
            <div class="max-w-md">
                <h1 class="text-4xl font-bold mb-6 leading-tight">
                    {isLogin ? $t('welcomeBack') : $t('joinToday')}
                </h1>
                <p class="text-xl text-white/80 mb-8 leading-relaxed">
                    {$t('transformStudy')}
                </p>

                <!-- Features List -->
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <span class="text-white/90">{$t('aiPoweredLearning')}</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-blue-400/20 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                        </div>
                        <span class="text-white/90">{$t('progressTracking')}</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-purple-400/20 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                            </svg>
                        </div>
                        <span class="text-white/90">{$t('secureLogin')}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Side - Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-slate-900">
        <div class="w-full max-w-md space-y-8">
            <!-- Mobile Logo -->
            <div class="lg:hidden text-center">
                <a href="/" class="inline-flex items-center space-x-3 mb-8">
                    <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <span class="text-white font-bold text-xl">E</span>
                    </div>
                    <span class="text-gray-900 dark:text-white text-3xl font-bold">Examtie</span>
                </a>
            </div>

            <!-- Form Header -->
            <div class="text-center">
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {isLogin ? $t('signInToYourAccount') : $t('createNewAccount')}
                </h2>
                <p class="text-gray-600 dark:text-gray-400">
                    {isLogin ? $t('welcomeBack') : $t('getStarted')}
                </p>
            </div>

            <!-- Form Card -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-slate-700">
                <!-- Status Messages -->
                {#if $auth.error}
                    <div class="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl flex items-center space-x-2" role="alert">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p>{$auth.error}</p>
                    </div>
                {/if}
                {#if successMessage}
                    <div class="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl flex items-center space-x-2" role="alert">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p>{successMessage}</p>
                    </div>
                {/if}

                <!-- Form -->
                <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                    {#if !isLogin}
                        <!-- Full Name (Signup only) -->
                        <div>
                            <label for="full_name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {$t('fullName')}
                            </label>
                            <div class="relative">
                                <input 
                                    id="full_name" 
                                    name="full_name" 
                                    type="text" 
                                    bind:value={full_name} 
                                    required 
                                    class="w-full px-4 py-3 border {formErrors.full_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl transition-all duration-200"
                                    placeholder={$t('fullNamePlaceholder')}
                                >
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                </div>
                            </div>
                            {#if formErrors.full_name}
                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.full_name}</p>
                            {/if}
                        </div>

                        <!-- Username (Signup only) -->
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {$t('username')}
                            </label>
                            <div class="relative">
                                <input 
                                    id="username" 
                                    name="username" 
                                    type="text" 
                                    bind:value={username} 
                                    required 
                                    class="w-full px-4 py-3 border {formErrors.username ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl transition-all duration-200"
                                    placeholder={$t('usernamePlaceholder')}
                                >
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                </div>
                            </div>
                            {#if formErrors.username}
                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.username}</p>
                            {:else if username.length > 0 && (username.length < 3 || username.length > 30)}
                                <p class="mt-1 text-sm text-amber-600 dark:text-amber-400">{$t('usernameLength')}</p>
                            {/if}
                        </div>
                    {/if}

                    <!-- Email (Login and Signup) -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {$t('emailAddress')}
                        </label>
                        <div class="relative">
                            <input 
                                id="email" 
                                name="email" 
                                type="email" 
                                autocomplete="email" 
                                bind:value={email} 
                                required 
                                class="w-full px-4 py-3 border {formErrors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl transition-all duration-200"
                                placeholder={$t('emailAddress')}
                            >
                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                                </svg>
                            </div>
                        </div>
                        {#if formErrors.email}
                            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                        {/if}
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {$t('password')}
                        </label>
                        <div class="relative">
                            <input 
                                id="password" 
                                name="password" 
                                type={showPassword ? 'text' : 'password'}
                                autocomplete="current-password" 
                                bind:value={password} 
                                required 
                                class="w-full px-4 py-3 pr-12 border {formErrors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl transition-all duration-200"
                                placeholder={$t('passwordPlaceholder')}
                            >
                            <div class="absolute inset-y-0 right-0 flex items-center">
                                <button 
                                    type="button"
                                    on:click={togglePasswordVisibility}
                                    class="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300 transition-colors"
                                >
                                    {#if showPassword}
                                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878a3 3 0 000 4.243m4.242-4.243L16.536 8.464M14.12 14.12l1.414 1.414M14.12 14.12a3 3 0 01-4.243 0"></path>
                                        </svg>
                                    {:else}
                                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                    {/if}
                                </button>
                            </div>
                        </div>
                        {#if formErrors.password}
                            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
                        {:else if !isLogin && password.length > 0 && password.length < 8}
                            <p class="mt-1 text-sm text-amber-600 dark:text-amber-400">{$t('passwordRequirements')}</p>
                        {/if}
                    </div>

                    <!-- Submit Button -->
                    <button 
                        type="submit" 
                        class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:from-blue-600 disabled:hover:to-purple-600"
                        disabled={loading || (!isLogin && (!email || !password || !full_name || !username)) || (isLogin && (!email || !password))}
                    >
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
                </form>

                <!-- Toggle Form -->
                <div class="mt-8 text-center">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? $t('needAnAccount') : $t('alreadyHaveAccount')}
                        <button 
                            on:click={toggleForm} 
                            class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors ml-1"
                        >
                            {isLogin ? $t('register') : $t('signIn')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Enhanced focus styles */
    input:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    /* Smooth transitions */
    * {
        transition: all 0.2s ease-in-out;
    }
</style>
