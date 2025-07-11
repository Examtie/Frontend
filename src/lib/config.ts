// Access Vite public environment variable. Must start with VITE_
// Add `VITE_API_BASE_URL` to your .env file, e.g.
// VITE_API_BASE_URL=https://api.example.com

/**
 * API base URL sourced from environment variables.
 *
 * In SvelteKit, any env variable that should be exposed to the client needs to be
 * prefixed with `PUBLIC_`.
 *
 * Make sure you have `PUBLIC_API_BASE_URL` defined in your `.env` file or in the
 * environment where the app runs, for example:
 *
 * PUBLIC_API_BASE_URL=https://api.example.com
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'https://examtieapi.breadtm.xyz';

export default API_BASE_URL;
