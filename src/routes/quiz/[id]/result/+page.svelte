<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	// Types
	interface QuestionDetail {
		question_id: string;
		user_answer: string;
		correct_answer: string;
		is_correct: boolean;
		why_answer_this_one: string;
		question: string;
	}

	interface QuizResult {
		id: string;
		userId: string | null;
		score: number;
		total: number;
		completedAt: string;
		details: QuestionDetail[];
	}

	interface ExamResults {
		result: QuizResult;  // Changed from results array to single result
	}

	interface Statistics {
		totalTests: number;
		averageScore: number;
		bestScore: number;
		worstScore: number;
		totalQuestions: number;
		totalCorrect: number;
		accuracy: number;
	}

	// State variables
	let currentResult: QuizResult | null = null;
	let history: QuizResult[] = [];
	let statistics: Statistics | null = null;
	let activeTab = 'results';
	let filter: 'all' | 'correct' | 'incorrect' = 'all';
	let visibleQuestions = 4;
	let isLoading = true;
	let importData = '';
	let isImporting = false;
	let toastMessage = '';
	let showToast = false;

	// Default sample data
	const defaultExamResults: ExamResults = {
		results: [
			{
				id: "sample-1",
				userId: "user-1",
				score: 2,
				total: 10,
				completedAt: new Date().toISOString(),
				details: [
					{
						question_id: "1",
						user_answer: "A",
						correct_answer: "B",
						is_correct: false,
						why_answer_this_one: "ลูกบอลทั้งหมด $$4+6=10$$ ลูก ความน่าจะเป็นที่ได้สีแดงคือ $$\\dfrac{4}{10} = \\dfrac{2}{5}$$ ดังนั้นคำตอบคือ B",
						question: "ถ้ามีลูกบอลสีแดง $$4$$ ลูกและสีน้ำเงิน $$6$$ ลูกในกล่อง จะสุ่มหยิบลูกบอล $$1$$ ลูก ความน่าจะเป็นที่หยิบได้ลูกบอลสีแดงคือข้อใด?"
					},
					{
						question_id: "2",
						user_answer: "C",
						correct_answer: "A",
						is_correct: false,
						why_answer_this_one: "มีตัวอักษร 4 ตัว (M, A, T, H) โอกาสได้ A คือ $$\\dfrac{1}{4}$$ ตอบข้อ A",
						question: "เมื่อต้องการสุ่มเลือกตัวอักษรจากคำว่า 'MATH' ความน่าจะเป็นที่จะเลือกได้ตัวอักษร 'A' คือข้อใด?"
					}
				]
			}
		],
		history: []
	};

	// Utility functions
	function showToastMessage(message: string) {
		toastMessage = message;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('th-TH', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPercentage(num: number) {
		return Math.round(num * 10) / 10;
	}

	function getScoreColor(score: number, total: number) {
		const percentage = (score / total) * 100;
		if (percentage >= 80) return "text-emerald-400";
		if (percentage >= 60) return "text-yellow-400";
		return "text-red-400";
	}

	function getProgressColor(percentage: number) {
		if (percentage >= 80) return "bg-gradient-to-r from-emerald-500 to-green-500";
		if (percentage >= 60) return "bg-gradient-to-r from-yellow-500 to-orange-500";
		return "bg-gradient-to-r from-red-500 to-orange-500";
	}

	// Storage functions
	function getExamResults(): ExamResults {
		if (!browser) return defaultExamResults;
		
		try {
			const stored = localStorage.getItem('examResults');
            const parsed = JSON.parse(stored);

            console.log(3)
			console.log(parsed);
			return parsed;
		} catch (error) {
			console.error("Failed to parse exam results from localStorage:", error);
			setExamResults(defaultExamResults);
			return defaultExamResults;
		}
	}

	function setExamResults(data: ExamResults) {
		if (!browser) return;
		
		try {
			localStorage.setItem('examResults', JSON.stringify(data));
		} catch (error) {
			console.error("Failed to save exam results to localStorage:", error);
		}
	}

	function getStatistics(): Statistics {
		const data = getExamResults();
		const allResults = [...data.results, ...data.history];
		
		if (allResults.length === 0) {
			return {
				totalTests: 0,
				averageScore: 0,
				bestScore: 0,
				worstScore: 0,
				totalQuestions: 0,
				totalCorrect: 0,
				accuracy: 0
			};
		}

		const scores = allResults.map(r => (r.score / r.total) * 100);
		const totalQuestions = allResults.reduce((sum, r) => sum + r.total, 0);
		const totalCorrect = allResults.reduce((sum, r) => sum + r.score, 0);

		return {
			totalTests: allResults.length,
			averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
			bestScore: Math.max(...scores),
			worstScore: Math.min(...scores),
			totalQuestions,
			totalCorrect,
			accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0
		};
	}

	function loadData() {
		isLoading = true;
		try {
			const data = getExamResults();
			currentResult = data.result;  // Changed from data.results[0]
			history = [];  // Since we don't have history in new structure
			statistics = getStatistics();
		} catch (error) {
			showToastMessage("ไม่สามารถโหลดข้อมูลจาก localStorage ได้");
		} finally {
			isLoading = false;
		}
	}

	function handleSelectHistoryResult(result: QuizResult) {
		currentResult = result;
		activeTab = 'results';
		filter = 'all';
		visibleQuestions = 4;
	}

	function handleFilter(newFilter: 'all' | 'correct' | 'incorrect') {
		filter = newFilter;
		visibleQuestions = 4;
	}

	function loadMoreQuestions() {
		visibleQuestions += 4;
	}

	async function shareResults() {
		if (!currentResult) return;
		
		if (navigator.share) {
			try {
				await navigator.share({
					title: 'ผลการสอบของฉัน - ExamTie',
					text: `ฉันได้คะแนน ${currentResult.score}/${currentResult.total} ในข้อสอบ`,
					url: window.location.href
				});
			} catch (err) {
				showToastMessage("ไม่สามารถแชร์ได้");
			}
		} else {
			try {
				await navigator.clipboard.writeText(
					`ฉันได้คะแนน ${currentResult.score}/${currentResult.total} ในข้อสอบ ExamTie`
				);
				showToastMessage("คัดลอกแล้ว");
			} catch (err) {
				showToastMessage("ไม่สามารถแชร์ได้");
			}
		}
	}

	function handleExport() {
		try {
			const data = JSON.stringify(getExamResults(), null, 2);
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `exam-results-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			showToastMessage("ส่งออกสำเร็จ");
		} catch (error) {
			showToastMessage("ไม่สามารถส่งออกข้อมูลได้");
		}
	}

	function handleImport() {
		if (!importData.trim()) {
			showToastMessage("กรุณาใส่ข้อมูล JSON");
			return;
		}

		try {
			const parsed = JSON.parse(importData);
			if (parsed.results && Array.isArray(parsed.results)) {
				setExamResults(parsed);
				showToastMessage("นำเข้าสำเร็จ");
				importData = '';
				isImporting = false;
				loadData();
			} else {
				showToastMessage("รูปแบบข้อมูลไม่ถูกต้อง");
			}
		} catch {
			showToastMessage("รูปแบบข้อมูลไม่ถูกต้อง");
		}
	}

	function handleClear() {
		if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด?")) {
			if (browser) {
				localStorage.removeItem('examResults');
			}
			showToastMessage("ลบข้อมูลแล้ว");
			loadData();
		}
	}

	function handleReset() {
		if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลเป็นค่าเริ่มต้น?")) {
			if (browser) {
				localStorage.removeItem('examResults');
			}
			loadData();
			showToastMessage("รีเซ็ตแล้ว");
		}
	}

	function renderMath(element: HTMLElement) {
		if (typeof window !== 'undefined' && window.renderMathInElement) {
			window.renderMathInElement(element, {
				delimiters: [
					{ left: "$$", right: "$$", display: true },
					{ left: "$", right: "$", display: false },
					{ left: "\\(", right: "\\)", display: false },
					{ left: "\\[", right: "\\]", display: true }
				],
				throwOnError: false
			});
		}
	}

	onMount(() => {
		loadData();
	});

	// Add these with other state variables at the top
	let filteredQuestions: QuestionDetail[] = [];
	let displayedQuestions: QuestionDetail[] = [];
	let hasMoreQuestions = false;

	// Update the reactive statement
	$: if (currentResult) {
		const questions = currentResult.details;
		filteredQuestions = questions.filter(q => {
			if (filter === 'correct') return q.is_correct;
			if (filter === 'incorrect') return !q.is_correct;
			return true;
		});
		displayedQuestions = filteredQuestions.slice(0, visibleQuestions);
		hasMoreQuestions = filteredQuestions.length > visibleQuestions;
	}

	$: percentage = currentResult ? Math.round((currentResult.score / currentResult.total) * 100) : 0;
</script>

<svelte:head>
	<title>ผลการสอบ - ExamTie</title>
	<meta name="description" content="ดูผลการสอบและรายละเอียดคำตอบพร้อมคำอธิบายแบบครบถ้วน - ExamTie แพลตฟอร์มการเรียนรู้ออนไลน์" />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
	<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
	<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
</svelte:head>

{#if isLoading}
	<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center">
		<div class="text-white text-lg">กำลังโหลดผลการสอบ...</div>
	</div>
{:else if !currentResult}
	<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-400 text-lg mb-4">ไม่พบข้อมูลผลการสอบ</div>
			<button 
				class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
				on:click={() => {
					setExamResults(defaultExamResults);
					loadData();
				}}
			>
				สร้างข้อมูลตัวอย่าง
			</button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-slate-900 text-white font-sans">
		<!-- Background with animated particles -->
		<div class="fixed inset-0 overflow-hidden">
			<div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950"></div>
			
			<!-- Floating particles -->
			<div class="absolute inset-0 pointer-events-none">
				<div class="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-green-400/10 rounded-full blur-xl animate-pulse"></div>
				<div class="absolute top-40 right-16 w-24 h-24 bg-gradient-to-br from-blue-500/25 to-cyan-400/15 rounded-full blur-lg animate-pulse" style="animation-delay: 1s"></div>
				<div class="absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-400/10 rounded-full blur-md animate-pulse" style="animation-delay: 2s"></div>
			</div>
			
			<!-- Subtle grid pattern -->
			<div 
				class="absolute inset-0 opacity-5" 
				style="background-image: radial-gradient(circle at 2px 2px, rgba(34, 197, 94, 0.3) 1px, transparent 0); background-size: 40px 40px;"
			></div>
		</div>

		<!-- Navigation Header -->
		<nav class="relative z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between h-16">
					<div class="flex items-center space-x-4">
						<div class="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
							ExamTie
						</div>
						<div class="text-slate-400 text-sm hidden sm:block">
							ผลการสอบ
						</div>
					</div>
					<div class="flex items-center space-x-3">
						<button 
							class="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2"
							on:click={loadData}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
							</svg>
							<span class="hidden sm:inline">รีเฟรช</span>
						</button>
						<button class="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
							</svg>
							<span class="hidden sm:inline">หน้าหลัก</span>
						</button>
						<button class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
							</svg>
							<span>ทำข้อสอบใหม่</span>
						</button>
					</div>
				</div>
			</div>
		</nav>

		<!-- Main Content -->
		<main class="relative z-10 min-h-screen pt-8 pb-16">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				
				<!-- Tabs -->
				<div class="w-full mb-8">
					<div class="flex space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm transition-colors"
							class:bg-slate-600={activeTab === 'results'}
							class:text-white={activeTab === 'results'}
							class:text-slate-300={activeTab !== 'results'}
							on:click={() => activeTab = 'results'}
						>
							<span>ผลลัพธ์</span>
						</button>
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm transition-colors"
							class:bg-slate-600={activeTab === 'statistics'}
							class:text-white={activeTab === 'statistics'}
							class:text-slate-300={activeTab !== 'statistics'}
							on:click={() => activeTab = 'statistics'}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							<span>สถิติ</span>
						</button>
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm transition-colors"
							class:bg-slate-600={activeTab === 'history'}
							class:text-white={activeTab === 'history'}
							class:text-slate-300={activeTab !== 'history'}
							on:click={() => activeTab = 'history'}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<span>ประวัติ</span>
						</button>
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm transition-colors"
							class:bg-slate-600={activeTab === 'settings'}
							class:text-white={activeTab === 'settings'}
							class:text-slate-300={activeTab !== 'settings'}
							on:click={() => activeTab = 'settings'}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
							</svg>
							<span>ตั้งค่า</span>
						</button>
					</div>
				</div>

				{#if activeTab === 'results'}
					<!-- Results Overview -->
					<div class="mb-8">
						<div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-6 sm:p-8">
							<div class="text-center">
								<div class="mb-4">
									<span class="bg-blue-100/10 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-full text-sm">
										ผลการสอบเสร็จสิ้น
									</span>
								</div>
								
								<!-- Score Display -->
								<div class="mb-6">
									<div class="text-6xl sm:text-7xl font-bold mb-2">
										<span class="text-white">{currentResult.score}</span>
										<span class="text-slate-400">/</span>
										<span class="text-slate-300">{currentResult.total}</span>
									</div>
									<div class="text-xl text-slate-300">คะแนนที่ได้</div>
									<div class="mt-2">
										<div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
											<div 
												class="h-3 rounded-full transition-all duration-1000 ease-out {getProgressColor(percentage)}"
												style="width: {percentage}%"
											></div>
										</div>
										<div class="text-sm text-slate-400 mt-2">{percentage}% ถูกต้อง</div>
									</div>
								</div>
								
								<!-- Performance Summary -->
								<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
									<div class="bg-slate-700/30 rounded-lg p-4">
										<div class="text-2xl font-bold text-emerald-400">{currentResult.score}</div>
										<div class="text-sm text-slate-300">ตอบถูก</div>
									</div>
									<div class="bg-slate-700/30 rounded-lg p-4">
										<div class="text-2xl font-bold text-red-400">{currentResult.total - currentResult.score}</div>
										<div class="text-sm text-slate-300">ตอบผิด</div>
									</div>
									<div class="bg-slate-700/30 rounded-lg p-4">
										<div class="text-2xl font-bold text-slate-400">15</div>
										<div class="text-sm text-slate-300">นาที</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Question Results Section -->
					<div class="space-y-6">
						<div class="flex items-center justify-between">
							<h2 class="text-2xl font-bold text-white">รายละเอียดข้อสอบ</h2>
							<div class="flex space-x-2">
								<button
									class="px-3 py-1 text-sm rounded-lg transition-colors"
									class:bg-slate-600={filter === 'all'}
									class:text-white={filter === 'all'}
									class:bg-slate-700={filter !== 'all'}
									class:text-slate-300={filter !== 'all'}
									on:click={() => handleFilter('all')}
								>
									ทั้งหมด
								</button>
								<button
									class="px-3 py-1 text-sm rounded-lg transition-colors bg-red-600/20 hover:bg-red-600/30 text-red-300"
									class:bg-red-600={filter === 'incorrect'}
									class:text-white={filter === 'incorrect'}
									on:click={() => handleFilter('incorrect')}
								>
									ตอบผิด
								</button>
								<button
									class="px-3 py-1 text-sm rounded-lg transition-colors bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300"
									class:bg-emerald-600={filter === 'correct'}
									class:text-white={filter === 'correct'}
									on:click={() => handleFilter('correct')}
								>
									ตอบถูก
								</button>
							</div>
						</div>

						<!-- Question Results -->
						{#if displayedQuestions}
							<div class="space-y-6">
								{#each displayedQuestions as question, index}
									<div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-6">
										<div class="flex items-start justify-between mb-4">
											<div class="flex items-center space-x-3">
												<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border {
													question.is_correct 
														? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
														: 'bg-red-500/20 text-red-400 border-red-500/30'
												}">
													{question.question_id}
												</div>
												<span class="px-2 py-1 rounded text-xs {
													question.is_correct ? 'text-emerald-400 bg-emerald-500/20' : 'text-red-400 bg-red-500/20'
												}">
													{question.is_correct ? 'ตอบถูก' : 'ตอบผิด'}
												</span>
											</div>
											<div class="text-sm text-slate-400">
												คำถาม {question.question_id} จาก {currentResult.total}
											</div>
										</div>
										
										<!-- Question Text -->
										<div class="mb-6">
											<div class="text-lg text-white mb-4" use:renderMath>
												{question.question}
											</div>
										</div>
										
										<!-- Answer Comparison -->
										<div class="grid md:grid-cols-2 gap-4 mb-6">
											<div class="border rounded-lg p-4 {
												question.is_correct 
													? 'bg-emerald-500/10 border-emerald-500/30'
													: 'bg-red-500/10 border-red-500/30'
											}">
												<div class="text-sm mb-2 {
													question.is_correct ? 'text-emerald-300' : 'text-red-300'
												}">
													คำตอบของคุณ
												</div>
												<div class="text-lg font-medium text-white">
													{question.user_answer}
												</div>
											</div>
											<div class="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
												<div class="text-sm text-emerald-300 mb-2">คำตอบที่ถูกต้อง</div>
												<div class="text-lg font-medium text-white">
													{question.correct_answer}
												</div>
											</div>
										</div>
										
										<!-- Explanation -->
										<div class="bg-slate-700/30 rounded-lg p-4">
											<div class="text-sm text-slate-300 mb-2">คำอธิบาย</div>
											<div class="text-white" use:renderMath>
												{question.why_answer_this_one}
											</div>
										</div>
									</div>
								{/each}
							</div>

							<!-- Show More Button -->
							{#if hasMoreQuestions}
								<div class="text-center pt-6">
									<button 
										class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
										on:click={loadMoreQuestions}
									>
										แสดงข้อถัดไป ({filteredQuestions.length - visibleQuestions} ข้อเหลือ)
									</button>
								</div>
							{/if}
						{/if}

						<!-- Action Buttons -->
						<div class="mt-12 text-center space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
							<button class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg">
								ทำข้อสอบใหม่
							</button>
							<button class="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg">
								กลับไปหน้าหลัก
							</button>
							<button 
								class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
								on:click={shareResults}
							>
								แชร์ผลลัพธ์
							</button>
						</div>
					</div>
				{:else if activeTab === 'statistics' && statistics}
					<!-- Statistics Card -->
					<div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-6">
						<div class="flex items-center space-x-3 mb-6">
							<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							<h3 class="text-xl font-semibold text-white">สถิติการสอบ</h3>
						</div>
						
						<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div class="bg-slate-700/30 rounded-lg p-4 text-center">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-white">{statistics.totalTests}</div>
								<div class="text-sm text-slate-300">ครั้งที่สอบ</div>
							</div>
							
							<div class="bg-slate-700/30 rounded-lg p-4 text-center">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-white">{formatPercentage(statistics.averageScore)}%</div>
								<div class="text-sm text-slate-300">คะแนนเฉลี่ย</div>
							</div>
							
							<div class="bg-slate-700/30 rounded-lg p-4 text-center">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-white">{formatPercentage(statistics.bestScore)}%</div>
								<div class="text-sm text-slate-300">คะแนนสูงสุด</div>
							</div>
							
							<div class="bg-slate-700/30 rounded-lg p-4 text-center">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-white">{formatPercentage(statistics.accuracy)}%</div>
								<div class="text-sm text-slate-300">ความแม่นยำ</div>
							</div>
						</div>
						
						<div class="mt-4 pt-4 border-t border-slate-700/50">
							<div class="text-sm text-slate-400 text-center">
								ตอบถูก {statistics.totalCorrect} จาก {statistics.totalQuestions} ข้อ ทั้งหมด
							</div>
						</div>
					</div>
				{:else if activeTab === 'history'}
					<!-- History Card -->
					<div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-6">
						<div class="flex items-center space-x-3 mb-6">
							<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<h3 class="text-xl font-semibold text-white">ประวัตการสอบ</h3>
							{#if history.length > 0}
								<span class="ml-auto bg-slate-600 text-slate-200 px-2 py-1 rounded text-sm">
									{history.length} ครั้ง
								</span>
							{/if}
						</div>
						
						{#if history.length === 0}
							<div class="text-center py-8">
								<div class="text-slate-400 mb-2">ยังไม่มีประวัตการสอบ</div>
								<div class="text-sm text-slate-500">เมื่อคุณทำข้อสอบมากขึ้น ประวัติจะแสดงที่นี่</div>
							</div>
						{:else}
							<div class="space-y-3 max-h-96 overflow-y-auto">
								{#each history as result, index}
									{@const resultPercentage = Math.round((result.score / result.total) * 100)}
									{@const prevResult = history[index + 1]}
									{@const trend = prevResult ? (result.score / result.total) - (prevResult.score / prevResult.total) : 0}
									
									<div
										class="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors cursor-pointer"
										on:click={() => handleSelectHistoryResult(result)}
									>
										<div class="flex items-center justify-between">
											<div class="flex items-center space-x-3">
												<div class="text-2xl font-bold {getScoreColor(result.score, result.total)}">
													{result.score}/{result.total}
												</div>
												<div>
													<div class="text-white font-medium">{resultPercentage}%</div>
													<div class="text-xs text-slate-400">
														{formatDate(result.completedAt)}
													</div>
												</div>
											</div>
											
											<div class="flex items-center space-x-2">
												{#if trend !== 0}
													<div class="flex items-center space-x-1 {trend > 0 ? 'text-emerald-400' : 'text-red-400'}">
														{#if trend > 0}
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
															</svg>
														{:else}
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
															</svg>
														{/if}
														<span class="text-xs">
															{Math.abs(Math.round(trend * 100))}%
														</span>
													</div>
												{/if}
												<span class="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
													ดูรายละเอียด
												</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'settings'}
					<!-- Export/Import Card -->
					<div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-6">
						<h3 class="text-xl font-semibold text-white mb-6">จัดการข้อมูล</h3>
						
						<div class="space-y-4">
							<!-- Export/Import Buttons -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
								<button
									class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2"
									on:click={handleExport}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
									</svg>
									<span>ส่งออก</span>
								</button>
								
								<button
									class="border border-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2"
									on:click={() => isImporting = !isImporting}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
									</svg>
									<span>นำเข้า</span>
								</button>
								
								<button
									class="border border-yellow-600 text-yellow-400 hover:bg-yellow-600/10 px-3 py-2 rounded-lg flex items-center space-x-2"
									on:click={handleReset}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
									</svg>
									<span>รีเซ็ต</span>
								</button>
								
								<button
									class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2"
									on:click={handleClear}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
									</svg>
									<span>ลบทั้งหมด</span>
								</button>
							</div>
							
							<!-- Import Section -->
							{#if isImporting}
								<div class="space-y-3 pt-4 border-t border-slate-700">
									<div class="text-sm text-slate-300">วาง JSON ข้อมูลผลการสอบ:</div>
									<textarea
										bind:value={importData}
										placeholder='x'
										class="w-full h-32 bg-slate-700/50 border border-slate-600 text-white rounded-lg p-3 resize-none"
									></textarea>
									<div class="flex space-x-2">
										<button 
											class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"
											on:click={handleImport}
										>
											นำเข้าข้อมูล
										</button>
										<button 
											class="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm"
											on:click={() => {isImporting = false; importData = "";}}
										>
											ยกเลิก
										</button>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>

	<!-- Toast Notification -->
	{#if showToast}
		<div class="fixed bottom-4 right-4 z-50 bg-slate-800 border border-slate-600 text-white px-4 py-3 rounded-lg shadow-lg">
			{toastMessage}
		</div>
	{/if}
{/if}

<style>
	:global(body) {
		font-family: 'Inter', system-ui, sans-serif;
		margin: 0;
		padding: 0;
	}
	
	:global(.katex) {
		font-size: 1.1em;
	}
	
	:global(.katex-display) {
		margin: 1em 0;
	}
</style>