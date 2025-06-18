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

<!-- Modern dark header with enhanced UI -->
<header class="bg-gradient-to-r from-slate-900 via-stone-900 to-slate-900 border-b border-gray-700/30 backdrop-blur-lg relative z-50 shadow-lg {className}">
	<nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-[72px]">
			<!-- Enhanced Logo -->
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-3 group">
					<div class="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105">
						<span class="text-white font-bold text-lg">E</span>
					</div>
					<span class="text-sky-100 text-3xl font-bold tracking-tight group-hover:text-white transition-colors duration-300">Examtie</span>
				</a>
			</div>

			<!-- Enhanced Navigation Links - Center -->
			<div class="hidden md:flex items-center space-x-8">
				<a href="/" class="relative text-white font-medium hover:text-blue-300 transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>{$t('home')}</span>
					<div class="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a href="/quiz" class="relative text-gray-300 hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>{$t('quiz')}</span>
					<div class="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a href="/marketplace" class="relative text-gray-300 hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>{$t('marketplace')}</span>
					<div class="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				{#if $auth.isAuthenticated && $auth.user?.roles.includes('admin')}
					<a href="/admin" class="relative text-gray-300 hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
						<span>{$t('admin')}</span>
						<div class="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
					</a>
				{/if}
			</div>

			<!-- Enhanced Right side - Search, Language, Login/User -->
			<div class="flex items-center space-x-3">
				<!-- Enhanced Search Bar -->
				<div class="hidden lg:flex items-center bg-slate-800/50 border border-gray-600/40 rounded-xl px-4 py-2.5 min-w-[240px] backdrop-blur-sm hover:border-gray-500/60 transition-all duration-300 group">
					<svg class="w-4 h-4 text-gray-400 mr-3 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
					<input 
						type="text" 
						placeholder={$t('search')}
						class="bg-transparent text-gray-200 placeholder-gray-400 text-sm flex-1 outline-none border-0 focus:placeholder-gray-500 transition-colors"
					/>
					<kbd class="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-700/50 border border-gray-600/50 rounded-md">⌘K</kbd>
				</div>

				<!-- Enhanced Language Dropdown -->
				<div class="hidden md:block relative language-dropdown">
					<button 
						onclick={toggleLanguageDropdown}
						class="flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300 cursor-pointer px-3 py-2.5 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 backdrop-blur-sm group"
					>
						<span class="text-sm font-medium">
							{$currentLanguage === 'en' ? '🇬🇧' : '🇹🇭'} {$currentLanguage.toUpperCase()}
						</span>
						<svg class="w-4 h-4 transition-transform duration-300 group-hover:text-blue-400 {isLanguageDropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</button>
					
					{#if isLanguageDropdownOpen}
						<div class="absolute right-0 mt-2 w-40 bg-slate-800/95 backdrop-blur-lg border border-gray-700/50 rounded-xl shadow-2xl py-2 z-50">
							<button onclick={() => selectLanguage('en')} class="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 flex items-center space-x-2">
								<span>🇬🇧</span><span>English</span>
							</button>
							<button onclick={() => selectLanguage('th')} class="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 flex items-center space-x-2">
								<span>🇹🇭</span><span>ไทย</span>
							</button>
						</div>
					{/if}
				</div>

				<!-- Enhanced Login/User Button -->
				{#if $auth.isAuthenticated && $auth.user}
					<div class="hidden md:flex items-center space-x-3">
						<a href="/profile" class="flex items-center text-gray-300 hover:text-white transition-all duration-300 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 backdrop-blur-sm group">
							{#if $auth.user.profile_image}
								<img src={$auth.user.profile_image} alt="User" class="w-7 h-7 rounded-full mr-2.5 ring-2 ring-transparent group-hover:ring-blue-400/30 transition-all duration-300" />
							{:else}
								<div class="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2.5 ring-2 ring-transparent group-hover:ring-blue-400/30 transition-all duration-300">
									<span class="text-white text-xs font-medium">{$auth.user.username.charAt(0).toUpperCase()}</span>
								</div>
							{/if}
							<span class="text-sm font-medium">{$auth.user.username}</span>
						</a>
						<button 
							onclick={handleLogout}
							class="flex items-center bg-stone-500/10 hover:bg-stone-500/30 border border-stone-500/30 hover:border-stone-500/20 text-stone-300 hover:text-stone-200 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm backdrop-blur-sm group"
						>
							<svg class="w-4 h-4 mr-1.5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
							{$t('logout')}
						</button>
					</div>
				{:else}
					<a href="/login" class="hidden md:flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 backdrop-blur-sm group">
						<svg class="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
						</svg>
						<span class="font-medium">{$t('login')}</span>
					</a>
				{/if}

				<!-- Enhanced Mobile menu button -->
				<button 
					onclick={toggleMenu} 
					aria-label="Toggle navigation menu"
					class="md:hidden p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 transition-all duration-300 backdrop-blur-sm"
				>
					<svg class="w-6 h-6 transform transition-transform duration-300 {isMenuOpen ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if isMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Enhanced Mobile Navigation -->
		{#if isMenuOpen}
			<div class="md:hidden absolute top-[72px] left-0 right-0 bg-slate-800/95 backdrop-blur-lg border-b border-gray-700/30 shadow-2xl z-40 animate-slide-down">
				<div class="px-6 py-6 space-y-1">
					<!-- Mobile Search -->
					<div class="mb-6">
						<div class="flex items-center bg-slate-700/50 border border-gray-600/40 rounded-xl px-4 py-3 backdrop-blur-sm">
							<svg class="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
							</svg>
							<input 
								type="text" 
								placeholder={$t('search')}
								class="bg-transparent text-gray-200 placeholder-gray-400 text-sm flex-1 outline-none border-0"
							/>
						</div>
					</div>

					<!-- Navigation Links -->
					<div class="space-y-1">
						<a href="/" onclick={closeMenu} class="flex items-center text-white hover:text-blue-300 transition-all duration-300 py-3 px-4 rounded-xl hover:bg-slate-700/50 group">
							<span class="font-medium">{$t('home')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>
						<a href="/quiz" onclick={closeMenu} class="flex items-center text-gray-300 hover:text-white transition-all duration-300 py-3 px-4 rounded-xl hover:bg-slate-700/50 group">
							<span class="font-medium">{$t('quiz')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>
						<a href="/marketplace" onclick={closeMenu} class="flex items-center text-gray-300 hover:text-white transition-all duration-300 py-3 px-4 rounded-xl hover:bg-slate-700/50 group">
							<span class="font-medium">{$t('marketplace')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>
						{#if $auth.isAuthenticated && $auth.user?.roles.includes('admin')}
							<a href="/admin" onclick={closeMenu} class="flex items-center text-gray-300 hover:text-white transition-all duration-300 py-3 px-4 rounded-xl hover:bg-slate-700/50 group">
								<span class="font-medium">{$t('admin')}</span>
								<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</a>
						{/if}
					</div>
					
					<!-- Mobile Language Switcher -->
					<div class="pt-4 border-t border-gray-700/50">
						<h3 class="text-sm font-semibold text-gray-400 mb-3 px-4">{$t('language')}</h3>
						<div class="space-y-1">
							<button onclick={() => selectLanguage('en')} class="w-full text-left py-3 px-4 text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300 rounded-xl flex items-center space-x-3">
								<span class="text-lg">��</span><span class="font-medium">English</span>
							</button>
							<button onclick={() => selectLanguage('th')} class="w-full text-left py-3 px-4 text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300 rounded-xl flex items-center space-x-3">
								<span class="text-lg">🇹🇭</span><span class="font-medium">ไทย</span>
							</button>
						</div>
					</div>
					
					<!-- Mobile User/Auth Section -->
					<div class="pt-6 border-t border-gray-700/50 space-y-3">
						{#if $auth.isAuthenticated && $auth.user}
							<a href="/profile" onclick={closeMenu} class="flex items-center text-gray-300 hover:text-white transition-all duration-300 py-3 px-4 rounded-xl hover:bg-slate-700/50 group">
								{#if $auth.user.profile_image}
									<img src={$auth.user.profile_image} alt="User" class="w-8 h-8 rounded-full mr-3 ring-2 ring-transparent group-hover:ring-blue-400/30 transition-all duration-300" />
								{:else}
									<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 ring-2 ring-transparent group-hover:ring-blue-400/30 transition-all duration-300">
										<span class="text-white text-sm font-medium">{$auth.user.username.charAt(0).toUpperCase()}</span>
									</div>
								{/if}
								<div class="flex-1">
									<div class="font-medium">{$auth.user.username}</div>
									<div class="text-xs text-gray-400">View Profile</div>
								</div>
								<svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</a>
							<button 
								onclick={handleLogout} 
								class="w-full flex items-center justify-center bg-stone-500/20 hover:bg-stone-500/30 border border-stone-500/30 hover:border-stone-500/50 text-stone-300 hover:text-stone-200 px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm group"
							>
								<svg class="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
								<span class="font-medium">{$t('logout')}</span>
							</button>
						{:else}
							<a href="/login" onclick={closeMenu} class="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 backdrop-blur-sm">
								<span class="font-medium">{$t('login')}</span>
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</nav>
</header>

<style>
	/* Custom animations for enhanced UI */
	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-slide-down {
		animation: slide-down 0.2s ease-out;
	}
	
	/* Enhanced focus styles */
	input:focus {
		outline: none;
	}
	
	/* Smooth transitions for all interactive elements */
	button, a {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Backdrop blur support fallback */
	@supports not (backdrop-filter: blur(12px)) {
		.backdrop-blur-sm {
			background-color: rgba(51, 65, 85, 0.9);
		}
		.backdrop-blur-lg {
			background-color: rgba(51, 65, 85, 0.95);
		}
	}
</style>