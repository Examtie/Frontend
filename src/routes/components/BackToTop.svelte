
<script lang="ts">
	import { onMount } from 'svelte';
	
	let showButton = $state(false);
	
	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}
	
	function handleScroll() {
		showButton = window.scrollY > 300;
	}
	
	onMount(() => {
		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

{#if showButton}
	<button
		onclick={scrollToTop}
		class="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-110 group"
		aria-label="Back to top"
	>
		<svg 
			class="w-5 h-5 transform group-hover:-translate-y-0.5 transition-transform duration-200" 
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
		</svg>
	</button>
{/if}