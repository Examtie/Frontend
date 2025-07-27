<script lang="ts">
  import { onMount } from 'svelte';
  // pdf.js should only be loaded in the browser to avoid SSR errors
  let pdfjsLib: any;
  import 'pdfjs-dist/web/pdf_viewer.css';
  // Worker URL will be obtained dynamically on the client
  let workerUrl: string;
  let isWorkerReady = false;

  export let src: string;
  export let scale: number = 1.25;
  // Minimum and maximum allowed zoom levels
  export let minScale: number = 0.5;
  export let maxScale: number = 3;
  // Amount to zoom in/out per step
  export let scaleStep: number = 0.25;

  let container: HTMLDivElement;
  let renderedSrc: string | null = null;
  let renderedScale: number | null = null;
  let isLoading = false;
  let pdfDocument: any = null;

  // ----------------------------
  // Zoom helpers and handlers
  // ----------------------------
  /**
   * Apply a zoom delta where `delta` is +1 (zoom in) or -1 (zoom out)
   */
  function zoom(delta: number) {
    const newScale = Math.min(maxScale, Math.max(minScale, scale + delta * scaleStep));
    if (newScale !== scale) {
      const previousScrollTop = container?.scrollTop || 0;
      const previousScrollHeight = container?.scrollHeight || 0;
      
      scale = newScale;
      
      // Re-render with new scale and maintain scroll position
      renderPdf(src, true, previousScrollTop, previousScrollHeight);
    }
  }

  function zoomIn() {
    zoom(1);
  }

  function zoomOut() {
    zoom(-1);
  }

  function resetZoom() {
    if (scale !== 1.25) {
      scale = 1.25;
      renderPdf(src, true);
    }
  }

  function fitToWidth() {
    if (container && pdfDocument) {
      // Calculate scale to fit width
      const containerWidth = container.clientWidth - 32; // Account for padding
      // Get first page to calculate dimensions
      pdfDocument.getPage(1).then((page: any) => {
        const viewport = page.getViewport({ scale: 1 });
        const newScale = Math.min(maxScale, Math.max(minScale, containerWidth / viewport.width));
        if (newScale !== scale) {
          scale = newScale;
          renderPdf(src, true);
        }
      });
    }
  }

  /**
   * Handle Ctrl/⌘ + mouse-wheel (or pinch track-pad gestures) to zoom the PDF.
   */
  function handleWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        zoomIn();
      } else if (event.deltaY > 0) {
        zoomOut();
      }
    }
  }

  /**
   * Double-click anywhere on the PDF to zoom in one step.
   */
  function handleDoubleClick() {
    zoomIn();
  }

  const clearPages = () => {
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  };

  async function renderPdf(url: string, forceRender = false, previousScrollTop = 0, previousScrollHeight = 0) {
    if (!pdfjsLib) return; // pdfjs not loaded yet (SSR or early mount)
    if (!url) return;
    if (!isWorkerReady || !workerUrl) {
      console.warn('PDF worker not ready yet, skipping render');
      return;
    }
    
    // Check if we need to re-render
    const needsRender = forceRender || renderedSrc !== url || renderedScale !== scale;
    if (!needsRender) return;
    
    isLoading = true;
    renderedSrc = url;
    renderedScale = scale;

    clearPages();

    try {
      // Worker is already configured in onMount, just proceed with rendering

      // Reuse existing document if available and same URL
      if (!pdfDocument || renderedSrc !== url) {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDocument = await loadingTask.promise;
      }

      // Add loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'flex items-center justify-center p-8 text-gray-500';
      loadingDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Rendering PDF...</span>
        </div>
      `;
      container.appendChild(loadingDiv);

      // Render all pages
      const pagePromises = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        pagePromises.push(renderPage(pageNumber));
      }

      // Wait for all pages to render
      await Promise.all(pagePromises);
      
      // Remove loading indicator
      container.removeChild(loadingDiv);
      
      // Restore scroll position if this was a zoom operation
      if (previousScrollHeight > 0 && container) {
        const newScrollHeight = container.scrollHeight;
        const scrollRatio = previousScrollTop / previousScrollHeight;
        container.scrollTop = scrollRatio * newScrollHeight;
      }
      
    } catch (err) {
      console.error('Failed to render PDF', err);
      clearPages();
      const msg = document.createElement('div');
      msg.className = 'text-center text-red-500 p-4 bg-red-50 rounded-lg mx-4';
      msg.innerHTML = `
        <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <p class="font-medium">Unable to display PDF</p>
        <p class="text-sm mt-1">Please check if the file is valid and try again.</p>
      `;
      container.appendChild(msg);
    } finally {
      isLoading = false;
    }
  }

  async function renderPage(pageNumber: number) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    // Create page container
    const pageContainer = document.createElement('div');
    pageContainer.className = 'relative mx-auto mb-4';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'block mx-auto shadow-lg rounded border border-gray-200';
    const context = canvas.getContext('2d')!;
    
    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    pageContainer.appendChild(canvas);
    container.appendChild(pageContainer);
    
    // Render the page
    await page.render({ canvasContext: context, viewport }).promise;
  }

  onMount(async () => {
    // Dynamically import pdf.js only in the browser
    if (typeof window !== 'undefined') {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjsLib = pdfjs as any;
        
        // Try different worker import methods
        try {
          const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          workerUrl = workerMod.default;
        } catch (e) {
          console.warn('Failed to import worker from build, trying alternative paths:', e);
          try {
            // Try alternative import path
            const workerMod: any = await import('pdfjs-dist/build/pdf.worker.mjs?url');
            workerUrl = workerMod.default;
          } catch (e2) {
            console.warn('Failed alternative import, using CDN fallback:', e2);
            // Fallback to CDN worker that matches our version (5.3.93)
            workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs`;
          }
        }
        
        // Ensure worker URL is valid and set up PDF.js
        if (workerUrl && typeof workerUrl === 'string') {
          // Configure PDF.js with additional options
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          
          // Set additional PDF.js options for better compatibility
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerPort = null;
          }
          
          isWorkerReady = true;
          console.log('PDF.js worker initialized successfully with URL:', workerUrl);
          
          // Now that worker is ready, render if src is available
          if (src) {
            renderPdf(src);
          }
        } else {
          console.error('Failed to load PDF worker URL');
        }
      } catch (error) {
        console.error('Failed to initialize PDF.js:', error);
      }
    }
  });

  // Reactive statement to handle scale changes
  $: if (src && pdfjsLib && isWorkerReady && (renderedScale !== scale)) {
    renderPdf(src, true);
  }

  // Reactive statement to handle src changes
  $: if (src && pdfjsLib && isWorkerReady && (renderedSrc !== src)) {
    renderPdf(src);
  }
