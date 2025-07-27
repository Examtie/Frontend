<script lang="ts">
    import { onMount } from 'svelte';
    import katex from 'katex';
    
    export let content = '';
    export let onSave: (() => void) | null = null;
    export let placeholder = 'Take notes here... Supports **markdown** and $LaTeX$ math!';
    
    let isPreviewMode = false;
    let textareaElement: HTMLTextAreaElement;
    
    // Auto-save functionality
    let saveTimeout: number;
    
    function handleInput() {
        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        // Set new timeout for auto-save
        saveTimeout = setTimeout(() => {
            if (onSave) {
                onSave();
            }
        }, 1000);
    }
    
    function renderMarkdownWithLatex(text: string): string {
        if (!text) return '';
        
        // First, protect LaTeX expressions from markdown processing
        const latexBlocks: string[] = [];
        let protectedText = text;
        
        // Handle display math ($$...$$)
        protectedText = protectedText.replace(/\$\$([^$]+?)\$\$/g, (match, expr) => {
            const index = latexBlocks.length;
            try {
                const rendered = katex.renderToString(expr, {
                    throwOnError: false,
                    displayMode: true
                });
                latexBlocks.push(`<div class="math-display">${rendered}</div>`);
            } catch (e) {
                latexBlocks.push(`<div class="math-error">$$${expr}$$</div>`);
            }
            return `__LATEX_BLOCK_${index}__`;
        });
        
        // Handle inline math ($...$)
        protectedText = protectedText.replace(/\$([^$]+?)\$/g, (match, expr) => {
            const index = latexBlocks.length;
            try {
                const rendered = katex.renderToString(expr, {
                    throwOnError: false,
                    displayMode: false
                });
                latexBlocks.push(`<span class="math-inline">${rendered}</span>`);
            } catch (e) {
                latexBlocks.push(`<span class="math-error">${match}</span>`);
            }
            return `__LATEX_BLOCK_${index}__`;
        });
        
        // Apply basic markdown
        let html = protectedText
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Strikethrough
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            // Line breaks
            .replace(/\n/g, '<br>')
            // Lists (basic)
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Restore LaTeX expressions
        latexBlocks.forEach((block, index) => {
            html = html.replace(`__LATEX_BLOCK_${index}__`, block);
        });
        
        return html;
    }
    
    function togglePreview() {
        isPreviewMode = !isPreviewMode;
    }
    
    function insertText(text: string) {
        if (!textareaElement) return;
        
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const beforeText = content.substring(0, start);
        const afterText = content.substring(end);
        
        content = beforeText + text + afterText;
        
        // Set cursor position after inserted text
        setTimeout(() => {
            textareaElement.selectionStart = start + text.length;
            textareaElement.selectionEnd = start + text.length;
            textareaElement.focus();
        }, 10);
        
        handleInput();
    }
    
    function wrapText(before: string, after: string = before) {
        if (!textareaElement) return;
        
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const selectedText = content.substring(start, end);
        const beforeText = content.substring(0, start);
        const afterText = content.substring(end);
        
        content = beforeText + before + selectedText + after + afterText;
        
        // Set cursor position
        setTimeout(() => {
            if (selectedText) {
                textareaElement.selectionStart = start + before.length;
                textareaElement.selectionEnd = start + before.length + selectedText.length;
            } else {
                textareaElement.selectionStart = start + before.length;
                textareaElement.selectionEnd = start + before.length;
            }
            textareaElement.focus();
        }, 10);
        
        handleInput();
    }
    
    onMount(() => {
        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    });
</script>

