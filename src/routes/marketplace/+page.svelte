<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { t } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';

	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
	import SearchBar from '../components/SearchBar.svelte';

	// Updated interface to match API response
	interface MarketItem {
		id: string;
		name: string;
		description: string | null;
		price: number;
		image_url: string | null;
	}

	let items: MarketItem[] = [];
	let isLoading = true;
	let error: string | null = null;
	let searchValue = '';

	// Interactive elements for homepage-style effects
	let mousePosition = { x: 0, y: 0 };
	let isMobile = false;
	let screenWidth = 0;

	const baseApiUrl = import.meta.env.VITE_API_BASE_URL || '/api';

	// Floating particles data
	const particles = Array.from({ length: 30 }, (_, i) => ({
		id: i,
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: Math.random() * 4 + 2,
		delay: Math.random() * 5
	}));

	async function fetchMarketItems(searchTerm = '') {
		isLoading = true;
		error = null;
		try {
			let url: string;
			if (searchTerm) {
				url = `${baseApiUrl}/market/api/v1/items/search?keyword=${encodeURIComponent(searchTerm)}`;
			} else {
				url = `${baseApiUrl}/market/api/v1/items`;
			}

			const token = get(auth).token;
			const headers: HeadersInit = {};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(url, { headers });

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication required. Please log in to view marketplace items.');
				}
				const errorData: any = await response.json().catch(() => ({ detail: response.statusText }));
				throw new Error(errorData.detail || `Failed to fetch market items`);
			}
			const data: MarketItem[] = await response.json();
			items = Array.isArray(data) ? data : [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	function handleSearch(searchTerm: string) {
		searchValue = searchTerm;
		fetchMarketItems(searchTerm);
	}

	// View item functionality
	async function viewItem(itemId: string) {
		try {
			const token = get(auth).token;
			const headers: HeadersInit = {};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(`${baseApiUrl}/market/api/v1/items/${itemId}`, { headers });
			
			if (!response.ok) {
				throw new Error('Failed to fetch item details');
			}
			
			const itemDetails: MarketItem = await response.json();
			
			// For now, show an alert with item details
			// In a real app, you'd open a modal or navigate to a detail page
			alert(`Item Details:\n\nName: ${itemDetails.name}\nPrice: ${itemDetails.price === 0 ? 'Free' : `฿${itemDetails.price.toLocaleString()}`}\nDescription: ${itemDetails.description || 'No description available'}`);
			
		} catch (error) {
			console.error('Error viewing item:', error);
			alert('Failed to load item details. Please try again.');
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isMobile) {
			mousePosition.x = (event.clientX / window.innerWidth) * 100;
			mousePosition.y = (event.clientY / window.innerHeight) * 100;
		}
	}

	function checkMobile() {
		isMobile = screenWidth < 768;
	}

	onMount(() => {
		fetchMarketItems();
		
		// Screen width tracking
		function updateScreenWidth() {
			screenWidth = window.innerWidth;
			checkMobile();
		}
		
		updateScreenWidth();
		window.addEventListener('resize', updateScreenWidth);
		
		return () => {
			window.removeEventListener('resize', updateScreenWidth);
		};
	});
</script>

<svelte:head>
	<title>{$t('marketplaceTitle')}</title>
	<meta name="description" content={$t('marketplaceDescription')} />
</svelte:head>

<Header />

<main class="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white min-h-screen" on:mousemove={handleMouseMove}>
	<!-- Compact Hero Section -->
	<section class="relative min-h-[40vh] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
		<!-- Sophisticated Background with Interactive Elements -->
		<div class="absolute inset-0">
			<!-- Primary gradient overlay -->
			<div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
			
			<!-- Dynamic Floating Particles -->
			{#each particles.slice(0, 15) as particle}
				<div 
					class="absolute w-{particle.size} h-{particle.size} bg-gradient-to-br from-blue-400/20 to-purple-400/10 rounded-full blur-sm animate-float" 
					style="left: {particle.x}%; top: {particle.y}%; animation-delay: {particle.delay}s"
				></div>
			{/each}
			
			<!-- Additional decorative elements -->
			<div class="absolute top-10 left-10 w-16 h-16 bg-blue-500/10 rounded-full animate-pulse"></div>
			<div class="absolute bottom-8 right-16 w-20 h-20 bg-purple-500/5 rounded-full animate-bounce delay-300"></div>
		</div>
		
		<!-- Compact Hero Content -->
		<div class="relative flex items-center justify-center min-h-[40vh] px-4 sm:px-6 lg:px-8">
			<div class="text-center max-w-4xl mx-auto">
				<!-- Enhanced Badge -->
				<div class="inline-flex items-center px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white/90 rounded-full text-sm font-medium mb-4 border border-white/20">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
					</svg>
					Educational Marketplace
				</div>
				
				<!-- Compact Main Heading -->
				<h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
					Discover Premium
					<span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent block sm:inline">
						Educational Content
					</span>
				</h1>
				
				<p class="text-base sm:text-lg lg:text-xl text-blue-100 mb-6 max-w-2xl mx-auto leading-relaxed">
					{$t('marketplaceSubheader') || 'Discover high-quality educational content from verified creators'}
				</p>
				
				<!-- Compact Stats -->
				<div class="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
					<div class="flex items-center text-green-300">
						<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						Verified
					</div>
					<div class="flex items-center text-blue-300">
						<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
						</svg>
						Instant Access
					</div>
					<div class="flex items-center text-purple-300">
						<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
						</svg>
						Community
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Enhanced Search and Content Section -->
	<section class="py-12 lg:py-20 px-4 sm:px-6 lg:px-8 relative">
		<!-- Background decoration -->
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent"></div>
		
		<div class="max-w-7xl mx-auto relative">
			<!-- Enhanced Search Section -->
			<div class="mb-12 max-w-2xl mx-auto">
				<div class="bg-slate-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
					<SearchBar onSearch={handleSearch} />
					{#if searchValue}
						<div class="mt-4 text-center">
							<span class="text-sm text-gray-400">Searching for: </span>
							<span class="text-sm text-blue-300 font-medium">"{searchValue}"</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Content States -->
			{#if isLoading}
				<div class="text-center py-20">
					<div class="relative">
						<div class="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto"></div>
						<div class="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-b-purple-400 rounded-full animate-spin mx-auto" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
					</div>
					<p class="mt-6 text-lg text-gray-300">Loading marketplace items...</p>
					<p class="mt-2 text-sm text-gray-500">Discovering amazing content for you</p>
				</div>
			{:else if error}
				<div class="text-center py-16">
					<div class="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl p-8 max-w-2xl mx-auto">
						<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
						</div>
						<h3 class="text-2xl font-bold text-red-300 mb-2">Oops! Something went wrong</h3>
						<p class="text-red-200 mb-4">{error}</p>
						<button 
							on:click={() => fetchMarketItems(searchValue)}
							class="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-6 py-2 rounded-lg transition-colors"
						>
							Try Again
						</button>
					</div>
				</div>
			{:else if items.length === 0}
				<div class="text-center py-20">
					<div class="w-24 h-24 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
						</svg>
					</div>
					<h3 class="text-2xl font-semibold text-gray-300 mb-2">
						{searchValue ? 'No results found' : ($t('marketplaceNoItems') || 'No items available')}
					</h3>
					<p class="text-gray-400 mb-6">
						{searchValue ? 'Try adjusting your search terms or browse all items' : 'Check back later for new content!'}
					</p>
					{#if searchValue}
						<button 
							on:click={() => handleSearch('')}
							class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors font-medium"
						>
							View All Items
						</button>
					{/if}
				</div>
			{:else}
				<!-- Enhanced Items Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
					{#each items as item (item.id)}
						<div class="group bg-slate-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-500 transform hover:-translate-y-2 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 flex flex-col">
							<!-- Enhanced Image Container -->
							<div class="relative overflow-hidden">
								<img 
									class="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110" 
									src={item.image_url || 'https://images.placeholders.dev/?width=400&height=300&text=No%20Image&bgColor=%23334155&textColor=%23cbd5e1'} 
									alt={item.name}
									loading="lazy"
								/>
								<!-- Overlay on hover -->
								<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
								<!-- Price badge -->
								<div class="absolute top-3 right-3">
									<span class="px-3 py-1 bg-black/70 backdrop-blur-sm text-white rounded-full text-sm font-bold">
										{item.price === 0 ? '🆓 Free' : `💰 ฿${item.price.toLocaleString()}`}
									</span>
								</div>
							</div>
							
							<!-- Enhanced Content -->
							<div class="p-6 flex flex-col flex-grow">
								<h2 class="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-blue-300 transition-colors">
									{item.name}
								</h2>
								<p class="text-gray-400 text-sm flex-grow line-clamp-3 leading-relaxed">
									{item.description || 'No description provided.'}
								</p>
								
								<!-- Enhanced Action Area -->
								<div class="mt-6 flex items-center justify-between">
									<div class="flex items-center space-x-2">
										<div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
										<span class="text-xs text-gray-500">Available</span>
									</div>
									<button 
										on:click={() => viewItem(item.id)}
										class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2.5 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2"
									>
										<span>View</span>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>
</main>

<Footer />

<style>
	/* Enhanced animations matching homepage style */
	@keyframes float {
		0%, 100% { transform: translateY(0px) translateX(0px); }
		25% { transform: translateY(-6px) translateX(2px); }
		50% { transform: translateY(-12px) translateX(-1px); }
		75% { transform: translateY(-6px) translateX(1px); }
	}
	
	@keyframes float-gentle {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-8px); }
	}

	.animate-float {
		animation: float 6s ease-in-out infinite;
	}

	.animate-float-gentle {
		animation: float-gentle 4s ease-in-out infinite;
	}

	/* Line clamp utilities for text truncation */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Enhanced hover effects */
	.group:hover .group-hover\:scale-110 {
		transform: scale(1.1);
	}

	.group:hover .group-hover\:opacity-100 {
		opacity: 1;
	}

	.group:hover .group-hover\:text-blue-300 {
		color: rgb(147 197 253);
	}

	/* Custom scrollbar styling */
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgba(255,255,255,0.1);
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(255,255,255,0.3);
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(255,255,255,0.5);
	}

	/* Backdrop blur fallback */
	@supports not (backdrop-filter: blur(12px)) {
		.backdrop-blur-sm {
			background-color: rgba(51, 65, 85, 0.9);
		}
	}

	/* Enhanced focus styles for accessibility */
	button:focus-visible {
		outline: 2px solid rgb(59 130 246);
		outline-offset: 2px;
	}

	/* Smooth transitions for all interactive elements */
	button {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		.animate-float {
			animation-duration: 8s;
		}
		
		.group:hover .group-hover\:scale-110 {
			transform: scale(1.05);
		}
	}

	/* Particle size utilities */
	.w-2 { width: 0.5rem; }
	.h-2 { height: 0.5rem; }
	.w-3 { width: 0.75rem; }
	.h-3 { height: 0.75rem; }
	.w-4 { width: 1rem; }
	.h-4 { height: 1rem; }
	.w-5 { width: 1.25rem; }
	.h-5 { height: 1.25rem; }
	.w-6 { width: 1.5rem; }
	.h-6 { height: 1.5rem; }
</style>
