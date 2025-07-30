<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { auth } from '$lib/stores/auth';
    import { t } from '$lib/i18n';
    import Header from '../../../components/Header.svelte';
    import ToastContainer from '../../../components/ToastContainer.svelte';

    const examId = $page.params.id;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    // API Types based on OpenAPI schema
    type ExamAnswerOut = {
        question_id: string;
        answer: string | string[];
        is_correct: boolean;
        correct_answer?: string | string[];
    };

    type ExamCheckResult = {
        total: number;
        correct: number;
        wrong: number;
        details: ExamAnswerOut[];
    };

    type SubmissionSummary = {
        _id: string;
        exam_id: string;
        score: number;
        total: number;
        submitted_at: string;
    };

    type ExamFileOut = {
        id: string;
        title: string;
        description: string;
        tags: string[];
        url: string;
        uploaded_by: string;
        essay_count: number;
        choice_count: number;
    };

    type AiSubmissionRecordOut = {
        id: string;
        exam_id: string;
        created_at: string;
        result: {
            score: number;
            total: number;
            details: any[];
        };
    };

    type DetailedSubmission = {
        _id: string;
        exam_id: string;
        score: number;
        total: number;
        submitted_at: string;
        details: any[];
        exam_data: {
            title: string;
            description: string;
            total_questions: number;
        };
        answers: any[];
    };

    // Local state
    let loading = true;
    let error = '';
    let submissionDetails: DetailedSubmission | any = null;
    let examInfo: ExamFileOut | null = null;
    let submissions: SubmissionSummary[] = [];
    let aiSubmissions: AiSubmissionRecordOut[] = [];
    let expandedQuestions = new Set<string>();
    let showAllIncorrect = false;
    let isAiExam = false;
    let submissionId = '';
    let examResult: any = null;

    // Interactive elements for homepage-style effects
    let mousePosition = { x: 0, y: 0 };
    let isMobile = false;

    // Floating particles data
    const particles = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 4
    }));

    // Performance metrics
    let performanceData = {
        averageTimePerQuestion: 0,
        difficulty: '',
        recommendedTopics: [] as string[]
    };

    // Helper functions
    function formatTime(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}h ${mins}m ${secs}s`;
        } else if (mins > 0) {
            return `${mins}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getScoreColor(percentage: number): string {
        if (percentage >= 90) return 'text-emerald-400';
        if (percentage >= 80) return 'text-green-400';
        if (percentage >= 70) return 'text-yellow-400';
        if (percentage >= 60) return 'text-orange-400';
        return 'text-red-400';
    }

    function getGradientColors(percentage: number): string {
        if (percentage >= 90) return 'from-emerald-500 to-green-600';
        if (percentage >= 80) return 'from-green-500 to-emerald-600';
        if (percentage >= 70) return 'from-yellow-500 to-orange-500';
        if (percentage >= 60) return 'from-orange-500 to-red-500';
        return 'from-red-500 to-red-600';
    }

    function getGrade(percentage: number): string {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    function getPerformanceMessage(percentage: number): string {
        if (percentage >= 90) return 'Outstanding Performance! 🏆';
        if (percentage >= 80) return 'Excellent Work! 🌟';
        if (percentage >= 70) return 'Good Job! 👍';
        if (percentage >= 60) return 'Keep Practicing! 📚';
        return 'Need More Study 📖';
    }

    function toggleQuestion(questionId: string) {
        if (expandedQuestions.has(questionId)) {
            expandedQuestions.delete(questionId);
        } else {
            expandedQuestions.add(questionId);
        }
        expandedQuestions = expandedQuestions;
    }

    function formatAnswer(answer: string | string[]): string {
        if (Array.isArray(answer)) {
            return answer.join(', ');
        }
        return answer || 'No answer provided';
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isMobile) {
            mousePosition.x = event.clientX / window.innerWidth;
            mousePosition.y = event.clientY / window.innerHeight;
        }
    }

    function checkMobile() {
        isMobile = window.innerWidth < 768;
    }

    async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
        const token = $auth.token;
        const headers: Record<string, string> = { ...(options.headers as Record<string, string> ?? {}) };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Request failed' })) as any;
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    onMount(() => {
        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('mousemove', handleMouseMove);

        loadResults();

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    });

    async function loadResults() {
        loading = true;
        error = '';

        try {
            // Check if this is an AI exam result or regular exam
            if (examId.startsWith('ai-')) {
                isAiExam = true;
                await loadAiExamResults();
            } else {
                isAiExam = false;
                
                // First, try to get submission ID from localStorage (recent submission)
                const recentSubmission = localStorage.getItem('examResults');
                if (recentSubmission) {
                    const resultData = JSON.parse(recentSubmission);
                    examResult = resultData;
                    if (resultData.submissionId) {
                        submissionId = resultData.submissionId;
                    }
                    localStorage.removeItem('examResults'); // Clean up
                }

                await loadRegularExamResults();
            }

            // Calculate performance metrics
            calculatePerformanceMetrics();
        } catch (err: any) {
            error = err.message || 'Failed to load exam results';
            console.error('Error loading results:', err);
        } finally {
            loading = false;
        }
    }

    async function loadRegularExamResults() {
        try {
            // Load exam info first
            const examsEndpoint = $auth.token ? `${API_BASE_URL}/user/api/v1/exams` : `${API_BASE_URL}/public/api/v1/exams`;
            const examsResponse = await makeAuthenticatedRequest(examsEndpoint);
            examInfo = examsResponse.find((e: ExamFileOut) => e.id === examId);

            if (!examInfo) {
                throw new Error('Exam not found');
            }

            // If authenticated, try to load submission history from mock endpoint
            if ($auth.token) {
                try {
                    // Get submission history to find the latest submission for this exam
                    const submissionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/mock/submissions`);
                    submissions = submissionsResponse.submissions?.filter((s: SubmissionSummary) => s.exam_id === examId) || [];
                    
                    // If we have a specific submission ID, use it; otherwise use the most recent
                    const targetSubmission = submissionId 
                        ? submissions.find(s => s._id === submissionId)
                        : submissions[0]; // Most recent

                    if (targetSubmission) {
                        // Get detailed submission results
                        submissionDetails = await makeAuthenticatedRequest(`${API_BASE_URL}/mock/submissions/${targetSubmission._id}`);
                    }
                } catch (submissionErr) {
                    console.warn('Could not load submission history:', submissionErr);
                    // Continue without submission details - user might be a guest
                }
            }

            // If no submission details found but we have examResult from localStorage
            if (!submissionDetails && examResult) {
                submissionDetails = {
                    exam_data: {
                        title: examResult.title || examInfo.title,
                        description: examInfo.description,
                        total_questions: examResult.totalQuestions || (examInfo.essay_count + examInfo.choice_count)
                    },
                    score: examResult.result?.correct || 0,
                    total: examResult.result?.total || examResult.totalQuestions || 0,
                    submitted_at: examResult.submittedAt || new Date().toISOString(),
                    details: examResult.result?.details || [],
                    answers: examResult.answers || [],
                    time_spent: examResult.timeSpent || 0
                };
            }

        } catch (err) {
            throw err;
        }
    }

    async function loadAiExamResults() {
        try {
            if ($auth.token) {
                // Load AI submission history
                const aiSubmissionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/ai/api/v1/exam/submission-history?limit=10`);
                aiSubmissions = aiSubmissionsResponse.filter((s: AiSubmissionRecordOut) => s.exam_id === examId);
                
                if (aiSubmissions.length > 0) {
                    const latestSubmission = aiSubmissions[0];
                    submissionDetails = {
                        exam_data: {
                            title: 'AI Generated Exam',
                            description: 'AI Generated Exam',
                            total_questions: latestSubmission.result.total
                        },
                        score: latestSubmission.result.score,
                        total: latestSubmission.result.total,
                        submitted_at: latestSubmission.created_at,
                        details: latestSubmission.result.details || [],
                        isAiExam: true
                    };
                }
            }

            // Fallback to localStorage for AI exam results
            if (!submissionDetails && examResult) {
                submissionDetails = {
                    exam_data: {
                        title: examResult.title || 'AI Generated Exam',
                        description: 'AI Generated Exam',
                        total_questions: examResult.totalQuestions || 0
                    },
                    score: examResult.result?.score || 0,
                    total: examResult.result?.total || examResult.totalQuestions || 0,
                    submitted_at: examResult.submittedAt || new Date().toISOString(),
                    details: examResult.result?.details || [],
                    answers: examResult.answers || [],
                    time_spent: examResult.timeSpent || 0,
                    isAiExam: true
                };
            }
        } catch (err) {
            throw err;
        }
    }

    function calculatePerformanceMetrics() {
        if (!submissionDetails) return;

        const timeSpent = submissionDetails.time_spent || 0;
        const totalQuestions = submissionDetails.total || 0;
        
        if (totalQuestions > 0) {
            performanceData.averageTimePerQuestion = Math.round(timeSpent / totalQuestions);
        }

        const percentage = totalQuestions > 0 ? (submissionDetails.score / totalQuestions) * 100 : 0;
        
        if (percentage >= 90) {
            performanceData.difficulty = 'Expert Level';
            performanceData.recommendedTopics = ['Advanced concepts', 'Challenge problems'];
        } else if (percentage >= 80) {
            performanceData.difficulty = 'Advanced';
            performanceData.recommendedTopics = ['Complex problem solving', 'Application exercises'];
        } else if (percentage >= 70) {
            performanceData.difficulty = 'Intermediate';
            performanceData.recommendedTopics = ['Practice fundamentals', 'Mixed exercises'];
        } else if (percentage >= 60) {
            performanceData.difficulty = 'Beginner';
            performanceData.recommendedTopics = ['Review basics', 'Guided practice'];
        } else {
            performanceData.difficulty = 'Foundation';
            performanceData.recommendedTopics = ['Start with fundamentals', 'Basic concepts'];
        }
    }

    function retakeExam() {
        if (isAiExam) {
            goto('/exams?tab=ai');
        } else {
            goto(`/quiz/${examId}`);
        }
    }

    function goHome() {
        goto('/exams');
    }

    function shareResults() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'Exam Results - Examtie',
                text: `I scored ${percentage}% on ${examTitle}!`,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            // You could show a toast here
        }
    }

    // Computed values
    $: percentage = submissionDetails ? Math.round((submissionDetails.score / submissionDetails.total) * 100) : 0;
    $: correctCount = submissionDetails?.score || 0;
    $: wrongCount = submissionDetails ? submissionDetails.total - submissionDetails.score : 0;
    $: totalQuestions = submissionDetails?.total || 0;
    $: examTitle = submissionDetails?.exam_data?.title || examInfo?.title || 'Unknown Exam';
    $: timeSpent = submissionDetails?.time_spent || 0;
    $: hasResults = submissionDetails !== null;
