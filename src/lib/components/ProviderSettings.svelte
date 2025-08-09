<script lang="ts">
  import { providerConfig, type ProviderConfig } from '$lib/stores/provider';
  import { toastStore } from '$lib/stores/toast';

  export let show = false;
  let localProvider: ProviderConfig = {};
  let showApiKey = false;
  let isTestingConnection = false;

  $: localProvider = Object.keys($providerConfig || {}).length ? { ...$providerConfig } : localProvider;

  // Provider descriptions and help text
  const providerInfo = {
    azure: {
      name: 'Azure OpenAI',
      description: 'Microsoft Azure OpenAI Service with GPT models',
      modelPlaceholder: 'gpt-4o, gpt-4o-mini, gpt-35-turbo',
      baseUrlPlaceholder: 'https://your-resource.openai.azure.com/'
    },
    gemini: {
      name: 'Google Gemini',
      description: 'Google\'s advanced AI model for text and multimodal tasks',
      modelPlaceholder: 'gemini-1.5-flash, gemini-1.5-pro',
      baseUrlPlaceholder: 'Leave empty for default'
    },
    openrouter: {
      name: 'OpenRouter',
      description: 'Access to multiple AI models through a unified API',
      modelPlaceholder: 'openai/gpt-4o, anthropic/claude-3.5-sonnet',
      baseUrlPlaceholder: 'https://openrouter.ai/api/v1'
    },
    cerebras: {
      name: 'Cerebras',
      description: 'Ultra-fast inference with Cerebras systems',
      modelPlaceholder: 'llama3.1-8b, llama3.1-70b',
      baseUrlPlaceholder: 'https://api.cerebras.ai/v1'
    },
    openai_compatible: {
      name: 'OpenAI Compatible',
      description: 'Any OpenAI-compatible API endpoint',
      modelPlaceholder: 'Model name from your provider',
      baseUrlPlaceholder: 'https://api.your-provider.com/v1'
    },
    ollama: {
      name: 'Ollama (Local)',
      description: 'Run models locally with Ollama',
      modelPlaceholder: 'llama3.1, codellama, mistral',
      baseUrlPlaceholder: 'http://localhost:11434/v1'
    }
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  async function testConnection() {
    if (!localProvider.provider || !localProvider.apiKey) {
      toastStore.error('Please select a provider and enter an API key');
      return;
    }

    isTestingConnection = true;
    try {
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      };
      if (localProvider.provider) headers['X-Provider'] = localProvider.provider;
      if (localProvider.apiKey) headers['X-API-Key'] = localProvider.apiKey;
      if (localProvider.model) headers['X-Model'] = localProvider.model;
      if (localProvider.baseUrl) headers['X-Base-Url'] = localProvider.baseUrl;

      const res = await fetch(`${API_BASE_URL}/ai/api/v1/provider/test`, {
        method: 'POST',
        headers
      });
      if (!res.ok) {
        const data: any = await res.json().catch(() => ({} as any));
        throw new Error((data && (data.detail || data.message)) || res.statusText);
      }
      toastStore.success('Connection test successful!');
    } catch (error: any) {
      toastStore.error(`Connection test failed: ${error?.message || 'Unknown error'}`);
    } finally {
      isTestingConnection = false;
    }
  }

  function save() {
    if (localProvider.provider && !localProvider.apiKey) {
      toastStore.error('API key is required for the selected provider');
      return;
    }
    
    providerConfig.set({ ...localProvider });
    toastStore.success('AI provider settings saved successfully');
    show = false;
  }
  
  function reset() {
    localProvider = { ...$providerConfig };
  }

  function closeModal() {
    show = false;
  }

  function toggleApiKeyVisibility() {
    showApiKey = !showApiKey;
  }

  // Close modal on Escape key (only when modal is shown)
  function handleKeydown(event: KeyboardEvent) {
    if (show && event.key === 'Escape') {
      closeModal();
    }
  }

  $: currentProviderInfo = localProvider.provider ? providerInfo[localProvider.provider as keyof typeof providerInfo] : null;
</script>

<!-- Keyboard event listener - must be outside any blocks -->
<svelte:window on:keydown={handleKeydown} />

