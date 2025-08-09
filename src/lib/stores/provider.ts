import { writable } from 'svelte/store';

export type ProviderConfig = {
  provider?: 'azure' | 'gemini' | 'openrouter' | 'cerebras' | 'openai_compatible' | 'ollama';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

const LS_KEY = 'byo-provider-config';

function load(): ProviderConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const providerConfig = writable<ProviderConfig>({});

// initialize from localStorage in browser
if (typeof window !== 'undefined') {
  providerConfig.set(load());
  providerConfig.subscribe((v) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v || {}));
    } catch {
      // ignore
    }
  });
}

export function buildProviderHeaders(cfg: ProviderConfig | undefined): HeadersInit {
  const headers: Record<string, string> = {};
  if (!cfg) return headers;
  if (cfg.provider) headers['X-Provider'] = cfg.provider;
  if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;
  if (cfg.model) headers['X-Model'] = cfg.model;
  if (cfg.baseUrl) headers['X-Base-Url'] = cfg.baseUrl;
  return headers;
}
