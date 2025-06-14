import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Language = 'en' | 'th';

export const currentLanguage = writable<Language>('en');

if (browser) {
	const storedLanguage = localStorage.getItem('language') as Language | null;
	const browserLanguage = navigator.language.toLowerCase();
	
	// Check if browser language is Thai
	const initialLanguage: Language = storedLanguage || 
		(browserLanguage.startsWith('th') ? 'th' : 'en');
	
	currentLanguage.set(initialLanguage);
	
	currentLanguage.subscribe((value) => {
		localStorage.setItem('language', value);
		document.documentElement.lang = value;
	});
}