</script>

<svelte:head>
    <title>Exam Results - {examTitle} - Examtie</title>
    <meta name="description" content="View your exam results and detailed feedback" />
</svelte:head>

<Header />

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
    <!-- Background decoration with floating particles -->
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
        
        <!-- Floating particles -->
        {#each particles as particle}
            <div 
                class="absolute bg-blue-400/30 rounded-full animate-float opacity-60"
                style="
                    left: {particle.x}%; 
                    top: {particle.y}%; 
                    width: {particle.size}px; 
                    height: {particle.size}px;
                    animation-delay: {particle.delay}s;
                    animation-duration: {3 + Math.random() * 2}s;
                "
            ></div>
        {/each}

        <!-- Interactive gradient overlay -->
        <div 
            class="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700"
            style="background: radial-gradient(600px circle at {mousePosition.x * 100}% {mousePosition.y * 100}%, rgba(59, 130, 246, 0.15), transparent 40%)"
        ></div>
    </div>

    <div class="relative z-10 min-h-screen py-8 px-4">
        {#if loading}
            <!-- Loading State -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="relative">
                        <div class="animate-spin rounded-full h-20 w-20 border-4 border-blue-500/20 border-t-blue-500 mx-auto mb-6"></div>
                        <div class="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 animate-pulse"></div>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-2">Loading Your Results</h2>
                    <p class="text-blue-200 animate-pulse">Calculating your performance...</p>
                </div>
            </div>

        {:else if error}
            <!-- Error State -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="max-w-md w-full bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                    <div class="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-4">Unable to Load Results</h2>
                    <p class="text-gray-300 mb-6">{error}</p>
                    <div class="flex gap-3">
                        <button
                            on:click={retakeExam}
                            class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
                        >
                            Retake Exam
                        </button>
                        <button
                            on:click={goHome}
                            class="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl border border-white/20 transition-all duration-300 transform hover:scale-105"
                        >
                            Browse Exams
                        </button>
                    </div>
                </div>
            </div>

        {:else if hasResults}
            <!-- Results Display -->
            <div class="max-w-6xl mx-auto space-y-8">
                <!-- Header Section -->
                <div class="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm px-8 py-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <button
                                    on:click={goHome}
                                    class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                                    </svg>
                                </button>
                                <div>
                                    <h1 class="text-3xl font-bold text-white">{examTitle}</h1>
                                    <p class="text-blue-200 opacity-90">Exam Results</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-3">
                                {#if isAiExam}
                                    <div class="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                        </svg>
                                        AI Generated
                                    </div>
                                {/if}
                                
                                <button
                                    on:click={shareResults}
                                    class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                                    title="Share Results"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                </div>
                {#if !isMobile}
                <div class="mb-8">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-4">
                            <button
                                on:click={() => goto(`/quiz/${quizId}`)}
                                class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                                title="Back to Quiz"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <div>
                                <h1 class="text-3xl font-bold text-white">{examTitle}</h1>
                                <p class="text-blue-200 opacity-90">Exam Results</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-3">
                            {#if isAiExam}
                                <div class="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    AI Generated
                                </div>
                            {/if}
                            
                            <button
                                on:click={shareResults}
                                class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                                title="Share Results"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                {/if}
                <h1 class="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
                    {summary.isAiExam ? 'AI Exam Results' : 'สรุปผลการทำข้อสอบ'}
                </h1>
                <p class="text-blue-200 text-center opacity-90">{summary.title}</p>
            </div>

            <div class="p-8">
                <!-- Summary Stats -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div class="group bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
                        <div class="flex flex-col items-center text-center">
                            <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <span class="text-4xl font-bold text-green-400 mb-1">{summary.correct}</span>
                            <span class="text-sm text-green-200 font-medium">
                                {summary.isAiExam ? 'Answered' : 'ข้อถูก'}
                            </span>
                        </div>
                    </div>
                    <div class="group bg-gradient-to-br from-red-500/20 to-rose-500/20 backdrop-blur-sm rounded-2xl p-6 border border-red-400/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105">
                        <div class="flex flex-col items-center text-center">
                            <div class="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <span class="text-4xl font-bold text-red-400 mb-1">{summary.incorrect}</span>
                            <span class="text-sm text-red-200 font-medium">
                                {summary.isAiExam ? 'Unanswered' : 'ข้อผิด'}
                            </span>
                        </div>
                    </div>
                    <div class="group bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                        <div class="flex flex-col items-center text-center">
                            <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <span class="text-4xl font-bold text-blue-400 mb-1">{formatTime(summary.timeSpentSeconds)}</span>
                            <span class="text-sm text-blue-200 font-medium">เวลาที่ใช้ทำ</span>
                        </div>
                    </div>
                </div>

                <!-- Completion/Accuracy Bar -->
                <div class="mb-10 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <h2 class="font-semibold text-white mb-4 text-center text-lg">
                        {summary.isAiExam ? 'Completion Rate' : 'ความแม่นยำ'}: 
                        <span class="text-blue-400">{accuracy}%</span>
                    </h2>
                    <div class="w-full bg-white/10 rounded-full h-6 overflow-hidden backdrop-blur-sm">
                        <div class="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-1000 ease-out rounded-full shadow-lg" style="width: {accuracy}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-white/60 mt-2">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>
                <!-- Detailed Results -->
                {#if submissionDetails.details && submissionDetails.details.length > 0}
                    <div class="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                        <div class="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-sm px-8 py-6 border-b border-white/10">
                            <div class="flex items-center justify-between">
                                <h3 class="text-2xl font-bold text-white flex items-center gap-3">
                                    <svg class="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Question Analysis
                                </h3>
                                <div class="flex items-center gap-4">
                                    <label class="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            bind:checked={showAllIncorrect}
                                            class="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                        />
                                        <span class="text-sm font-medium">Show only incorrect answers</span>
                                    </label>
                                </div>
                                <h3 class="text-lg font-semibold text-white">AI Exam Completed!</h3>
                            </div>
                            <p class="text-gray-300 mb-4">
                                You've successfully completed this AI-generated exam. Your responses have been recorded and you can review your performance above.
                            </p>
                            <div class="bg-white/10 rounded-xl p-4">
                                <p class="text-sm text-white/80 mb-2">💡 <strong>Next Steps:</strong></p>
                                <ul class="text-sm text-gray-300 space-y-1">
                                    <li>• Generate a new AI exam on a different topic</li>
                                    <li>• Try increasing the difficulty level</li>
                                    <li>• Practice with more questions to improve your knowledge</li>
                                </ul>
                            </div>
                        </div>

                        <div class="p-8 space-y-4">
                            {#each submissionDetails.details as detail, index}
                                {#if !showAllIncorrect || !detail.is_correct}
                                    <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300">
                                        <button
                                            on:click={() => toggleQuestion(detail.question_id)}
                                            class="w-full p-6 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                                        >
                                            <div class="flex items-center gap-4">
                                                <div class="flex items-center justify-center w-12 h-12 rounded-full {detail.is_correct ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} shadow-lg">
                                                    {#if detail.is_correct}
                                                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                        </svg>
                                                    {:else}
                                                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                        </svg>
                                                    {/if}
                                                </div>
                                                <div>
                                                    <div class="font-bold text-white text-lg">Question {parseInt(detail.question_id) || index + 1}</div>
                                                    <div class="text-sm {detail.is_correct ? 'text-green-300' : 'text-red-300'} font-medium">
                                                        {detail.is_correct ? 'Correct Answer' : 'Incorrect Answer'}
                                                    </div>
                                                </div>
                                            </div>
                                            <svg 
                                                class="w-6 h-6 text-white/60 transition-transform duration-300 {expandedQuestions.has(detail.question_id) ? 'rotate-180' : ''}"
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </button>
                                        
                                        {#if expandedQuestions.has(detail.question_id)}
                                            <div class="px-6 pb-6 border-t border-white/10 bg-white/5">
                                                <!-- Question Text (for AI exams or when available) -->
                                                {#if detail.question}
                                                    <div class="mb-6 pt-6">
                                                        <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                            </svg>
                                                            Question:
                                                        </h4>
                                                        <div class="bg-white/10 p-4 rounded-xl border border-white/20">
                                                            <p class="text-white leading-relaxed">{detail.question}</p>
                                                        </div>
                                                    </div>
                                                {/if}
                                                
                                                <div class="grid md:grid-cols-2 gap-6 pt-6">
                                                    <div>
                                                        <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                            </svg>
                                                            Your Answer:
                                                        </h4>
                                                        <div class="bg-white/10 p-4 rounded-xl border {detail.is_correct ? 'border-green-400/30' : 'border-red-400/30'}">
                                                            <span class="{detail.is_correct ? 'text-green-300' : 'text-red-300'} font-medium">
                                                                {formatAnswer(detail.user_answer || detail.answer)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                            </svg>
                                                            Correct Answer:
                                                        </h4>
                                                        <div class="bg-white/10 p-4 rounded-xl border border-green-400/30">
                                                            <span class="text-green-300 font-medium">
                                                                {formatAnswer(detail.correct_answer)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <!-- Explanation (for AI exams or when available) -->
                                                {#if detail.why_answer_this_one}
                                                    <div class="mt-6">
                                                        <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                                            </svg>
                                                            Explanation:
                                                        </h4>
                                                        <div class="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 p-4 rounded-xl">
                                                            <p class="text-yellow-100 leading-relaxed">{detail.why_answer_this_one}</p>
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        on:click={retakeExam} 
                        class="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-medium shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                        {#if summary.isAiExam}
                            <svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            Generate New AI Exam
                        {:else}
                            <svg class="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            ทำข้อสอบอีกครั้ง
                        {/if}
                    </button>
                    <button 
                        on:click={() => goto('/exams')} 
                        class="group px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-medium shadow-lg border border-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        {summary.isAiExam ? 'Back to Exams' : 'กลับไปหน้ารายการข้อสอบ'}
                    </button>
                </div>
            </div>
        {/if}
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
									
									<button
										class="w-full bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors text-left"
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
									</button>
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

<ToastContainer />

<style>
    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-10px) rotate(1deg); }
        66% { transform: translateY(5px) rotate(-1deg); }
    }
    
    .animate-float {
        animation: float 6s ease-in-out infinite;
    }

    /* Custom scrollbar for webkit browsers */
    :global(.custom-scrollbar::-webkit-scrollbar) {
        width: 8px;
    }
    
    :global(.custom-scrollbar::-webkit-scrollbar-track) {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
    
    :global(.custom-scrollbar::-webkit-scrollbar-thumb) {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
    }
    
    :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
        background: rgba(255, 255, 255, 0.5);
    }
</style>
