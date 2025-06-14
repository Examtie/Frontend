import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const theme = writable<'light' | 'dark'>('light');

if (browser) {
	const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	
	const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
	theme.set(initialTheme);
	
	theme.subscribe((value) => {
		localStorage.setItem('theme', value);
		if (value === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	});
}