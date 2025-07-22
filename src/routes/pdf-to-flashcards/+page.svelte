<!-- PDF to Flashcards Conversion Page -->
<script lang="ts">
	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
	import { t } from '../../lib/i18n.js';
	import { onMount } from 'svelte';

	// State management
	let isDragOver = $state(false);
	let isProcessing = $state(false);
	let uploadedFile: File | null = $state(null);
	let flashcards: Array<{id: string, front: string, back: string}> = $state([]);
	let currentCardIndex = $state(0);
	let isFlipped = $state(false);
	let processingProgress = $state(0);
	let errorMessage = $state('');

	// File upload handling
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
		
		if (file.size > 10 * 1024 * 1024) { // 10MB limit
			errorMessage = 'ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB';
			return;
		}

		uploadedFile = file;
		errorMessage = '';
	}

	// Mock PDF processing function
	async function processPDF() {
		if (!uploadedFile) return;
		
		isProcessing = true;
		processingProgress = 0;
		errorMessage = '';

		try {
			// Simulate processing with progress
			for (let i = 0; i <= 100; i += 10) {
				processingProgress = i;
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			// Mock flashcards generation
			const mockFlashcards = [
				{
					id: '1',
					front: 'What is the derivative of f(x) = x²?',
					back: 'The derivative of f(x) = x² is f\'(x) = 2x'
				},
				{
					id: '2',
					front: 'Define photosynthesis',
					back: 'Photosynthesis is the process by which plants convert light energy into chemical energy'
				},
				{
					id: '3',
					front: 'What is the capital of Thailand?',
					back: 'Bangkok (กรุงเทพมหานคร)'
				},
				{
					id: '4',
					front: 'Explain Newton\'s First Law',
					back: 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force'
				},
				{
					id: '5',
					front: 'What is the chemical formula for water?',
					back: 'H₂O (two hydrogen atoms and one oxygen atom)'
				}
			];

			flashcards = mockFlashcards;
			currentCardIndex = 0;
			isFlipped = false;
		} catch (error) {
			errorMessage = 'เกิดข้อผิดพลาดในการประมวลผล PDF กรุณาลองใหม่อีกครั้ง';
		} finally {
			isProcessing = false;
		}
	}

	// Flashcard navigation
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

	// Reset function
	function resetUpload() {
		uploadedFile = null;
		flashcards = [];
		currentCardIndex = 0;
		isFlipped = false;
		processingProgress = 0;
		errorMessage = '';
		isProcessing = false;
	}

	// Keyboard shortcuts
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
									class="px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-lg transition-colors duration-300"
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
				<div class="max-w-4xl mx-auto">
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

					<!-- Flashcard -->
					<div class="relative mb-8">
						<div 
							class="bg-slate-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 lg:p-12 min-h-[400px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:border-blue-500/50 {isFlipped ? 'transform rotateY-180' : ''}"
							role="button"
							tabindex="0"
							aria-label="Click to flip flashcard"
							onclick={flipCard}
							onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? flipCard() : null}
						>
							<div class="text-center">
								{#if !isFlipped}
									<div class="mb-4">
										<span class="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
											คำถาม
										</span>
									</div>
									<h2 class="text-2xl lg:text-3xl font-semibold text-white mb-6 leading-relaxed">
										{flashcards[currentCardIndex].front}
									</h2>
								{:else}
									<div class="mb-4">
										<span class="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
											คำตอบ
										</span>
									</div>
									<h2 class="text-2xl lg:text-3xl font-semibold text-white mb-6 leading-relaxed">
										{flashcards[currentCardIndex].back}
									</h2>
								{/if}
								
								<p class="text-gray-400 text-sm">
									คลิกเพื่อพลิกการ์ด หรือกด Space/Enter
								</p>
							</div>
						</div>
					</div>

					<!-- Navigation Controls -->
					<div class="flex justify-between items-center mb-8">
						<button 
							onclick={prevCard}
							disabled={currentCardIndex === 0}
							class="flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 text-white rounded-lg transition-colors duration-300"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
							</svg>
							ก่อนหน้า
						</button>

						<button 
							onclick={flipCard}
							class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 flex items-center"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
							</svg>
							พลิกการ์ด
						</button>

						<button 
							onclick={nextCard}
							disabled={currentCardIndex === flashcards.length - 1}
							class="flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 text-white rounded-lg transition-colors duration-300"
						>
							ถัดไป
							<svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</button>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-col sm:flex-row gap-4 justify-center">
						<button 
							onclick={resetUpload}
							class="px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors duration-300 flex items-center justify-center"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
							</svg>
							อัปโหลดไฟล์ใหม่
						</button>
						
						<button class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-300 flex items-center justify-center">
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
							</svg>
							บันทึกแฟลชการ์ด
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
				<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">
					ทำไมต้องใช้ PDF to Flashcards?
				</h2>
				<p class="text-xl text-gray-300 max-w-3xl mx-auto">
					เครื่องมือที่ช่วยให้การเรียนรู้มีประสิทธิภาพมากขึ้น
				</p>
			</div>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				<div class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-colors duration-300">
					<div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">รวดเร็วและง่าย</h3>
					<p class="text-gray-400">แปลงเอกสาร PDF เป็นแฟลชการ์ดได้ในไม่กี่คลิก</p>
				</div>

				<div class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-colors duration-300">
					<div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">AI ที่ชาญฉลาด</h3>
					<p class="text-gray-400">ใช้ AI ในการสกัดและจัดระเบียบเนื้อหาอย่างอัตโนมัติ</p>
				</div>

				<div class="bg-slate-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-green-500/50 transition-colors duration-300">
					<div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
						<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
						</svg>
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
	@keyframes float-gentle {
		0%, 100% { transform: translateY(0px) translateX(0px); }
		25% { transform: translateY(-6px) translateX(2px); }
		50% { transform: translateY(-12px) translateX(-1px); }
		75% { transform: translateY(-6px) translateX(1px); }
	}
	


	/* Flashcard flip animation */
	.rotateY-180 {
		transform: rotateY(180deg);
	}

	/* Keyboard shortcut styling */
	kbd {
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
	}
</style>
