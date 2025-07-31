<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Header from '../../../components/Header.svelte';
	import Footer from '../../../components/Footer.svelte';
	
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
		timeSpent?: number; // Time in seconds
	}

	interface ExamResults {
		result: QuizResult;  // Changed from results array to single result
		timeSpent?: number; // Backup time field
		examTitle?: string; // Add exam title field
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
	let timeSpentMinutes = 0;
	let examTitle = ''; // Add exam title state variable

	// Default sample data
	const defaultExamResults: ExamResults = {
		result: {
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
		if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400";
		if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
		return "text-red-600 dark:text-red-400";
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
		const allResults = data.result ? [data.result] : [];
		
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
			
			// Calculate time spent from the exam data
			if (currentResult) {
				timeSpentMinutes = calculateTimeSpent(data);
			}

			// Get exam title from stored data first, then fallback to loading
			examTitle = data.examTitle || '';
			if (!examTitle) {
				loadExamTitle();
			}
		} catch (error) {
			showToastMessage("ไม่สามารถโหลดข้อมูลจาก localStorage ได้");
		} finally {
			isLoading = false;
		}
	}

	async function loadExamTitle() {
		try {
			const examId = $page.params.id;
			
			// First, try to get exam title from AI exam data if it's an AI exam
			if (examId.startsWith('ai-')) {
				const tempExamData = localStorage.getItem('tempAiExam');
				if (tempExamData) {
					const aiExam = JSON.parse(tempExamData);
					examTitle = aiExam.title || 'AI Generated Exam';
					return;
				}
			}

			// For regular exams, try to fetch from the API or use a default
			const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
			
			// We can't make API calls easily from the result page, so let's check if we can get it from the result data
			// or use a generic title for now
			examTitle = 'Exam Results'; // Default fallback
			
		} catch (error) {
			console.error('Failed to load exam title:', error);
			examTitle = 'Exam Results'; // Fallback
		}
	}

	function calculateTimeSpent(data: ExamResults): number {
		// Try to get time from different possible locations
		if (currentResult?.timeSpent) {
			return Math.round(currentResult.timeSpent / 60); // Convert seconds to minutes
		}
		if (data.timeSpent) {
			return Math.round(data.timeSpent / 60); // Convert seconds to minutes
		}
		
		// For results from the API, check if there's a time_spent field
		if (currentResult && typeof currentResult === 'object' && 'time_spent' in currentResult) {
			const timeSpentSeconds = (currentResult as any).time_spent;
			if (typeof timeSpentSeconds === 'number' && timeSpentSeconds > 0) {
				return Math.round(timeSpentSeconds / 60); // Convert seconds to minutes
			}
		}
		
		// Final fallback: estimate based on question count (assume 1.5 minutes per question)
		if (currentResult?.total) {
			return Math.round(currentResult.total * 1.5);
		}
		
		return 15; // Ultimate fallback
	}

	function formatTimeSpent(minutes: number): string {
		if (minutes < 60) {
			return `${minutes} นาที`;
		} else {
			const hours = Math.floor(minutes / 60);
			const remainingMinutes = minutes % 60;
			if (remainingMinutes === 0) {
				return `${hours} ชั่วโมง`;
			}
			return `${hours} ชั่วโมง ${remainingMinutes} นาที`;
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
			if (parsed.result) {
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
	<title>{examTitle ? `${examTitle} - ผลการสอบ` : 'ผลการสอบ'} - ExamTie</title>
	<meta name="description" content="ดูผลการสอบและรายละเอียดคำตอบพร้อมคำอธิบายแบบครบถ้วน - ExamTie แพลตฟอร์มการเรียนรู้ออนไลน์" />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
	<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
	<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
</svelte:head>

{#if isLoading}
	<div class="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
		<div class="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
			<span>กำลังโหลดผลการสอบ...</span>
		</div>
	</div>
{:else if !currentResult}
	<div class="min-h-screen bg-gray-50 dark:bg-slate-900">
		<Header />
		<main class="pt-16 flex items-center justify-center min-h-screen">
			<div class="text-center">
				<div class="text-red-600 dark:text-red-400 text-lg mb-4">ไม่พบข้อมูลผลการสอบ</div>
				<button 
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
					on:click={() => {
						setExamResults(defaultExamResults);
						loadData();
					}}
				>
					สร้างข้อมูลตัวอย่าง
				</button>
			</div>
		</main>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 dark:bg-slate-900">
		<!-- Header -->
		<Header />
		
		<!-- Exam Title Header -->
		{#if examTitle}
		<div class="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{examTitle}</h1>
				<p class="text-sm text-gray-600 dark:text-slate-400 mt-1">ผลการสอบ</p>
			</div>
		</div>
		{/if}
		
		<!-- Main Content -->
		<main class="pt-16">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				
				<!-- Tabs -->
				<div class="w-full mb-8">
					<div class="flex space-x-1 bg-white dark:bg-slate-800/50 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors"
							class:bg-blue-600={activeTab === 'results'}
							class:text-white={activeTab === 'results'}
							class:shadow-sm={activeTab === 'results'}
							class:text-gray-600={activeTab !== 'results'}
							class:dark:text-gray-300={activeTab !== 'results'}
							class:hover:text-gray-900={activeTab !== 'results'}
							class:dark:hover:text-white={activeTab !== 'results'}
							on:click={() => activeTab = 'results'}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							<span>ผลลัพธ์</span>
						</button>
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors"
							class:bg-blue-600={activeTab === 'statistics'}
							class:text-white={activeTab === 'statistics'}
							class:shadow-sm={activeTab === 'statistics'}
							class:text-gray-600={activeTab !== 'statistics'}
							class:dark:text-gray-300={activeTab !== 'statistics'}
							class:hover:text-gray-900={activeTab !== 'statistics'}
							class:dark:hover:text-white={activeTab !== 'statistics'}
							on:click={() => activeTab = 'statistics'}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							<span>สถิติ</span>
						</button>
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors"
							class:bg-blue-600={activeTab === 'history'}
							class:text-white={activeTab === 'history'}
							class:shadow-sm={activeTab === 'history'}
							class:text-gray-600={activeTab !== 'history'}
							class:dark:text-gray-300={activeTab !== 'history'}
							class:hover:text-gray-900={activeTab !== 'history'}
							class:dark:hover:text-white={activeTab !== 'history'}
							on:click={() => activeTab = 'history'}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<span>ประวัติ</span>
						</button>
						<button 
							class="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors"
							class:bg-blue-600={activeTab === 'settings'}
							class:text-white={activeTab === 'settings'}
							class:shadow-sm={activeTab === 'settings'}
							class:text-gray-600={activeTab !== 'settings'}
							class:dark:text-gray-300={activeTab !== 'settings'}
							class:hover:text-gray-900={activeTab !== 'settings'}
							class:dark:hover:text-white={activeTab !== 'settings'}
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
						<div class="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 sm:p-8 shadow-lg backdrop-blur-sm">
							<div class="text-center">
								<div class="mb-6">
									<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800">
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
										</svg>
										ผลการสอบเสร็จสิ้น
									</span>
								</div>
								
								<!-- Score Display -->
								<div class="mb-8">
									<div class="text-6xl sm:text-7xl font-bold mb-2">
										<span class="text-gray-900 dark:text-white">{currentResult.score}</span>
										<span class="text-gray-400 dark:text-slate-400">/</span>
										<span class="text-gray-600 dark:text-slate-300">{currentResult.total}</span>
									</div>
									<div class="text-xl text-gray-600 dark:text-slate-300 mb-4">คะแนนที่ได้</div>
									<div class="max-w-xs mx-auto">
										<div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
											<div 
												class="{getProgressColor(percentage)} h-3 rounded-full transition-all duration-1000 ease-out"
												style="width: {percentage}%"
											></div>
										</div>
										<div class="text-sm text-gray-500 dark:text-slate-400">{percentage}% ถูกต้อง</div>
									</div>
								</div>
								
								<!-- Performance Summary -->
								<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
									<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-100 dark:border-slate-600/30">
										<div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{currentResult.score}</div>
										<div class="text-sm text-gray-600 dark:text-slate-300">ตอบถูก</div>
									</div>
									<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-100 dark:border-slate-600/30">
										<div class="text-2xl font-bold text-red-600 dark:text-red-400">{currentResult.total - currentResult.score}</div>
										<div class="text-sm text-gray-600 dark:text-slate-300">ตอบผิด</div>
									</div>
									<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-100 dark:border-slate-600/30">
										<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeSpentMinutes}</div>
										<div class="text-sm text-gray-600 dark:text-slate-300">{formatTimeSpent(timeSpentMinutes)}</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Question Results Section -->
					<div class="space-y-6">
						<div class="flex items-center justify-between">
							<h2 class="text-2xl font-bold text-gray-900 dark:text-white">รายละเอียดข้อสอบ</h2>
							<div class="flex space-x-2">
								<button
									class="px-3 py-2 text-sm rounded-lg transition-colors font-medium"
									class:bg-blue-600={filter === 'all'}
									class:text-white={filter === 'all'}
									class:bg-gray-200={filter !== 'all'}
									class:dark:bg-slate-700={filter !== 'all'}
									class:text-gray-600={filter !== 'all'}
									class:dark:text-slate-300={filter !== 'all'}
									class:hover:bg-gray-300={filter !== 'all'}
									class:dark:hover:bg-slate-600={filter !== 'all'}
									on:click={() => handleFilter('all')}
								>
									ทั้งหมด
								</button>
								<button
									class="px-3 py-2 text-sm rounded-lg transition-colors font-medium"
									class:bg-red-600={filter === 'incorrect'}
									class:text-white={filter === 'incorrect'}
									class:bg-red-100={filter !== 'incorrect'}
									class:text-red-600={filter !== 'incorrect'}
									class:hover:bg-red-200={filter !== 'incorrect'}
									on:click={() => handleFilter('incorrect')}
								>
									ตอบผิด
								</button>
								<button
									class="px-3 py-2 text-sm rounded-lg transition-colors font-medium"
									class:bg-emerald-600={filter === 'correct'}
									class:text-white={filter === 'correct'}
									class:bg-emerald-100={filter !== 'correct'}
									class:text-emerald-600={filter !== 'correct'}
									class:hover:bg-emerald-200={filter !== 'correct'}
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
									<div class="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm">
										<div class="flex items-start justify-between mb-4">
											<div class="flex items-center space-x-3">
												<div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-semibold text-sm">
													{index + 1}
												</div>
												<div class="flex items-center space-x-2">
													<span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium {
														question.is_correct 
															? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
															: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
													}">
														{question.is_correct ? '✓ ถูกต้อง' : '✗ ผิด'}
													</span>
												</div>
											</div>
										</div>
										
										<!-- Question Text -->
										<div class="mb-6">
											<div 
												class="text-gray-900 dark:text-white text-base leading-relaxed"
												bind:this={question.element}
												use:renderMath
											>
												{question.question}
											</div>
										</div>
										
										<!-- Answer Comparison -->
										<div class="grid md:grid-cols-2 gap-4 mb-6">
											<div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
												<div class="text-sm font-medium text-red-800 dark:text-red-400 mb-2">คำตอบของคุณ</div>
												<div class="text-red-900 dark:text-red-300 font-mono">{question.user_answer}</div>
											</div>
											<div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
												<div class="text-sm font-medium text-green-800 dark:text-green-400 mb-2">คำตอบที่ถูกต้อง</div>
												<div class="text-green-900 dark:text-green-300 font-mono">{question.correct_answer}</div>
											</div>
										</div>
										
										<!-- Explanation -->
										<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
											<div class="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">คำอธิบาย</div>
											<div 
												class="text-blue-900 dark:text-blue-300 text-sm leading-relaxed"
												bind:this={question.explanationElement}
												use:renderMath
											>
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
										class="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg transition-colors"
										on:click={loadMoreQuestions}
									>
										แสดงข้อถัดไป ({filteredQuestions.length - visibleQuestions} ข้อเหลือ)
									</button>
								</div>
							{/if}
						{/if}

						<!-- Action Buttons -->
						<div class="mt-12 text-center space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
							<a href="/exams" class="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
								</svg>
								ทำข้อสอบใหม่
							</a>
							<a href="/" class="w-full sm:w-auto inline-flex items-center justify-center bg-gray-600 dark:bg-slate-700 hover:bg-gray-700 dark:hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
								</svg>
								กลับไปหน้าหลัก
							</a>
							<button 
								class="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
								on:click={shareResults}
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
								</svg>
								แชร์ผลลัพธ์
							</button>
						</div>
					</div>

				{:else if activeTab === 'statistics' && statistics}
					<!-- Statistics Card -->
					<div class="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
						<div class="flex items-center space-x-3 mb-6">
							<svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							<h3 class="text-xl font-semibold text-gray-900 dark:text-white">สถิติการสอบ</h3>
						</div>
						
						<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center border border-gray-100 dark:border-slate-600/30">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalTests}</div>
								<div class="text-sm text-gray-600 dark:text-slate-300">ครั้งที่สอบ</div>
							</div>
							
							<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center border border-gray-100 dark:border-slate-600/30">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-gray-900 dark:text-white">{formatPercentage(statistics.averageScore)}%</div>
								<div class="text-sm text-gray-600 dark:text-slate-300">คะแนนเฉลี่ย</div>
							</div>
							
							<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center border border-gray-100 dark:border-slate-600/30">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-gray-900 dark:text-white">{formatPercentage(statistics.bestScore)}%</div>
								<div class="text-sm text-gray-600 dark:text-slate-300">คะแนนสูงสุด</div>
							</div>
							
							<div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center border border-gray-100 dark:border-slate-600/30">
								<div class="flex items-center justify-center mb-2">
									<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
									</svg>
								</div>
								<div class="text-2xl font-bold text-gray-900 dark:text-white">{formatPercentage(statistics.accuracy)}%</div>
								<div class="text-sm text-gray-600 dark:text-slate-300">ความแม่นยำ</div>
							</div>
						</div>
						
						<div class="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/50">
							<div class="text-sm text-gray-500 dark:text-slate-400 text-center">
								ตอบถูก {statistics.totalCorrect} จาก {statistics.totalQuestions} ข้อ ทั้งหมด
							</div>
						</div>
					</div>

				{:else if activeTab === 'history'}
					<!-- History Card -->
					<div class="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
						<div class="flex items-center space-x-3 mb-6">
							<svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<h3 class="text-xl font-semibold text-gray-900 dark:text-white">ประวัตการสอบ</h3>
							{#if history.length > 0}
								<span class="ml-auto bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 px-2 py-1 rounded text-sm">
									{history.length} ครั้ง
								</span>
							{/if}
						</div>
						
						{#if history.length === 0}
							<div class="text-center py-8">
								<div class="text-gray-500 dark:text-slate-400 mb-2">ยังไม่มีประวัตการสอบ</div>
								<div class="text-sm text-gray-400 dark:text-slate-500">เมื่อคุณทำข้อสอบมากขึ้น ประวัติจะแสดงที่นี่</div>
							</div>
						{:else}
							<div class="space-y-3 max-h-96 overflow-y-auto">
								{#each history as result, index}
									{@const resultPercentage = Math.round((result.score / result.total) * 100)}
									
									<button
										class="w-full bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-left border border-gray-200 dark:border-slate-600/30"
										on:click={() => handleSelectHistoryResult(result)}
									>
										<div class="flex items-center justify-between">
											<div class="flex items-center space-x-3">
												<div class="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-semibold">
													{result.score}
												</div>
												<div>
													<div class="font-medium text-gray-900 dark:text-white">
														{result.score}/{result.total} คะแนน
													</div>
													<div class="text-sm text-gray-500 dark:text-slate-400">
														{formatDate(result.completedAt)}
													</div>
												</div>
											</div>
											<div class="text-right">
												<div class="text-lg font-semibold {getScoreColor(result.score, result.total)}">
													{resultPercentage}%
												</div>
											</div>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>

				{:else if activeTab === 'settings'}
					<!-- Export/Import Card -->
					<div class="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">จัดการข้อมูล</h3>
						
						<div class="space-y-4">
							<!-- Export/Import Buttons -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
								<button
									class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
									on:click={handleExport}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
									</svg>
									<span>ส่งออก</span>
								</button>
								
								<button
									class="border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
									on:click={() => isImporting = !isImporting}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
									</svg>
									<span>นำเข้า</span>
								</button>
								
								<button
									class="border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
									on:click={handleReset}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
									</svg>
									<span>รีเซ็ต</span>
								</button>
								
								<button
									class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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
								<div class="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
									<div class="text-sm text-gray-700 dark:text-slate-300">วาง JSON ข้อมูลผลการสอบ:</div>
									<textarea
										class="w-full h-32 bg-gray-50 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										bind:value={importData}
										placeholder="วาง JSON ข้อมูลที่นี่..."
									></textarea>
									<div class="flex space-x-2">
										<button
											class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
											on:click={handleImport}
										>
											นำเข้าข้อมูล
										</button>
										<button
											class="bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
											on:click={() => {
												isImporting = false;
												importData = '';
											}}
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
		
		<!-- Footer -->
		<Footer />
	</div>
{/if}

<!-- Toast Notification -->
{#if showToast}
	<div class="fixed bottom-4 right-4 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white px-4 py-3 rounded-lg shadow-lg">
		{toastMessage}
	</div>
{/if}

<style>
	:global(.katex) {
		font-size: 1.1em;
	}
	
	:global(.katex-display) {
		margin: 1em 0;
	}
</style>
