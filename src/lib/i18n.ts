import { derived } from 'svelte/store';
import { currentLanguage } from './stores/language.js';
import { translations, type Translations } from './translations.js';

export const t = derived(
	currentLanguage,
	($currentLanguage) => {
		return (key: keyof Translations): string => {
			return translations[$currentLanguage][key];
		};
	}
);

export const switchLanguage = (language: 'en' | 'th') => {
	currentLanguage.set(language);
};
