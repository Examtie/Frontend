<!-- PDF to Flashcards Conversion Page -->
<script lang="ts">
	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
	import { t } from '../../lib/i18n.js'; // Assuming i18n is not a core part of this request
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
	import { get } from 'svelte/store';
	import { auth } from '$lib/stores/auth';
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	// --- State Management ---
	let isDragOver = $state(false);
	let isProcessing = $state(false);
	let uploadedFile: File | null = $state(null);
	let flashcards: Array<{ id: string; front: string; back: string }> = $state([]);
	let currentCardIndex = $state(0);
	let isFlipped = $state(false);
	let processingProgress = $state(0);
	let errorMessage = $state('');
	let amount = $state(10); // Number of flashcards to generate

// --- LaTeX Rendering Helper ---
function renderLatex(text: string): string {
	// Replace LaTeX delimiters with rendered KaTeX while leaving normal text intact
	// Supports inline `$...$` and block `$$...$$`
	return text.replace(/(\$\$[^$]+?\$\$|\$[^$]+?\$)/g, (match) => {
		const isBlock = match.startsWith('$$');
		const expr = match.replace(/^\$\$?/, '').replace(/\$\$?$/, '');
		try {
			return katex.renderToString(expr, {
				throwOnError: false,
				displayMode: isBlock
			});
		} catch (e) {
			console.error('KaTeX render error:', e);
			return match; // fallback to original
		}
	});
}

	// --- File Upload Handling ---
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelection(files[0]);
		}
	}

	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			handleFileSelection(files[0]);
		}
	}

	function handleFileSelection(file: File) {
		if (file.type !== 'application/pdf') {
			errorMessage = 'กรุณาเลือกไฟล์ PDF เท่านั้น';
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			// 10MB limit
			errorMessage = 'ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB';
			return;
		}
		uploadedFile = file;
		errorMessage = '';
	}

	// --- PDF Processing with API ---
	async function processPDF() {
		if (!uploadedFile) return;

		isProcessing = true;
		processingProgress = 0;
		errorMessage = '';
		flashcards = [];

		// Simulate progress for better UX while waiting for the API
		const progressInterval = setInterval(() => {
			if (processingProgress < 99) {
				processingProgress += 1;
			}
		}, 300);

		try {
			// Retrieve the current authentication token from the auth store
			const authToken = get(auth).token;
			if (!authToken) {
				throw new Error('ผู้ใช้ไม่ได้เข้าสู่ระบบ');
			}

			const formData = new FormData();
			formData.append('file', uploadedFile);

			const apiUrl = `${API_BASE_URL}/ai/api/v1/flashcards/generate-pdf?amount=${amount}`;

			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`
				},
				body: formData
			});

			clearInterval(progressInterval);
			processingProgress = 100;

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const errorDetail =
					errorData?.detail?.[0]?.msg || errorData?.detail || `Error: ${response.statusText}`;
				throw new Error(errorDetail);
			}

			const generatedFlashcards: Array<{ front: string; back: string }> = await response.json();

			if (!generatedFlashcards || generatedFlashcards.length === 0) {
				throw new Error('ไม่สามารถสร้างแฟลชการ์ดได้ เนื้อหาใน PDF อาจไม่เพียงพอ');
			}

			flashcards = generatedFlashcards.map((card) => ({
				...card,
				id: crypto.randomUUID() // Add a unique ID for Svelte
			}));

			currentCardIndex = 0;
			isFlipped = false;
		} catch (error: any) {
			console.error('Error processing PDF:', error);
			errorMessage = error.message || 'เกิดข้อผิดพลาดในการประมวลผล PDF กรุณาลองใหม่อีกครั้ง';
		} finally {
			clearInterval(progressInterval);
			isProcessing = false;
		}
	}

	// --- Anki Export ---
	function exportToAnki() {
		if (flashcards.length === 0) return;

		const deckName = uploadedFile?.name.replace(/\.pdf$/i, '') || 'Generated-Flashcards';

		// Format: Front <Tab> Back <Newline>
		// Replace newlines within fields with HTML <br> for Anki compatibility
		const ankiContent = flashcards
			.map((card) => {
				const front = card.front.replace(/\n/g, '<br>');
				const back = card.back.replace(/\n/g, '<br>');
				return `${front}\t${back}`;
			})
			.join('\n');

		const blob = new Blob([ankiContent], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${deckName}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// --- Flashcard Navigation ---
	function nextCard() {
		if (currentCardIndex < flashcards.length - 1) {
			currentCardIndex++;
			isFlipped = false;
		}
	}

	function prevCard() {
		if (currentCardIndex > 0) {
			currentCardIndex--;
			isFlipped = false;
		}
	}

	function flipCard() {
		isFlipped = !isFlipped;
	}

	// --- Reset Function ---
	function resetUpload() {
		uploadedFile = null;
		flashcards = [];
		currentCardIndex = 0;
		isFlipped = false;
		processingProgress = 0;
		errorMessage = '';
		isProcessing = false;
	}

	// --- Keyboard Shortcuts ---
	function handleKeydown(event: KeyboardEvent) {
		if (flashcards.length === 0) return;
		switch (event.key) {
			case 'ArrowLeft':
				prevCard();
				break;
			case 'ArrowRight':
				nextCard();
				break;
			case ' ':
			case 'Enter':
				event.preventDefault();
				flipCard();
				break;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<title>PDF to Flashcards - Examtie</title>
	<meta
		name="description"
		content="Convert your PDF documents into interactive flashcards for better learning"
	/>
</svelte:head>

<Header />

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
	<!-- Hero Section -->
	<section class="relative py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
		<!-- Enhanced Background decorations -->
		<div class="absolute inset-0">
			<div class="absolute top-20 left-10 w-24 h-24 bg-blue-500/10 rounded-full animate-pulse"></div>
			<div
				class="absolute bottom-16 right-16 w-32 h-32 bg-purple-500/5 rounded-full animate-bounce delay-300"
			></div>
			<div
				class="absolute top-1/2 left-1/4 w-16 h-16 bg-green-500/10 rounded-full animate-ping delay-700"
			></div>
			<div
				class="absolute top-32 right-1/4 w-20 h-20 bg-indigo-500/8 rounded-full animate-pulse delay-1000"
			></div>
		</div>

		<div class="max-w-7xl mx-auto relative">
			<!-- Page Header -->
			<div class="text-center mb-12 lg:mb-16">
				<div
					class="inline-flex items-center px-4 py-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 rounded-full text-sm font-medium mb-6"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						></path>
					</svg>
					AI-Powered Learning Tool
				</div>
				<h1 class="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
					PDF to
					<span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
						Flashcards
					</span>
				</h1>
				<p class="text-xl lg:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
					แปลงเอกสาร PDF เป็นแฟลชการ์ดเพื่อการเรียนรู้ที่มีประสิทธิภาพ
				</p>
			</div>

			<!-- Dynamic Content Area: Switches between Uploader and Flashcard Viewer -->
			{#key flashcards.length}
				<div in:fade={{ duration: 300, delay: 300 }} out:fade={{ duration: 300 }}>
					{#if flashcards.length === 0}
						<!-- Upload Section -->
						<div class="max-w-2xl mx-auto">
							<div
								class="relative border-2 border-dashed border-gray-600 hover:border-blue-400 transition-all duration-300 rounded-2xl p-8 lg:p-12 text-center bg-slate-800/50 backdrop-blur-sm shadow-2xl shadow-black/20 hover:shadow-blue-500/10 {isDragOver ? 'border-blue-400 bg-blue-500/10 scale-[1.02]' : ''}"
								role="button"
								tabindex="0"
								aria-label="Drop PDF file here or click to upload"
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
							>
								{#if !uploadedFile}
									<div class="mb-6">
										<div class="relative inline-block mb-4">
											<svg
												class="w-16 h-16 mx-auto text-gray-400 transition-colors duration-300"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
												></path>
											</svg>
											<div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
										</div>
										<h3 class="text-xl font-semibold text-white mb-2">อัปโหลดไฟล์ PDF</h3>
										<p class="text-gray-400">ลากและวางไฟล์ PDF หรือคลิกเพื่อเลือกไฟล์</p>
									</div>

									<input
										type="file"
										accept=".pdf"
										class="hidden"
										id="pdf-upload"
										onchange={handleFileInput}
									/>
									<label
										for="pdf-upload"
										class="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
									>
										<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 6v6m0 0v6m0-6h6m-6 0H6"
											></path>
										</svg>
										เลือกไฟล์ PDF
									</label>

									<p class="text-sm text-gray-500 mt-4">รองรับไฟล์ PDF ขนาดไม่เกิน 10MB</p>
								{:else}
									<!-- File Selected -->
									<div class="mb-6">
										<div class="relative inline-block mb-4">
											<svg
												class="w-16 h-16 mx-auto text-green-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												></path>
											</svg>
											<div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
										</div>
										<h3 class="text-xl font-semibold text-white mb-2">ไฟล์พร้อมประมวลผล</h3>
										<p class="text-gray-400 mb-2 font-medium">{uploadedFile.name}</p>
										<p class="text-sm text-gray-500 mb-6">
											ขนาดไฟล์: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</div>

									<!-- Enhanced Amount Input -->
									<div class="max-w-xs mx-auto mb-8">
										<label for="card-amount" class="block text-sm font-medium text-gray-300 mb-3"
											>จำนวนแฟลชการ์ดที่ต้องการ</label
										>
										<div class="relative">
											<input
												type="number"
												id="card-amount"
												bind:value={amount}
												min="1"
												max="100"
												class="w-full bg-slate-700/70 backdrop-blur-sm border border-gray-600 text-white rounded-xl p-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
											/>
											<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
												<span class="text-gray-400 text-sm">การ์ด</span>
											</div>
										</div>
										<p class="text-xs text-gray-500 mt-2">1-100 การ์ด</p>
									</div>

									<div class="flex gap-4 justify-center">
										<button
											onclick={processPDF}
											disabled={isProcessing}
											class="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 flex items-center transform hover:scale-105 shadow-lg disabled:transform-none disabled:hover:scale-100"
										>
											{#if isProcessing}
												<svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													></circle>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												กำลังประมวลผล...
											{:else}
												<svg
													class="w-5 h-5 mr-2"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M13 10V3L4 14h7v7l9-11h-7z"
													></path>
												</svg>
												สร้างแฟลชการ์ด
											{/if}
										</button>

										<button
											onclick={resetUpload}
											disabled={isProcessing}
											class="px-6 py-4 border border-gray-600 hover:border-gray-500 disabled:opacity-50 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-300 hover:bg-gray-800/30"
										>
											เลือกไฟล์ใหม่
										</button>
									</div>

									{#if isProcessing}
										<div class="mt-8">
											<div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
												<div
													class="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
													style="width: {processingProgress}%"
												></div>
											</div>
											<div class="flex justify-between items-center mt-3">
												<p class="text-sm text-gray-400">{processingProgress}% เสร็จสิ้น</p>
												<div class="flex space-x-1">
													<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
													<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
													<div class="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200"></div>
												</div>
											</div>
										</div>
									{/if}
								{/if}

								{#if errorMessage}
									<div class="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
										<div class="flex items-center">
											<svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
											</svg>
											<p class="text-red-300 text-sm">{errorMessage}</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<!-- Optimized Flashcards Display for Perfect Screen Fit -->
						<div class="max-w-6xl mx-auto flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
							<!-- Simple Progress Counter -->
							<div class="mb-6">
								<div class="flex justify-center items-center">
									<span class="text-lg font-medium text-blue-300 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20"
										>{currentCardIndex + 1} / {flashcards.length}</span
									>
								</div>
							</div>

							<!-- Optimized Flashcard with Perfect Fit -->
							<div
								class="relative mb-6 h-[calc(100vh-280px)] min-h-[400px] max-h-[600px] cursor-pointer flex items-center justify-center"
								style="perspective: 1500px;"
								role="button"
								tabindex="0"
								aria-label="Click to flip flashcard"
								onclick={flipCard}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? flipCard() : null)}
							>
								<div
									class="relative w-full h-full transition-transform duration-700 ease-in-out shadow-2xl shadow-black/40 hover:shadow-black/60"
									style="transform-style: preserve-3d;"
									class:rotateY-180={isFlipped}
								>
									<!-- Enhanced Front Face with Generous Padding -->
									<div
										class="absolute w-full h-full px-16 py-20 lg:px-24 lg:py-28 flex items-center justify-center bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl hover:border-blue-500/30 transition-all duration-300 overflow-hidden"
										style="backface-visibility: hidden; -webkit-backface-visibility: hidden;"
									>
										<div class="text-center max-w-full w-full h-full flex flex-col justify-center">
											<div class="mb-8">
												<span
													class="inline-flex items-center px-4 py-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 rounded-full text-sm font-medium border border-blue-500/30"
													>
													<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
													</svg>
													คำถาม</span
												>
											</div>
											<div class="flex-1 flex items-center justify-center">
												<h2
													class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white leading-relaxed text-center break-words hyphens-auto max-w-full overflow-auto"
													style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
												>
													{@html renderLatex(flashcards[currentCardIndex].front)}
												</h2>
											</div>
											<div class="flex items-center justify-center space-x-2 text-gray-400 text-xs sm:text-sm mt-8">
												<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
												</svg>
												<span class="text-center">คลิกเพื่อพลิกการ์ด หรือกด Space/Enter</span>
											</div>
										</div>
									</div>

									<!-- Enhanced Back Face with Generous Padding -->
									<div
										class="absolute w-full h-full px-16 py-20 lg:px-24 lg:py-28 flex items-center justify-center bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl hover:border-green-500/30 transition-all duration-300 overflow-hidden"
										style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);"
									>
										<div class="text-center max-w-full w-full h-full flex flex-col justify-center">
											<div class="mb-8">
												<span
													class="inline-flex items-center px-4 py-2 bg-green-500/20 backdrop-blur-sm text-green-300 rounded-full text-sm font-medium border border-green-500/30"
													>
													<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
													</svg>
													คำตอบ</span
												>
											</div>
											<div class="flex-1 flex items-center justify-center">
												<h2
													class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white leading-relaxed text-center break-words hyphens-auto max-w-full overflow-auto"
													style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
												>
													{@html renderLatex(flashcards[currentCardIndex].back)}
												</h2>
											</div>
											<div class="flex items-center justify-center space-x-2 text-gray-400 text-xs sm:text-sm mt-8">
												<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
												</svg>
												<span class="text-center">คลิกเพื่อพลิกการ์ด หรือกด Space/Enter</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Compact Navigation Controls -->
							<div class="flex justify-between items-center mb-6">
								<button
									onclick={prevCard}
									disabled={currentCardIndex === 0}
									class="flex items-center px-6 py-3 bg-slate-700/70 hover:bg-slate-600/70 disabled:bg-slate-800/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 backdrop-blur-sm transform hover:scale-105 disabled:transform-none shadow-lg text-sm"
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 19l-7-7 7-7"
										></path></svg
									>
									<span class="hidden sm:inline">ก่อนหน้า</span>
								</button>
								
								<button
									onclick={flipCard}
									class="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 flex items-center transform hover:scale-105 shadow-lg font-medium text-sm"
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										></path></svg
									>
									<span class="hidden sm:inline">พลิกการ์ด</span>
								</button>
								<button
									onclick={nextCard}
									disabled={currentCardIndex === flashcards.length - 1}
									class="flex items-center px-6 py-3 bg-slate-700/70 hover:bg-slate-600/70 disabled:bg-slate-800/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 backdrop-blur-sm transform hover:scale-105 disabled:transform-none shadow-lg text-sm"
								>
									<span class="hidden sm:inline">ถัดไป</span>
									<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										></path></svg
									>
								</button>
							</div>

							<!-- Compact Action Buttons -->
							<div class="flex flex-row gap-3 justify-center mb-6">
								<button
									onclick={resetUpload}
									class="px-4 py-2 border border-gray-600/70 hover:border-red-400/70 text-gray-300 hover:text-red-300 rounded-lg transition-all duration-300 flex items-center justify-center backdrop-blur-sm hover:bg-red-500/5 text-sm"
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
										></path></svg
									>
									<span class="hidden sm:inline">อัปโหลดไฟล์ใหม่</span>
									<span class="sm:hidden">ไฟล์ใหม่</span>
								</button>
								<button
									onclick={exportToAnki}
									class="px-4 py-2 border border-gray-600/70 hover:border-green-400/70 text-gray-300 hover:text-green-300 rounded-lg transition-all duration-300 flex items-center justify-center backdrop-blur-sm hover:bg-green-500/5 text-sm"
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
										></path></svg
									>
									<span class="hidden sm:inline">ส่งออกไปยัง Anki</span>
									<span class="sm:hidden">Export</span>
								</button>
							</div>

							<!-- Compact Keyboard Shortcuts Info -->
							<div
								class="p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700/30 text-center"
							>
								<div class="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-gray-400">
									<span class="flex items-center">
										<kbd class="px-2 py-1 mr-1.5 bg-gray-900/50 border border-gray-700 rounded text-xs font-mono shadow-inner"
											>←</kbd
										> 
										<span>ก่อนหน้า</span>
									</span>
									<span class="flex items-center">
										<kbd class="px-2 py-1 mr-1.5 bg-gray-900/50 border border-gray-700 rounded text-xs font-mono shadow-inner"
											>→</kbd
										> 
										<span>ถัดไป</span>
									</span>
									<span class="flex items-center">
										<kbd class="px-2 py-1 mr-1.5 bg-gray-900/50 border border-gray-700 rounded text-xs font-mono shadow-inner"
											>Space</kbd
										> 
										<span>พลิก</span>
									</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		</div>
	</section>

	<!-- Enhanced Features Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30 backdrop-blur-sm">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-3xl lg:text-4xl font-bold text-white mb-6">ทำไมต้องใช้ PDF to Flashcards?</h2>
				<p class="text-xl text-gray-300 max-w-3xl mx-auto">
					เครื่องมือที่ช่วยให้การเรียนรู้มีประสิทธิภาพมากขึ้น
				</p>
			</div>
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				<div
					class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 group hover:transform hover:scale-105"
				>
					<div
						class="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors duration-300"
					>
						<svg class="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							></path></svg
						>
					</div>
					<h3 class="text-xl font-semibold text-white mb-3">รวดเร็วและง่าย</h3>
					<p class="text-gray-400 leading-relaxed">แปลงเอกสาร PDF เป็นแฟลชการ์ดได้ในไม่กี่คลิก ประหยัดเวลาในการสร้างสื่อการเรียน</p>
				</div>
				<div
					class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 group hover:transform hover:scale-105"
				>
					<div
						class="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors duration-300"
					>
						<svg class="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							></path></svg
						>
					</div>
					<h3 class="text-xl font-semibold text-white mb-3">AI ที่ชาญฉลาด</h3>
					<p class="text-gray-400 leading-relaxed">ใช้ AI ในการสกัดและจัดระเบียบเนื้อหาอย่างอัตโนมัติ สร้างคำถาม-คำตอบที่มีคุณภาพ</p>
				</div>
				<div
					class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 group hover:transform hover:scale-105"
				>
					<div
						class="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/30 transition-colors duration-300"
					>
						<svg class="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							></path></svg
						>
					</div>
					<h3 class="text-xl font-semibold text-white mb-3">ติดตามความคืบหน้า</h3>
					<p class="text-gray-400 leading-relaxed">ดูความคืบหน้าการเรียนรู้และสถิติการทบทวน เพื่อการเรียนที่มีประสิทธิภาพ</p>
				</div>
			</div>
		</div>
	</section>
</main>

<Footer />

<style>
	.rotateY-180 {
		transform: rotateY(180deg);
	}

	kbd {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
			monospace;
	}

	/* Enhanced hover effects */
	@keyframes float {
		0%, 100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.group:hover .animate-float {
		animation: float 3s ease-in-out infinite;
	}

	/* Smooth transitions for all interactive elements */
	* {
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Custom scrollbar for better aesthetics */
	::-webkit-scrollbar {
		width: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgba(30, 41, 59, 0.5);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(59, 130, 246, 0.5);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(59, 130, 246, 0.7);
	}
/* Ensure long equations scroll horizontally instead of overflowing */
	.katex-display {
		overflow-x: auto;
	}
</style>