<!-- Enhanced Modal with Backdrop Blur and Modern Design -->
{#if show}
<div 
  class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
  on:click|self={closeModal}
  on:keydown={(e) => e.key === 'Enter' && closeModal()}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
>
  <div 
    class="w-full max-w-2xl lg:max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
    style="animation: modalSlideIn 0.3s ease-out;"
  >
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50 p-4 sm:p-6 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z" />
            </svg>
          </div>
          <div class="min-w-0">
            <h3 id="modal-title" class="text-lg sm:text-xl font-bold text-white truncate">AI Provider Settings</h3>
            <p class="text-xs sm:text-sm text-gray-400 hidden sm:block">Configure your own AI API keys for enhanced performance</p>
          </div>
        </div>
        <button
          on:click={closeModal}
          class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 flex-shrink-0"
          aria-label="Close modal"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Scrollable Content Section -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <!-- Provider Selection -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-200 mb-2" for="prov-provider">
            AI Provider
          </label>
          <select 
            id="prov-provider" 
            bind:value={localProvider.provider} 
            class="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          >
            <option value="">🏢 Default (Server Provider)</option>
            <option value="azure">☁️ Azure OpenAI</option>
            <option value="gemini">🤖 Google Gemini</option>
            <option value="openrouter">🔄 OpenRouter</option>
            <option value="cerebras">⚡ Cerebras</option>
            <option value="openai_compatible">🔧 Custom OpenAI-compatible</option>
            <option value="ollama">🏠 Ollama (Local)</option>
          </select>
          
          <!-- Provider Info Card -->
          {#if currentProviderInfo}
            <div class="bg-slate-800/30 border border-slate-600/30 rounded-xl p-3 sm:p-4 mt-3">
              <div class="flex items-start space-x-3">
                <div class="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h4 class="font-semibold text-white text-sm">{currentProviderInfo.name}</h4>
                  <p class="text-xs text-gray-400 mt-1">{currentProviderInfo.description}</p>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Configuration Grid -->
        <div class="grid grid-cols-1 gap-4 sm:gap-6">
          <!-- API Key -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-200" for="prov-key">
              API Key
              {#if localProvider.provider}
                <span class="text-red-400">*</span>
              {/if}
            </label>
            <div class="relative">
              <input 
                id="prov-key" 
                type={showApiKey ? "text" : "password"}
                bind:value={localProvider.apiKey} 
                class="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                placeholder={localProvider.provider ? "Enter your API key..." : "Select a provider first"}
                disabled={!localProvider.provider}
              />
              {#if localProvider.apiKey}
                <button
                  type="button"
                  on:click={toggleApiKeyVisibility}
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {#if showApiKey}
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    {:else}
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    {/if}
                  </svg>
                </button>
              {/if}
            </div>
            {#if localProvider.provider && !localProvider.apiKey}
              <p class="text-xs text-red-400 flex items-center space-x-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>API key is required for this provider</span>
              </p>
            {/if}
          </div>

          <!-- Model and Base URL in a responsive grid for larger screens -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <!-- Model -->
            <div class="space-y-3">
              <label class="block text-sm font-semibold text-gray-200" for="prov-model">
                Model <span class="text-gray-400 font-normal">(optional)</span>
              </label>
              <input 
                id="prov-model" 
                type="text" 
                bind:value={localProvider.model} 
                class="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                placeholder={currentProviderInfo?.modelPlaceholder || "Leave empty for default model"}
              />
            </div>

            <!-- Base URL -->
            <div class="space-y-3">
              <label class="block text-sm font-semibold text-gray-200" for="prov-base">
                Base URL <span class="text-gray-400 font-normal">(optional)</span>
              </label>
              <input 
                id="prov-base" 
                type="text" 
                bind:value={localProvider.baseUrl} 
                class="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                placeholder={currentProviderInfo?.baseUrlPlaceholder || "Custom endpoint URL"}
              />
            </div>
          </div>
        </div>

        <!-- Test Connection Button -->
        {#if localProvider.provider && localProvider.apiKey}
          <div class="bg-slate-800/20 border border-slate-600/30 rounded-xl p-3 sm:p-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-center space-x-3">
                <div class="w-6 h-6 sm:w-8 sm:h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white">Test Connection</h4>
                  <p class="text-xs text-gray-400">Verify your API credentials are working</p>
                </div>
              </div>
              <button
                on:click={testConnection}
                disabled={isTestingConnection}
                class="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-w-0"
              >
                {#if isTestingConnection}
                  <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span class="text-sm">Testing...</span>
                {:else}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span class="text-sm">Test</span>
                {/if}
              </button>
            </div>
          </div>
        {/if}

        <!-- Security Notice -->
        <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 sm:p-4">
          <div class="flex items-start space-x-3">
            <div class="w-5 h-5 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-amber-400 mb-1">Security Notice</h4>
              <p class="text-xs text-gray-300 leading-relaxed">
                Your API keys are stored locally and sent only as headers for your requests; the backend forwards them to your chosen provider to fulfill your request. Keys are not persisted on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="bg-slate-800/30 border-t border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button 
          on:click={reset}
          class="px-4 py-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 order-2 sm:order-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset</span>
        </button>
        
        <div class="flex items-center space-x-3 order-1 sm:order-2">
          <button 
            on:click={closeModal}
            class="flex-1 sm:flex-none px-5 py-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button 
            on:click={save}
            class="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
{/if}

<style lang="postcss">
  /* Enhanced modal animations */
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Custom input focus styles */
  input:focus, select:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Enhanced button hover effects */
  button:hover {
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  /* Custom scrollbar styling */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgba(51, 65, 85, 0.3);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.5);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7);
  }

  /* Loading animation */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Enhanced backdrop blur fallback */
  @supports not (backdrop-filter: blur(8px)) {
    .backdrop-blur-sm {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }

  /* Responsive modal sizing */
  @media (max-width: 640px) {
    [role="dialog"] {
      padding: 0.5rem;
    }
  }

  /* Accessibility improvements */
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid rgb(59 130 246);
    outline-offset: 2px;
  }

  /* Dark theme optimizations */
  input, select {
    color-scheme: dark;
  }

  /* Prevent content overflow */
  /* removed unused .modal-content selector */

  /* Better touch targets on mobile */
  @media (max-width: 768px) {
    button {
      min-height: 44px;
      padding: 0.75rem 1rem;
    }
    
    input, select {
      min-height: 44px;
      padding: 0.75rem 1rem;
    }
  }

  /* Enhanced transitions */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }

  /* removed unused .modal-container selectors */
</style>
