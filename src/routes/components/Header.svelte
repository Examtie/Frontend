<script lang="ts">
	import { currentLanguage } from '../../lib/stores/language.js';
	import { switchLanguage } from '../../lib/i18n.js';
	import { t } from '../../lib/i18n.js';
	import { auth } from '../../lib/stores/auth';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { class: className = '' } = $props();
	let isMenuOpen = $state(false);
	let isLanguageDropdownOpen = $state(false);
	let isUserDropdownOpen = $state(false);
	let isMobileSearchOpen = $state(false);
	let searchValue = $state('');

	// Performance optimization - debounce search
	let searchTimeout: number;
	
	function handleSearch(value: string) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			// Implement actual search functionality here
			console.log('Searching for:', value);
		}, 300);
	}

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
		// Close other dropdowns when opening menu
		if (isMenuOpen) {
			isLanguageDropdownOpen = false;
			isUserDropdownOpen = false;
			isMobileSearchOpen = false;
		}
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function toggleLanguageDropdown() {
		isLanguageDropdownOpen = !isLanguageDropdownOpen;
		// Close other dropdowns
		if (isLanguageDropdownOpen) {
			isUserDropdownOpen = false;
			isMenuOpen = false;
		}
	}

	function toggleUserDropdown() {
		isUserDropdownOpen = !isUserDropdownOpen;
		// Close other dropdowns
		if (isUserDropdownOpen) {
			isLanguageDropdownOpen = false;
			isMenuOpen = false;
		}
	}

	function toggleMobileSearch() {
		isMobileSearchOpen = !isMobileSearchOpen;
	}

	function selectLanguage(lang: 'en' | 'th') {
		switchLanguage(lang);
		isLanguageDropdownOpen = false;
		closeMenu();
	}

	// Enhanced click outside handler
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.language-dropdown')) {
			isLanguageDropdownOpen = false;
		}
		if (!target.closest('.user-dropdown')) {
			isUserDropdownOpen = false;
		}
		if (!target.closest('.mobile-search') && !target.closest('.mobile-search-toggle')) {
			isMobileSearchOpen = false;
		}
	}

	function handleLogout() {
		auth.logout();
		closeMenu();
		isUserDropdownOpen = false;
	}

	// Check if current route is active
	function isActiveRoute(route: string): boolean {
		if (typeof window === 'undefined') return false;
		return window.location.pathname === route;
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		// Escape key closes all dropdowns
		if (event.key === 'Escape') {
			isMenuOpen = false;
			isLanguageDropdownOpen = false;
			isUserDropdownOpen = false;
			isMobileSearchOpen = false;
		}
		// Cmd/Ctrl + K opens search
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			if (window.innerWidth >= 1024) {
				// Focus desktop search
				const searchInput = document.querySelector('.desktop-search input') as HTMLInputElement;
				searchInput?.focus();
			} else {
				// Toggle mobile search
				toggleMobileSearch();
			}
		}
	}

	onMount(() => {
		// Add keyboard event listener
		document.addEventListener('keydown', handleKeydown);
		
		return () => {
			document.removeEventListener('keydown', handleKeydown);
			clearTimeout(searchTimeout);
		};
	});
</script>

<svelte:window onclick={handleClickOutside} />

