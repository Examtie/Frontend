<!-- SearchBar.svelte - Reusable search bar component -->
<script lang="ts">
	interface SearchBarProps {
		value?: string;
		placeholder?: string;
		onSearch?: (query: string) => void;
		class?: string;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search for quizzes, topics...',
		onSearch = () => {},
		class: className = ''
	}: SearchBarProps = $props();

	function handleSearch() {
		onSearch(value);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSearch();
		}
	}
</script>

<div class="relative {className}">
	<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
		<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
	</div>
	
	<input
		type="text"
		bind:value
		{placeholder}
		onkeydown={handleKeydown}
		class="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
	/>
	
	{#if value}
		<button
			onclick={() => { value = ''; onSearch(''); }}
			class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
			aria-label="Clear search"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>