<div class="markdown-notepad flex flex-col h-full bg-slate-800/30 backdrop-blur-sm rounded-lg border border-white/20">
    <!-- Toolbar -->
    <div class="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        <div class="flex items-center gap-2">
            <!-- Formatting buttons -->
            <button
                on:click={() => wrapText('**')}
                class="toolbar-btn"
                title="Bold"
                type="button"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                </svg>
            </button>
            
            <button
                on:click={() => wrapText('*')}
                class="toolbar-btn"
                title="Italic"
                type="button"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 4H9m11 0L14 20M5 20h10"></path>
                </svg>
            </button>
            
            <button
                on:click={() => wrapText('`')}
                class="toolbar-btn"
                title="Code"
                type="button"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                </svg>
            </button>
            
            <div class="w-px h-4 bg-white/20"></div>
            
            <button
                on:click={() => insertText('# ')}
                class="toolbar-btn text-xs"
                title="Header"
                type="button"
            >
                H1
            </button>
            
            <button
                on:click={() => insertText('- ')}
                class="toolbar-btn"
                title="List"
                type="button"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            
            <div class="w-px h-4 bg-white/20"></div>
            
            <button
                on:click={() => wrapText('$')}
                class="toolbar-btn text-xs"
                title="Inline Math"
                type="button"
            >
                $x$
            </button>
            
            <button
                on:click={() => insertText('$$\n\n$$')}
                class="toolbar-btn text-xs"
                title="Display Math"
                type="button"
            >
                $$
            </button>
        </div>
        
        <div class="flex items-center gap-2">
            <button
                on:click={togglePreview}
                class="toolbar-btn {isPreviewMode ? 'bg-blue-500 text-white' : ''}"
                title="Toggle Preview"
                type="button"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
            </button>
        </div>
    </div>
    
    <!-- Content Area -->
    <div class="flex-1 overflow-hidden">
        {#if isPreviewMode}
            <!-- Preview Mode -->
            <div class="h-full overflow-y-auto p-4 prose prose-invert max-w-none">
                <div class="rendered-content">
                    {@html renderMarkdownWithLatex(content)}
                </div>
            </div>
        {:else}
            <!-- Edit Mode -->
            <textarea
                bind:this={textareaElement}
                bind:value={content}
                on:input={handleInput}
                {placeholder}
                class="w-full h-full p-4 bg-transparent border-0 text-white placeholder-gray-400 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                spellcheck="false"
            ></textarea>
        {/if}
    </div>
    
    <!-- Status Bar -->
    <div class="flex items-center justify-between p-2 border-t border-white/10 bg-white/5 text-xs text-gray-400">
        <span>
            {isPreviewMode ? 'Preview' : 'Edit'} • {content.length} chars
        </span>
        <span class="flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Auto-saved
        </span>
    </div>
</div>

<style>
    @reference "tailwindcss";
    
    .toolbar-btn {
        @apply p-2 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center;
    }
    
    .rendered-content {
        color: white;
        line-height: 1.6;
    }
    
    .rendered-content h1 {
        @apply text-2xl font-bold text-white mb-4 mt-6 first:mt-0;
    }
    
    .rendered-content h2 {
        @apply text-xl font-bold text-white mb-3 mt-5 first:mt-0;
    }
    
    .rendered-content h3 {
        @apply text-lg font-bold text-white mb-2 mt-4 first:mt-0;
    }
    
    .rendered-content p {
        @apply mb-4;
    }
    
    .rendered-content strong {
        @apply font-bold text-white;
    }
    
    .rendered-content em {
        @apply italic text-blue-200;
    }
    
    .rendered-content code {
        @apply bg-slate-700 text-green-300 px-2 py-1 rounded text-sm font-mono;
    }
    
    .rendered-content del {
        @apply line-through text-gray-400;
    }
    
    .rendered-content ul {
        @apply list-disc list-inside space-y-1 mb-4;
    }
    
    .rendered-content li {
        @apply text-gray-200;
    }
    
    .math-display {
        @apply my-4 text-center;
    }
    
    .math-inline {
        @apply inline;
    }
    
    .math-error {
        @apply bg-red-500/20 text-red-300 px-2 py-1 rounded;
    }
    
    :global(.katex) {
        color: #e2e8f0 !important;
    }
    
    :global(.katex .base) {
        color: #e2e8f0 !important;
    }
    
    :global(.katex-display) {
        margin: 1em 0 !important;
    }
</style>