<!-- Modern dark header with enhanced UI -->
<!-- Modern responsive header with enhanced UI -->
<header class="sticky top-0 bg-gradient-to-r from-slate-900 via-stone-900 to-slate-900 border-b border-gray-700/30 backdrop-blur-lg relative z-50 shadow-lg {className}">
	<nav class="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
		<div class="flex justify-between items-center h-12 sm:h-14">
			<!-- Enhanced Logo with better responsive sizing -->
			<div class="flex items-center min-w-0 flex-shrink-0">
				<a href="/" class="flex items-center space-x-2 sm:space-x-3 group">
					<div class="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105">
						<span class="text-white font-bold text-base sm:text-lg">E</span>
					</div>
					<span class="text-sky-100 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight group-hover:text-white transition-colors duration-300 truncate">
						Examtie
					</span>
				</a>
			</div>

			<!-- Enhanced Navigation Links - Center (Desktop only) -->
			<div class="hidden lg:flex items-center space-x-6 xl:space-x-8">
				<a href="/" class="relative text-{isActiveRoute('/') ? 'blue-300' : 'gray-300'} font-medium hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>{$t('home')}</span>
					<div class="absolute bottom-0 left-0 {isActiveRoute('/') ? 'w-full' : 'w-0'} h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a href="/exams" class="relative text-{isActiveRoute('/exams') ? 'blue-300' : 'gray-300'} font-medium hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>{$t('exams')}</span>
					<div class="absolute bottom-0 left-0 {isActiveRoute('/exams') ? 'w-full' : 'w-0'} h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a href="/marketplace" class="relative text-{isActiveRoute('/marketplace') ? 'blue-300' : 'gray-300'} font-medium hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>{$t('marketplace')}</span>
					<div class="absolute bottom-0 left-0 {isActiveRoute('/marketplace') ? 'w-full' : 'w-0'} h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a href="/flashcards" class="relative text-{isActiveRoute('/flashcards') ? 'blue-300' : 'gray-300'} font-medium hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
					<span>Flashcards</span>
					<div class="absolute bottom-0 left-0 {isActiveRoute('/flashcards') ? 'w-full' : 'w-0'} h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
				</a>
				{#if $auth.isAuthenticated && $auth.user?.roles.includes('admin')}
					<a href="/admin" class="relative text-{isActiveRoute('/admin') ? 'blue-300' : 'gray-300'} font-medium hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/5 group">
						<span>{$t('admin')}</span>
						<div class="absolute bottom-0 left-0 {isActiveRoute('/admin') ? 'w-full' : 'w-0'} h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></div>
					</a>
				{/if}
			</div>

			<!-- Enhanced Right side - Search, Language, Login/User -->
			<div class="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0">
				<!-- Mobile Search Toggle -->
				<button
					onclick={toggleMobileSearch}
					class="lg:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 transition-all duration-300 mobile-search-toggle"
					aria-label="Toggle search"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
				</button>
				
				<!-- Enhanced Desktop Search Bar -->
				<div class="hidden lg:flex items-center bg-slate-800/60 border border-gray-600/40 rounded-xl px-4 py-2.5 min-w-[200px] xl:min-w-[280px] backdrop-blur-sm hover:border-gray-500/60 focus-within:border-blue-500/50 transition-all duration-300 group desktop-search">
					<svg class="w-4 h-4 text-gray-400 mr-3 group-focus-within:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
					<input 
						type="text" 
						bind:value={searchValue}
						oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
						placeholder={$t('search')}
						class="bg-transparent text-gray-200 placeholder-gray-400 text-sm flex-1 outline-none border-0 focus:placeholder-gray-500 transition-colors min-w-0"
					/>
					<kbd class="hidden xl:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-700/50 border border-gray-600/50 rounded-md ml-2 flex-shrink-0">⌘K</kbd>
				</div>

				<!-- Enhanced Language Dropdown -->
				<div class="hidden md:block relative language-dropdown">
					<button 
						onclick={toggleLanguageDropdown}
						class="flex items-center space-x-1 sm:space-x-2 text-gray-300 hover:text-white transition-all duration-300 cursor-pointer px-2 sm:px-3 py-2.5 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 backdrop-blur-sm group"
						aria-label="Select language"
						aria-expanded={isLanguageDropdownOpen}
					>
						<span class="text-sm font-medium">
							{$currentLanguage === 'en' ? '🇬🇧' : '🇹🇭'} 
							<span class="hidden sm:inline">{$currentLanguage.toUpperCase()}</span>
						</span>
						<svg class="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:text-blue-400 {isLanguageDropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</button>
					
					{#if isLanguageDropdownOpen}
						<div class="absolute right-0 mt-2 w-36 sm:w-40 bg-slate-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
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
					<div class="hidden md:block relative user-dropdown">
						<button
							onclick={toggleUserDropdown}
							class="flex items-center text-gray-300 hover:text-white transition-all duration-300 px-2 sm:px-3 py-2.5 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 backdrop-blur-sm group"
							aria-label="User menu"
							aria-expanded={isUserDropdownOpen}
						>
							{#if $auth.user.profile_image}
								<img src={$auth.user.profile_image} alt="User" class="w-6 h-6 sm:w-7 sm:h-7 rounded-full mr-2 ring-2 ring-transparent group-hover:ring-blue-400/30 transition-all duration-300" />
							{:else}
								<div class="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2 ring-2 ring-transparent group-hover:ring-blue-400/30 transition-all duration-300">
									<span class="text-white text-xs font-medium">{$auth.user.username.charAt(0).toUpperCase()}</span>
								</div>
							{/if}
							<span class="text-sm font-medium truncate max-w-[100px] sm:max-w-none">{$auth.user.username}</span>
							<svg class="w-3 h-3 ml-1 transition-transform duration-300 group-hover:text-blue-400 {isUserDropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
							</svg>
						</button>

						{#if isUserDropdownOpen}
							<div class="absolute right-0 mt-2 w-48 sm:w-56 bg-slate-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
								<!-- User Info Header -->
								<div class="px-4 py-3 border-b border-gray-700/50">
									<div class="flex items-center space-x-3">
										{#if $auth.user.profile_image}
											<img src={$auth.user.profile_image} alt="User" class="w-10 h-10 rounded-full ring-2 ring-blue-400/30" />
										{:else}
											<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
												<span class="text-white text-sm font-medium">{$auth.user.username.charAt(0).toUpperCase()}</span>
											</div>
										{/if}
										<div class="flex-1 min-w-0">
											<div class="font-medium text-white truncate">{$auth.user.username}</div>
											<div class="text-xs text-gray-400 truncate">{$auth.user.email}</div>
										</div>
									</div>
								</div>
								
								<!-- Menu Items -->
								<a href="/profile" class="flex items-center px-4 py-3 text-sm text-gray-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200">
									<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
									</svg>
									Profile
								</a>
								<a href="/settings" class="flex items-center px-4 py-3 text-sm text-gray-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200">
									<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
									</svg>
									Settings
								</a>
								<div class="border-t border-gray-700/50 my-1"></div>
								<button 
									onclick={handleLogout}
									class="w-full flex items-center px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
								>
									<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
									</svg>
									{$t('logout')}
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<a href={`/login?redirect=${$page.url.pathname}`} class="hidden md:flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-6 py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 backdrop-blur-sm group text-sm font-medium">
						<svg class="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
						</svg>
						<span>{$t('login')}</span>
					</a>
				{/if}

				<!-- Enhanced Mobile menu button -->
				<button 
					onclick={toggleMenu} 
					aria-label="Toggle navigation menu"
					class="lg:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-gray-600/40 transition-all duration-300 backdrop-blur-sm"
				>
					<svg class="w-6 h-6 transform transition-transform duration-300 {isMenuOpen ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if isMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Mobile Search Bar -->
		{#if isMobileSearchOpen}
			<div class="lg:hidden px-4 pb-4 mobile-search animate-slide-down">
				<div class="flex items-center bg-slate-700/50 border border-gray-600/40 rounded-xl px-4 py-3 backdrop-blur-sm">
					<svg class="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
					<input 
						type="text"
						bind:value={searchValue}
						oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
						placeholder={$t('search')}
						class="bg-transparent text-gray-200 placeholder-gray-400 text-sm flex-1 outline-none border-0 min-w-0"
					/>
					<button
						onclick={toggleMobileSearch}
						class="ml-2 p-1 text-gray-400 hover:text-gray-200 transition-colors"
						aria-label="Close search"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>
			</div>
		{/if}

		<!-- Enhanced Mobile Navigation -->
		{#if isMenuOpen}
			<div class="lg:hidden mobile-menu absolute top-16 sm:top-[72px] left-0 right-0 bg-slate-800/95 backdrop-blur-xl border-b border-gray-700/30 shadow-2xl z-40 animate-slide-down max-h-[80vh] overflow-y-auto">
				<div class="px-4 sm:px-6 py-6 space-y-1">
					<!-- Navigation Links with better touch targets -->
					<div class="space-y-2">
						<a href="/" onclick={closeMenu} class="flex items-center text-{isActiveRoute('/') ? 'blue-300' : 'gray-300'} hover:text-white transition-all duration-300 py-4 px-4 rounded-xl hover:bg-slate-700/50 {isActiveRoute('/') ? 'bg-blue-500/20' : ''} group">
							<span class="font-medium text-base">{$t('home')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>
						<a href="/exams" onclick={closeMenu} class="flex items-center text-{isActiveRoute('/exams') ? 'blue-300' : 'gray-300'} hover:text-white transition-all duration-300 py-4 px-4 rounded-xl hover:bg-slate-700/50 {isActiveRoute('/exams') ? 'bg-blue-500/20' : ''} group">
							<span class="font-medium text-base">{$t('exams')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>
						<a href="/marketplace" onclick={closeMenu} class="flex items-center text-{isActiveRoute('/marketplace') ? 'blue-300' : 'gray-300'} hover:text-white transition-all duration-300 py-4 px-4 rounded-xl hover:bg-slate-700/50 {isActiveRoute('/marketplace') ? 'bg-blue-500/20' : ''} group">
							<span class="font-medium text-base">{$t('marketplace')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>
						<a href="/flashcards" onclick={closeMenu} class="flex items-center text-{isActiveRoute('/flashcards') ? 'blue-300' : 'gray-300'} hover:text-white transition-all duration-300 py-4 px-4 rounded-xl hover:bg-slate-700/50 {isActiveRoute('/flashcards') ? 'bg-blue-500/20' : ''} group">
							<span class="font-medium text-base">{$t('flashcards')}</span>
							<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</a>	
						{#if $auth.isAuthenticated && $auth.user?.roles.includes('admin')}
							<a href="/admin" onclick={closeMenu} class="flex items-center text-{isActiveRoute('/admin') ? 'blue-300' : 'gray-300'} hover:text-white transition-all duration-300 py-4 px-4 rounded-xl hover:bg-slate-700/50 {isActiveRoute('/admin') ? 'bg-blue-500/20' : ''} group">
								<span class="font-medium text-base">{$t('admin')}</span>
								<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</a>
						{/if}
					</div>
					
					<!-- Mobile Language Switcher with improved spacing -->
					<div class="pt-6 border-t border-gray-700/50">
						<h3 class="text-sm font-semibold text-gray-400 mb-4 px-4">{$t('language')}</h3>
						<div class="space-y-2">
							<button onclick={() => selectLanguage('en')} class="w-full text-left py-3 px-4 text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300 rounded-xl flex items-center space-x-3">
								<span class="text-lg">🇬🇧</span><span class="font-medium">English</span>
								{#if $currentLanguage === 'en'}
									<svg class="w-4 h-4 ml-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								{/if}
							</button>
							<button onclick={() => selectLanguage('th')} class="w-full text-left py-3 px-4 text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300 rounded-xl flex items-center space-x-3">
								<span class="text-lg">🇹🇭</span><span class="font-medium">ไทย</span>
								{#if $currentLanguage === 'th'}
									<svg class="w-4 h-4 ml-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								{/if}
							</button>
						</div>
					</div>
					
					<!-- Enhanced Mobile User/Auth Section -->
					<div class="pt-6 border-t border-gray-700/50 space-y-3">
						{#if $auth.isAuthenticated && $auth.user}
							<!-- User Profile Card -->
							<div class="bg-slate-700/30 rounded-xl p-4 mb-4">
								<div class="flex items-center space-x-3">
									{#if $auth.user.profile_image}
										<img src={$auth.user.profile_image} alt="User" class="w-12 h-12 rounded-full ring-2 ring-blue-400/30" />
									{:else}
										<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
											<span class="text-white text-lg font-medium">{$auth.user.username.charAt(0).toUpperCase()}</span>
										</div>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="font-semibold text-white truncate">{$auth.user.username}</div>
										<div class="text-sm text-gray-400 truncate">{$auth.user.email}</div>
									</div>
								</div>
							</div>
							
							<a href="/profile" onclick={closeMenu} class="flex items-center text-gray-300 hover:text-white transition-all duration-300 py-4 px-4 rounded-xl hover:bg-slate-700/50 group">
								<svg class="w-5 h-5 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
								</svg>
								<span class="font-medium">View Profile</span>
								<svg class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</a>
							
							<button 
								onclick={handleLogout} 
								class="w-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 px-4 py-4 rounded-xl transition-all duration-300 backdrop-blur-sm group"
							>
								<svg class="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
								</svg>
								<span class="font-medium">{$t('logout')}</span>
							</button>
						{:else}
							<a href={`/login?redirect=${$page.url.pathname}`} onclick={closeMenu} class="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 backdrop-blur-sm font-medium">
								{$t('login')}
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</nav>
</header>

<style lang="postcss">
	/* Enhanced animations and responsive improvements */
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
	
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	
	.animate-slide-down {
		animation: slide-down 0.2s ease-out;
	}
	
	.animate-fade-in {
		animation: fade-in 0.15s ease-out;
	}
	
	/* Enhanced focus styles for accessibility */
	input:focus {
		outline: none;
	}
	
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid rgb(59 130 246);
		outline-offset: 2px;
	}
	
	/* Smooth transitions for all interactive elements */
	button, a {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Improved scrollbar for mobile menu */
	.mobile-menu::-webkit-scrollbar {
		width: 4px;
	}
	
	.mobile-menu::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.mobile-menu::-webkit-scrollbar-thumb {
		background: rgba(100, 116, 139, 0.5);
		border-radius: 2px;
	}
	
	.mobile-menu::-webkit-scrollbar-thumb:hover {
		background: rgba(100, 116, 139, 0.7);
	}
	
	/* Backdrop blur support fallback */
	@supports not (backdrop-filter: blur(12px)) {
		.backdrop-blur-sm {
			background-color: rgba(51, 65, 85, 0.9);
		}
		.backdrop-blur-lg {
			background-color: rgba(51, 65, 85, 0.95);
		}
		.backdrop-blur-xl {
			background-color: rgba(51, 65, 85, 0.98);
		}
	}
	
	/* Better touch targets for mobile */
	@media (max-width: 1024px) {
		button, a {
			min-height: 44px;
			min-width: 44px;
		}
	}
	
	/* Responsive typography adjustments */
	@media (max-width: 640px) {
		.truncate {
			max-width: 120px;
		}
	}
</style>