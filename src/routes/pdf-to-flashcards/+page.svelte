<!-- PDF to Flashcards Conversion Page -->
<script lang="ts">
	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
	import { t } from '../../lib/i18n.js'; // Assuming i18n is not a core part of this request
	import { onMount } from 'svelte';
	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
	import { get } from 'svelte/store';
	import { auth } from '$lib/stores/auth';

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
				const errorDetail = errorData?.detail?.[0]?.msg || errorData?.detail || `Error: ${response.statusText}`;
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
	<meta name="description" content="Convert your PDF documents into interactive flashcards for better learning" />
</svelte:head>

<Header />

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
	<!-- Hero Section -->
	<section class="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
		<!-- Background decorations -->
		<div class="absolute inset-0">
			<div class="absolute top-20 left-10 w-24 h-24 bg-blue-500/10 rounded-full animate-pulse"></div>
			<div class="absolute bottom-16 right-16 w-32 h-32 bg-purple-500/5 rounded-full animate-bounce delay-300"></div>
			<div class="absolute top-1/2 left-1/4 w-16 h-16 bg-green-500/10 rounded-full animate-ping delay-700"></div>
		</div>

		<div class="max-w-6xl mx-auto relative">
			<!-- Page Header -->
			<div class="text-center mb-12 lg:mb-16">
				<div class="inline-flex items-center px-4 py-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 rounded-full text-sm font-medium mb-6">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
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

			{#if flashcards.length === 0}
				<!-- Upload Section -->
				<div class="max-w-2xl mx-auto">
					<div 
						class="relative border-2 border-dashed border-gray-600 hover:border-blue-400 transition-colors duration-300 rounded-2xl p-8 lg:p-12 text-center bg-slate-800/50 backdrop-blur-sm {isDragOver ? 'border-blue-400 bg-blue-500/10' : ''}"
						role="button"
						tabindex="0"
						aria-label="Drop PDF file here or click to upload"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
					>
						{#if !uploadedFile}
							<div class="mb-6">
								<svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
								</svg>
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
								class="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors duration-300"
							>
								<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
								</svg>
								เลือกไฟล์ PDF
							</label>
							
							<p class="text-sm text-gray-500 mt-4">
								รองรับไฟล์ PDF ขนาดไม่เกิน 10MB
							</p>
						{:else}
							<!-- File Selected -->
							<div class="mb-6">
								<svg class="w-16 h-16 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<h3 class="text-xl font-semibold text-white mb-2">ไฟล์พร้อมประมวลผล</h3>
								<p class="text-gray-400 mb-4">{uploadedFile.name}</p>
								<p class="text-sm text-gray-500 mb-6">
									ขนาดไฟล์: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
							
							<!-- Amount Input -->
							<div class="max-w-xs mx-auto mb-6">
								<label for="card-amount" class="block text-sm font-medium text-gray-300 mb-2">จำนวนแฟลชการ์ดที่ต้องการ (1-100)</label>
								<input 
									type="number"
									id="card-amount"
									bind:value={amount}
									min="1"
									max="100"
									class="w-full bg-slate-700 border border-gray-600 text-white rounded-lg p-2 text-center focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<div class="flex gap-4 justify-center">
								<button 
									onclick={processPDF}
									disabled={isProcessing}
									class="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-300 flex items-center"
								>
									{#if isProcessing}
										<svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										กำลังประมวลผล...
									{:else}
										<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
										</svg>
										สร้างแฟลชการ์ด
									{/if}
								</button>
								
								<button 
									onclick={resetUpload}
									disabled={isProcessing}
									class="px-6 py-3 border border-gray-600 hover:border-gray-500 disabled:opacity-50 text-gray-300 hover:text-white font-medium rounded-lg transition-colors duration-300"
								>
									เลือกไฟล์ใหม่
								</button>
							</div>

							{#if isProcessing}
								<div class="mt-6">
									<div class="w-full bg-gray-700 rounded-full h-2">
										<div 
											class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
											style="width: {processingProgress}%"
										></div>
									</div>
									<p class="text-sm text-gray-400 mt-2">{processingProgress}% เสร็จสิ้น</p>
								</div>
							{/if}
						{/if}

						{#if errorMessage}
							<div class="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
								<p class="text-red-300 text-sm">{errorMessage}</p>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Flashcards Display -->
				<div class="max-w-4xl mx-auto flex flex-col">
					<!-- Progress Bar -->
					<div class="mb-8">
						<div class="flex justify-between items-center mb-2">
							<span class="text-sm text-gray-400">ความคืบหน้า</span>
							<span class="text-sm text-blue-300">{currentCardIndex + 1} / {flashcards.length}</span>
						</div>
						<div class="w-full bg-gray-700 rounded-full h-2">
							<div 
								class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300" 
								style="width: {((currentCardIndex + 1) / flashcards.length) * 100}%"
							></div>
						</div>
					</div>

					<!-- Flashcard with 3D Flip -->
					<div 
						class="relative mb-8 min-h-[400px] cursor-pointer flex-1 flex items-center justify-center"
						style="perspective: 1200px;"
						role="button"
						tabindex="0"
						aria-label="Click to flip flashcard"
						onclick={flipCard}
						onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? flipCard() : null}
					>
						<div 
							class="relative w-full h-full transition-transform duration-700 ease-in-out" 
							style="transform-style: preserve-3d;"
							class:rotateY-180={isFlipped}
						>
							<!-- Front Face -->
							<div class="absolute w-full h-full p-8 lg:p-12 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl" style="backface-visibility: hidden; -webkit-backface-visibility: hidden;">
								<div class="text-center">
									<div class="mb-4">
										<span class="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">คำถาม</span>
									</div>
									<h2 class="text-2xl lg:text-3xl font-semibold text-white mb-6 leading-relaxed">{flashcards[currentCardIndex].front}</h2>
									<p class="text-gray-400 text-sm">คลิกเพื่อพลิกการ์ด หรือกด Space/Enter</p>
								</div>
							</div>
							
							<!-- Back Face -->
							<div class="absolute w-full h-full p-8 lg:p-12 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl" style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);">
								<div class="text-center">
									<div class="mb-4">
										<span class="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">คำตอบ</span>
									</div>
									<h2 class="text-2xl lg:text-3xl font-semibold text-white mb-6 leading-relaxed">{flashcards[currentCardIndex].back}</h2>
									<p class="text-gray-400 text-sm">คลิกเพื่อพลิกการ์ด หรือกด Space/Enter</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Navigation Controls -->
					<div class="flex justify-between items-center mb-8">
						<button 
							onclick={prevCard}
							disabled={currentCardIndex === 0}
							class="flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-300"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
							ก่อนหน้า
						</button>
						<button 
							onclick={flipCard}
							class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 flex items-center"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
							พลิกการ์ด
						</button>
						<button 
							onclick={nextCard}
							disabled={currentCardIndex === flashcards.length - 1}
							class="flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-300"
						>
							ถัดไป
							<svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
						</button>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-col sm:flex-row gap-4 justify-center">
						<button 
							onclick={resetUpload}
							class="px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors duration-300 flex items-center justify-center"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
							อัปโหลดไฟล์ใหม่
						</button>
						<button 
							onclick={exportToAnki}
							class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-300 flex items-center justify-center"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
							ส่งออกไปยัง Anki (.txt)
						</button>
					</div>

					<!-- Keyboard Shortcuts Info -->
					<div class="mt-8 p-4 bg-slate-800/50 rounded-lg border border-gray-700/50">
						<h3 class="text-sm font-medium text-gray-300 mb-2">คีย์บอร์ดลัด:</h3>
						<div class="flex flex-wrap gap-4 text-sm text-gray-400">
							<span><kbd class="px-2 py-1 bg-gray-700 rounded text-xs">←</kbd> ก่อนหน้า</span>
							<span><kbd class="px-2 py-1 bg-gray-700 rounded text-xs">→</kbd> ถัดไป</span>
							<span><kbd class="px-2 py-1 bg-gray-700 rounded text-xs">Space</kbd> พลิกการ์ด</span>
							<span><kbd class="px-2 py-1 bg-gray-700 rounded text-xs">Enter</kbd> พลิกการ์ด</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-12">
				<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">ทำไมต้องใช้ PDF to Flashcards?</h2>
				<p class="text-xl text-gray-300 max-w-3xl mx-auto">เครื่องมือที่ช่วยให้การเรียนรู้มีประสิทธิภาพมากขึ้น</p>
			</div>
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				<div class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-colors duration-300">
					<div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">รวดเร็วและง่าย</h3>
					<p class="text-gray-400">แปลงเอกสาร PDF เป็นแฟลชการ์ดได้ในไม่กี่คลิก</p>
				</div>
				<div class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-colors duration-300">
					<div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">AI ที่ชาญฉลาด</h3>
					<p class="text-gray-400">ใช้ AI ในการสกัดและจัดระเบียบเนื้อหาอย่างอัตโนมัติ</p>
				</div>
				<div class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-green-500/50 transition-colors duration-300">
					<div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">ติดตามความคืบหน้า</h3>
					<p class="text-gray-400">ดูความคืบหน้าการเรียนรู้และสถิติการทบทวน</p>
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
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo,
			monospace;
	}
</style>