</script>

<style>
  @reference "tailwindcss";
  /* Ensure canvases are responsive */
  :global(canvas) {
    max-width: 100%;
    height: auto;
  }
  
  .pdf-container {
    scroll-behavior: smooth;
  }
  
  .pdf-toolbar {
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .pdf-toolbar button {
    @apply p-2 hover:bg-gray-100 rounded transition-colors duration-200 text-gray-700 hover:text-gray-900;
  }
  
  .pdf-toolbar button:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
</style>

<!-- Scrollable container holding PDF pages -->
<div class="relative h-full w-full">
  <!-- Floating toolbar -->
  <div class="pdf-toolbar absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-1">
    <button 
      aria-label="Zoom out" 
      on:click={zoomOut} 
      title="Zoom out (Ctrl + wheel)"
      disabled={scale <= minScale || isLoading}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16" />
      </svg>
    </button>
    
    <button 
      aria-label="Reset zoom" 
      on:click={resetZoom} 
      title="Reset zoom (100%)"
      disabled={isLoading}
      class="text-xs px-2 py-1 hover:bg-gray-100 rounded transition-colors duration-200 min-w-[3rem]"
    >
      {Math.round(scale*100)}%
    </button>
    
    <button 
      aria-label="Zoom in" 
      on:click={zoomIn} 
      title="Zoom in (Ctrl + wheel, double-click)"
      disabled={scale >= maxScale || isLoading}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
    
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    
    <button 
      aria-label="Fit to width" 
      on:click={fitToWidth} 
      title="Fit to width"
      disabled={isLoading}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    </button>
  </div>

  <!-- Loading indicator -->
  {#if isLoading}
    <div class="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
      <div class="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span class="text-gray-700">Loading PDF...</span>
      </div>
    </div>
  {/if}

  <!-- Scrollable container holding PDF pages -->
  <div
    bind:this={container}
    role="group"
    class="pdf-container overflow-y-auto h-full w-full py-4"
    on:wheel={handleWheel}
    on:dblclick={handleDoubleClick}
  ></div>
</div>
