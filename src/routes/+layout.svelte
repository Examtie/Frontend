<script lang="ts">
	import '../app.css';
	import { auth } from '$lib/stores/auth'; // Import the auth store
	import { onMount } from 'svelte';
	import ToastContainer from './components/ToastContainer.svelte';

	let { children } = $props();

	onMount(() => {
		// Initialize the auth store when the layout mounts
		// This ensures that the auth state is loaded from localStorage
		// auth.initialize(); // Already called within the store itself on client-side
	});
</script>

{@render children()}

<ToastContainer />
