<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import * as pdfjsLib from 'pdfjs-dist';
  import 'pdfjs-dist/web/pdf_viewer.css';
  // Vite will copy the worker file and give us a URL we can use safely in the browser
  // The `?url` query returns the public URL for the asset during build
  // @ts-ignore – the build query is handled by Vite
  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';


  export let src: string;
  export let scale: number = 1.25;

  let container: HTMLDivElement;
  let renderedSrc: string | null = null;

  const clearPages = () => {
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  };

  async function renderPdf(url: string) {
    if (!url) return;
    // Avoid re-rendering the same document
    if (renderedSrc === url) return;
    renderedSrc = url;

    clearPages();

    try {
      // Configure the pdf.js worker to load from the jsDelivr CDN at runtime.
      // This avoids bundling the worker file so that Vite doesn't need to resolve it during build.
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.className = 'block mx-auto';
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        container.appendChild(canvas);
        await page.render({ canvasContext: context, viewport }).promise;
      }
    } catch (err) {
      console.error('Failed to render PDF', err);
      clearPages();
      const msg = document.createElement('p');
      msg.textContent = 'Unable to display PDF.';
      msg.className = 'text-center text-gray-500 p-4';
      container.appendChild(msg);
    }
  }

  onMount(() => {
    if (src) renderPdf(src);
  });

  afterUpdate(() => {
    if (src) renderPdf(src);
  });
</script>

<style>
  /* Ensure canvases are responsive */
  :global(canvas) {
    max-width: 100%;
    height: auto;
  }
</style>

<!-- Scrollable container holding PDF pages -->
<div bind:this={container} class="overflow-y-auto h-full w-full py-4 flex flex-col gap-4"></div>
