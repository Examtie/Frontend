<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { t } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';

	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';

	// Updated interface to match API response
	interface MarketItem {
		id: string;
		name: string;
		description: string | null;
		price: number;
		image_url: string | null;
	}

	// Interface for creating market items
	interface MarketItemCreate {
		name: string;
		description: string | null;
		price: number;
		image_url: string | null;
	}

	let items: MarketItem[] = [];
	let isLoading = true;
	let error: string | null = null;
	let searchValue = '';

	// Add item modal state
	let showAddItemModal = false;
	let newItem: MarketItemCreate = {
		name: '',
		description: '',
		price: 0,
		image_url: ''
	};
	let isSubmittingItem = false;

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
				url = `${baseApiUrl}/public/api/v1/market/items/search?keyword=${encodeURIComponent(searchTerm)}`;
			} else {
				url = `${baseApiUrl}/public/api/v1/market/items`;
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

	// Check if user can add items (Admin or Seller role)
	function canAddItems(): boolean {
		const user = get(auth).user;
		if (!user || !user.roles) return false;
		return user.roles.includes('admin') || user.roles.includes('seller');
	}

	// View item functionality
	async function viewItem(itemId: string) {
		try {
			const token = get(auth).token;
			const headers: HeadersInit = {};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(`${baseApiUrl}/public/api/v1/market/items/${itemId}`, { headers });
			
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

	// Add item functionality
	async function addItem() {
		if (!canAddItems()) {
			alert('You do not have permission to add items.');
			return;
		}

		if (!newItem.name.trim()) {
			alert('Please enter an item name.');
			return;
		}

		if (newItem.price < 0) {
			alert('Price cannot be negative.');
			return;
		}

		isSubmittingItem = true;
		try {
			const token = get(auth).token;
			const headers: HeadersInit = {
				'Content-Type': 'application/json'
			};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(`${baseApiUrl}/market/api/v1/items`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					name: newItem.name.trim(),
					description: newItem.description?.trim() || null,
					price: newItem.price,
					image_url: newItem.image_url?.trim() || null
				})
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication required. Please log in.');
				}
				if (response.status === 403) {
					throw new Error('You do not have permission to add items.');
				}
				const errorData: any = await response.json().catch(() => ({ detail: response.statusText }));
				throw new Error(errorData.detail || 'Failed to add item');
			}

			const createdItem: MarketItem = await response.json();
			
			// Add the new item to the beginning of the list
			items = [createdItem, ...items];
			
			// Reset form and close modal
			newItem = {
				name: '',
				description: '',
				price: 0,
				image_url: ''
			};
			showAddItemModal = false;
			
			alert('Item added successfully!');
			
		} catch (error) {
			console.error('Error adding item:', error);
			alert(error instanceof Error ? error.message : 'Failed to add item. Please try again.');
		} finally {
			isSubmittingItem = false;
		}
	}

	// Modal control functions
	function openAddItemModal() {
		if (!canAddItems()) {
			alert('You do not have permission to add items.');
			return;
		}
		showAddItemModal = true;
	}

	function closeAddItemModal() {
		showAddItemModal = false;
		newItem = {
			name: '',
			description: '',
			price: 0,
			image_url: ''
		};
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
	<!-- Integrated Banner with Search -->
	<section class="relative bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 border-b border-gray-700/30">
		<!-- Subtle background effects -->
		<div class="absolute inset-0">
			<div class="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
			<!-- Minimal floating particles -->
			{#each particles.slice(0, 8) as particle}
				<div 
					class="absolute w-2 h-2 bg-gradient-to-br from-blue-400/15 to-purple-400/10 rounded-full blur-sm animate-float" 
					style="left: {particle.x}%; top: {particle.y}%; animation-delay: {particle.delay}s"
				></div>
			{/each}
		</div>
		
		<!-- Compact Banner Content -->
		<div class="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
			<div class="max-w-7xl mx-auto">
				<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
					<!-- Title and Badge Section -->
					<div class="flex-1">
						<!-- Enhanced Badge -->
						<div class="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 rounded-full text-xs font-medium mb-3 border border-white/20">
							<svg class="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
							</svg>
							Marketplace
						</div>
						
						<!-- Compact Title -->
						<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
							Discover Premium
							<span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
								Content
							</span>
						</h1>
						
						<!-- Compact description with stats -->
						<div class="flex flex-wrap items-center gap-4 text-sm text-blue-100">
							<span class="hidden sm:block">High-quality educational content</span>
							<div class="flex items-center gap-4">
								<div class="flex items-center text-green-300">
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
									</svg>
									Verified
								</div>
								<div class="flex items-center text-blue-300">
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
									</svg>
									Instant
								</div>
								<div class="flex items-center text-purple-300">
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
									</svg>
									Community
								</div>
							</div>
						</div>
					</div>
					
					<!-- Search and Actions Section -->
					<div class="flex-1 max-w-2xl lg:max-w-md">
						<div class="flex gap-3">
							<!-- Search Input Container -->
							<div class="flex-1 relative">
								<!-- Search Input -->
								<div class="relative">
									<input
										type="text"
										bind:value={searchValue}
										on:input={(e) => handleSearch((e.target as HTMLInputElement).value)}
										placeholder="Search marketplace..."
										class="w-full bg-slate-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 pl-12 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
									/>
									
									<!-- Search Icon -->
									<div class="absolute inset-y-0 left-0 flex items-center pl-4">
										<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
										</svg>
									</div>
									
									<!-- Clear Button -->
									{#if searchValue}
										<button
											on:click={() => handleSearch('')}
											aria-label="Clear search"
											class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white transition-colors"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
											</svg>
										</button>
									{/if}
								</div>
								
								<!-- Search Status -->
								{#if searchValue}
									<div class="mt-2 text-center">
										<span class="text-xs text-gray-400">Searching for: </span>
										<span class="text-xs text-blue-300 font-medium">"{searchValue}"</span>
									</div>
								{/if}
							</div>
							
							<!-- Add Item Button (Admin/Seller only) -->
							{#if $auth.isAuthenticated && canAddItems()}
								<button
									on:click={openAddItemModal}
									class="flex-shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
									</svg>
									<span class="hidden sm:inline">Add Item</span>
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Content Section -->
	<section class="py-8 lg:py-12 px-4 sm:px-6 lg:px-8 relative">
		<!-- Background decoration -->
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent"></div>
		
		<div class="max-w-7xl mx-auto relative">

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

<!-- Add Item Modal -->
{#if showAddItemModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
		<div class="bg-slate-800 rounded-2xl border border-gray-700/50 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-700/50">
				<h2 class="text-xl font-bold text-white flex items-center gap-2">
					<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
					</svg>
					Add New Item
				</h2>
				<button
					on:click={closeAddItemModal}
					class="text-gray-400 hover:text-white transition-colors p-1"
					aria-label="Close modal"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
			
			<!-- Modal Content -->
			<form on:submit|preventDefault={addItem} class="p-6 space-y-4">
				<!-- Item Name -->
				<div>
					<label for="item-name" class="block text-sm font-medium text-gray-300 mb-2">
						Item Name *
					</label>
					<input
						id="item-name"
						type="text"
						bind:value={newItem.name}
						placeholder="Enter item name"
						required
						class="w-full bg-slate-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
					/>
				</div>
				
				<!-- Description -->
				<div>
					<label for="item-description" class="block text-sm font-medium text-gray-300 mb-2">
						Description
					</label>
					<textarea
						id="item-description"
						bind:value={newItem.description}
						placeholder="Enter item description"
						rows="3"
						class="w-full bg-slate-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 resize-none"
					></textarea>
				</div>
				
				<!-- Price -->
				<div>
					<label for="item-price" class="block text-sm font-medium text-gray-300 mb-2">
						Price (฿)
					</label>
					<input
						id="item-price"
						type="number"
						bind:value={newItem.price}
						placeholder="0"
						min="0"
						step="0.01"
						class="w-full bg-slate-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
					/>
					<p class="text-xs text-gray-500 mt-1">Set to 0 for free items</p>
				</div>
				
				<!-- Image URL -->
				<div>
					<label for="item-image" class="block text-sm font-medium text-gray-300 mb-2">
						Image URL (optional)
					</label>
					<input
						id="item-image"
						type="url"
						bind:value={newItem.image_url}
						placeholder="https://example.com/image.jpg"
						class="w-full bg-slate-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
					/>
				</div>
				
				<!-- Modal Actions -->
				<div class="flex gap-3 pt-4">
					<button
						type="button"
						on:click={closeAddItemModal}
						class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmittingItem || !newItem.name.trim()}
						class="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
					>
						{#if isSubmittingItem}
							<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
							</svg>
							Adding...
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
							</svg>
							Add Item
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<Footer />

<style>
	/* Enhanced animations matching homepage style */
	@keyframes float {
		0%, 100% { transform: translateY(0px) translateX(0px); }
		25% { transform: translateY(-6px) translateX(2px); }
		50% { transform: translateY(-12px) translateX(-1px); }
		75% { transform: translateY(-6px) translateX(1px); }
	}
	
	.animate-float {
		animation: float 6s ease-in-out infinite;
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
</style>
