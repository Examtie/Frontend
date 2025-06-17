<script lang="ts">
	import { currentLanguage } from '../../lib/stores/language.js';
	import { switchLanguage } from '../../lib/i18n.js';
	import { t } from '../../lib/i18n.js';
	import { auth } from '../../lib/stores/auth'; // Import the auth store
	import ThemeToggle from './ThemeToggle.svelte'; // Assuming you have this or similar

	let { class: className = '' } = $props();
	let isMenuOpen = $state(false);
	let isLanguageDropdownOpen = $state(false);

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function toggleLanguageDropdown() {
		isLanguageDropdownOpen = !isLanguageDropdownOpen;
	}

	function selectLanguage(lang: 'en' | 'th') {
		switchLanguage(lang);
		isLanguageDropdownOpen = false;
		closeMenu(); // Close mobile menu if language is changed from there
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.language-dropdown')) {
			isLanguageDropdownOpen = false;
		}
	}

	function handleLogout() {
		auth.logout();
		closeMenu();
	}
</script>

<svelte:window on:click={handleClickOutside} />

<!-- Dark header matching Figma design -->
<header class="bg-stone-900 border-b border-gray-700/40 relative z-50 {className}">
	<nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-[69px]">
			<!-- Logo -->
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-3">
					<div class="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
						<span class="text-white font-bold text-lg">E</span>
					</div>
					<span class="text-sky-200 text-4xl font-bold">Examtie</span>
				</a>
			</div>

			<!-- Navigation Links - Center -->
			<div class="hidden md:flex items-center space-x-10">
				<a href="/" class="text-white font-medium hover:text-blue-300 transition-colors">
					{$t('home')}
				</a>
				<a href="/quiz" class="text-gray-300 hover:text-white transition-colors">
					{$t('quiz')}
				</a>
				<a href="/marketplace" class="text-gray-300 hover:text-white transition-colors">
					{$t('marketplace')}
				</a>
				{#if $auth.isAuthenticated && $auth.user?.roles.includes('admin')}
					<a href="/admin" class="text-gray-300 hover:text-white transition-colors">
						{$t('admin')}
					</a>
				{/if}
			</div>

			<!-- Right side - Search, Language, Login/User -->
			<div class="flex items-center space-x-4">
				<!-- Search Bar -->
				<div class="hidden md:flex items-center bg-stone-800 border border-gray-600/60 rounded-2xl px-4 py-2 min-w-[200px]">
					<svg class="w-4 h-4 text-stone-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
					<input 
						type="text" 
						placeholder={$t('search')}
						class="bg-transparent text-stone-200 text-sm flex-1 outline-none border-0"
					/>
				</div>

				<!-- Language Dropdown -->
				<div class="hidden md:block relative language-dropdown">
					<button 
						onclick={toggleLanguageDropdown}
						class="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-stone-700/50"
					>
						<span class="text-sm">
							{$currentLanguage === 'en' ? '🇬🇧' : '🇹🇭'} {$currentLanguage.toUpperCase()}
						</span>
						<svg class="w-4 h-4 transition-transform duration-200 {isLanguageDropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</button>
					
					{#if isLanguageDropdownOpen}
						<div class="absolute right-0 mt-2 w-36 bg-stone-800 border border-gray-700 rounded-lg shadow-xl py-1">
							<button onclick={() => selectLanguage('en')} class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-stone-700 hover:text-white transition-colors">🇬🇧 English</button>
							<button onclick={() => selectLanguage('th')} class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-stone-700 hover:text-white transition-colors">🇹🇭 ไทย</button>
						</div>
					{/if}
				</div>

				<!-- Login/User Button -->
				{#if $auth.isAuthenticated && $auth.user}
					<div class="hidden md:flex items-center space-x-2">
						<a href="/profile" class="flex items-center text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-stone-700/50">
							{#if $auth.user.profile_image}
								<img src={$auth.user.profile_image} alt="User" class="w-6 h-6 rounded-full mr-2" />
							{:else}
								<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
							{/if}
							<span class="text-sm">{$auth.user.username}</span>
						</a>
						<button 
							onclick={handleLogout}
							class="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
						>
							<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
							{$t('logout')}
						</button>
					</div>
				{:else}
					<a href="/login" class="hidden md:flex items-center bg-black border border-gray-600 text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
						</svg>
						{$t('login')}
					</a>
				{/if}

				<!-- Mobile menu button -->
				<button onclick={toggleMenu} class="md:hidden p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
					</svg>
				</button>
			</div>
		</div>

		<!-- Mobile Navigation -->
		{#if isMenuOpen}
			<div class="md:hidden absolute top-[69px] left-0 right-0 bg-stone-800 border-b border-gray-700/40 shadow-lg">
				<div class="px-4 py-4 space-y-4">
					<a href="/" onclick={closeMenu} class="block text-white hover:text-blue-300 transition-colors py-2">{$t('home')}</a>
					<a href="/quiz" onclick={closeMenu} class="block text-gray-300 hover:text-white transition-colors py-2">{$t('quiz')}</a>
					<a href="/marketplace" onclick={closeMenu} class="block text-gray-300 hover:text-white transition-colors py-2">{$t('marketplace')}</a>
					{#if $auth.isAuthenticated && $auth.user?.roles.includes('admin')}
						<a href="/admin" onclick={closeMenu} class="block text-gray-300 hover:text-white transition-colors py-2">{$t('admin')}</a>
					{/if}
					
					<!-- Mobile Language Switcher -->
					<div class="pt-2">
						<h3 class="text-sm font-semibold text-gray-400 mb-2">{$t('language')}</h3>
						<button onclick={() => selectLanguage('en')} class="w-full text-left py-2 text-gray-300 hover:text-white transition-colors">🇬🇧 English</button>
						<button onclick={() => selectLanguage('th')} class="w-full text-left py-2 text-gray-300 hover:text-white transition-colors">🇹🇭 ไทย</button>
					</div>
					
					<div class="pt-4 border-t border-gray-700 space-y-3">
						{#if $auth.isAuthenticated && $auth.user}
							<a href="/profile" onclick={closeMenu} class="flex items-center text-gray-300 hover:text-white transition-colors py-2">
								{#if $auth.user.profile_image}
									<img src={$auth.user.profile_image} alt="User" class="w-6 h-6 rounded-full mr-2" />
								{:else}
									<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
								{/if}
								{$auth.user.username}
							</a>
							<button 
								onclick={handleLogout} 
								class="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors text-sm"
							>
								<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
								{$t('logout')}
							</button>
						{:else}
							<a href="/login" onclick={closeMenu} class="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors">{$t('login')}</a>
							<a href="/register" onclick={closeMenu} class="block w-full text-center bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg transition-colors mt-2">{$t('register')}</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</nav>
</header>
