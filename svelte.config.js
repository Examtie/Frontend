import { mdsvex } from 'mdsvex';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// --- Start of our changes ---
// 1. Import both adapters
import adapterNode from '@sveltejs/adapter-node';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';

// 2. Conditionally choose the adapter based on an environment variable
const isDocker = process.env.DEPLOY_TARGET === 'docker';

const adapter = isDocker 
  ? adapterNode()                      // Use adapter-node if DEPLOY_TARGET is 'docker'
  : adapterCloudflare(); // Otherwise, default to adapter-cloudflare
// --- End of our changes ---

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	// 3. Use the adapter we selected above
	kit: { adapter: adapter }, 
	extensions: ['.svelte', '.svx']
};

export default config;
