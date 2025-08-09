<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { auth } from '$lib/stores/auth';
    import Header from '../../../components/Header.svelte';
    import ToastContainer from '../../../components/ToastContainer.svelte';

    const examId = $page.params.id;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    type ExamAnswerOut = {
        question_id: string;
        answer: string | string[];
        is_correct: boolean;
        correct_answer?: string | string[];
        user_answer?: string | string[];
        why_answer_this_one?: string;
        question?: string;
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
            details: ExamAnswerOut[];
        };
    };

    type DetailedSubmission = {
        _id?: string;
        exam_id?: string;
        score: number;
        total: number;
        submitted_at: string;
        details: ExamAnswerOut[];
        exam_data: {
            title: string;
            description: string;
            total_questions: number;
        };
        answers?: any[];
        time_spent?: number;
        isAiExam?: boolean;
    };

    // Local state
    let loading = true;
    let error = '';
    let submissionDetails: DetailedSubmission | null = null;
    let examInfo: ExamFileOut | null = null;
    let submissions: SubmissionSummary[] = [];
    let aiSubmissions: AiSubmissionRecordOut[] = [];
    let expandedQuestions = new Set<string>();
    let showAllIncorrect = false;
    let isAiExam = false;
    let submissionId = '';
    let examResult: any = null;

    // Interactive FX
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

    // Performance metrics (optional panel)
    let performanceData = {
        averageTimePerQuestion: 0,
        difficulty: '',
        recommendedTopics: [] as string[]
    };

    function formatTime(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function formatAnswer(answer: string | string[] | undefined): string {
        if (!answer) return 'No answer provided';
        return Array.isArray(answer) ? answer.join(', ') : answer;
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isMobile) {
            mousePosition.x = event.clientX / window.innerWidth;
            mousePosition.y = event.clientY / window.innerHeight;
        }
    }

    function checkMobile() { isMobile = window.innerWidth < 768; }

    async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
        const token = $auth.token;
        const headers: Record<string, string> = { ...(options.headers as Record<string, string> ?? {}) };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(url, { ...options, headers: { ...headers, 'Content-Type': 'application/json' } });
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
        loading = true; error = '';
        try {
            if (examId.startsWith('ai-')) {
                isAiExam = true;
                await loadAiExamResults();
            } else {
                isAiExam = false;
                const recentSubmission = localStorage.getItem('examResults');
                if (recentSubmission) {
                    const resultData = JSON.parse(recentSubmission);
                    examResult = resultData;
                    if (resultData.submissionId) submissionId = resultData.submissionId;
                    localStorage.removeItem('examResults');
                }
                await loadRegularExamResults();
            }
            calculatePerformanceMetrics();
        } catch (err: any) {
            error = err.message || 'Failed to load exam results';
            console.error('Error loading results:', err);
        } finally { loading = false; }
    }

    async function loadRegularExamResults() {
        const examsEndpoint = $auth.token ? `${API_BASE_URL}/user/api/v1/exams` : `${API_BASE_URL}/public/api/v1/exams`;
        const examsResponse = await makeAuthenticatedRequest(examsEndpoint);
        examInfo = examsResponse.find((e: ExamFileOut) => e.id === examId);
        if (!examInfo) throw new Error('Exam not found');

        if ($auth.token) {
            try {
                const submissionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/mock/submissions`);
                submissions = submissionsResponse.submissions?.filter((s: SubmissionSummary) => s.exam_id === examId) || [];
                const targetSubmission = submissionId ? submissions.find(s => s._id === submissionId) : submissions[0];
                if (targetSubmission) {
                    submissionDetails = await makeAuthenticatedRequest(`${API_BASE_URL}/mock/submissions/${targetSubmission._id}`);
                }
            } catch (e) { console.warn('Could not load submission history:', e); }
        }

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
                details: (examResult.result?.details || []) as ExamAnswerOut[],
                answers: examResult.answers || [],
                time_spent: examResult.timeSpent || 0
            };
        }
    }

    async function loadAiExamResults() {
        if ($auth.token) {
            const aiSubmissionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/ai/api/v1/exam/submission-history?limit=10`);
            aiSubmissions = aiSubmissionsResponse.filter((s: AiSubmissionRecordOut) => s.exam_id === examId);
            if (aiSubmissions.length > 0) {
                const latest = aiSubmissions[0];
                submissionDetails = {
                    exam_data: { title: 'AI Generated Exam', description: 'AI Generated Exam', total_questions: latest.result.total },
                    score: latest.result.score,
                    total: latest.result.total,
                    submitted_at: latest.created_at,
                    details: latest.result.details || [],
                    isAiExam: true
                };
                return;
            }
        }
        if (!submissionDetails && examResult) {
            submissionDetails = {
                exam_data: { title: examResult.title || 'AI Generated Exam', description: 'AI Generated Exam', total_questions: examResult.totalQuestions || 0 },
                score: examResult.result?.score || 0,
                total: examResult.result?.total || examResult.totalQuestions || 0,
                submitted_at: examResult.submittedAt || new Date().toISOString(),
                details: examResult.result?.details || [],
                answers: examResult.answers || [],
                time_spent: examResult.timeSpent || 0,
                isAiExam: true
            };
        }
    }

    function calculatePerformanceMetrics() {
        if (!submissionDetails) return;
        const timeSpent = submissionDetails.time_spent || 0;
        const totalQuestions = submissionDetails.total || 0;
        if (totalQuestions > 0) performanceData.averageTimePerQuestion = Math.round(timeSpent / totalQuestions);
        const percentage = totalQuestions > 0 ? (submissionDetails.score / totalQuestions) * 100 : 0;
        if (percentage >= 90) { performanceData.difficulty = 'Expert Level'; performanceData.recommendedTopics = ['Advanced concepts', 'Challenge problems']; }
        else if (percentage >= 80) { performanceData.difficulty = 'Advanced'; performanceData.recommendedTopics = ['Complex problem solving', 'Application exercises']; }
        else if (percentage >= 70) { performanceData.difficulty = 'Intermediate'; performanceData.recommendedTopics = ['Practice fundamentals', 'Mixed exercises']; }
        else if (percentage >= 60) { performanceData.difficulty = 'Beginner'; performanceData.recommendedTopics = ['Review basics', 'Guided practice']; }
        else { performanceData.difficulty = 'Foundation'; performanceData.recommendedTopics = ['Start with fundamentals', 'Basic concepts']; }
    }

    function toggleQuestion(questionId: string) {
        if (expandedQuestions.has(questionId)) expandedQuestions.delete(questionId);
        else expandedQuestions.add(questionId);
        expandedQuestions = new Set(expandedQuestions);
    }

    function retakeExam() { goto(isAiExam ? '/exams?tab=ai' : `/quiz/${examId}`); }
    function goHome() { goto('/exams'); }
    function shareResults() {
        const url = window.location.href;
        if (navigator.share) navigator.share({ title: 'Exam Results - Examtie', text: `I scored ${percentage}% on ${examTitle}!`, url });
        else navigator.clipboard.writeText(url);
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
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
        {#each particles as particle}
            <div class="absolute bg-blue-400/30 rounded-full animate-float opacity-60"
                 style="left: {particle.x}%; top: {particle.y}%; width: {particle.size}px; height: {particle.size}px; animation-delay: {particle.delay}s; animation-duration: {3 + Math.random() * 2}s;">
            </div>
        {/each}
        <div class="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700"
             style="background: radial-gradient(600px circle at {mousePosition.x * 100}% {mousePosition.y * 100}%, rgba(59, 130, 246, 0.15), transparent 40%)"></div>
    </div>

    <div class="relative z-10 min-h-screen py-8 px-4">
        {#if loading}
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
            <div class="flex items-center justify-center min-h-screen">
                <div class="max-w-md w-full bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                    <div class="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-4">Unable to Load Results</h2>
                    <p class="text-gray-300 mb-6">{error}</p>
                    <div class="flex gap-3">
                        <button on:click={retakeExam} class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105">Retake Exam</button>
                        <button on:click={goHome} class="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl border border-white/20 transition-all duration-300 transform hover:scale-105">Browse Exams</button>
                    </div>
                </div>
            </div>
        {:else if hasResults}
            <div class="max-w-6xl mx-auto space-y-8">
                <div class="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm px-8 py-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <button on:click={goHome} class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm" aria-label="Back">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                                </button>
                                <div>
                                    <h1 class="text-3xl font-bold text-white">{examTitle}</h1>
                                    <p class="text-blue-200 opacity-90">Exam Results</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                {#if isAiExam}
                                    <div class="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                        AI Generated
                                    </div>
                                {/if}
                                <button on:click={shareResults} class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm" aria-label="Share">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="p-8">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                            <div class="group bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
                                <div class="flex flex-col items-center text-center">
                                    <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                    </div>
                                    <span class="text-4xl font-bold text-green-400 mb-1">{correctCount}</span>
                                    <span class="text-sm text-green-200 font-medium">{isAiExam ? 'Answered' : 'ข้อถูก'}</span>
                                </div>
                            </div>
                            <div class="group bg-gradient-to-br from-red-500/20 to-rose-500/20 backdrop-blur-sm rounded-2xl p-6 border border-red-400/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105">
                                <div class="flex flex-col items-center text-center">
                                    <div class="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </div>
                                    <span class="text-4xl font-bold text-red-400 mb-1">{wrongCount}</span>
                                    <span class="text-sm text-red-200 font-medium">{isAiExam ? 'Unanswered' : 'ข้อผิด'}</span>
                                </div>
                            </div>
                            <div class="group bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                                <div class="flex flex-col items-center text-center">
                                    <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                    <span class="text-4xl font-bold text-blue-400 mb-1">{formatTime(timeSpent)}</span>
                                    <span class="text-sm text-blue-200 font-medium">เวลาที่ใช้ทำ</span>
                                </div>
                            </div>
                        </div>

                        <div class="mb-10 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <h2 class="font-semibold text-white mb-4 text-center text-lg">{isAiExam ? 'Completion Rate' : 'ความแม่นยำ'}: <span class="text-blue-400">{percentage}%</span></h2>
                            <div class="w-full bg-white/10 rounded-full h-6 overflow-hidden backdrop-blur-sm"><div class="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-1000 ease-out rounded-full shadow-lg" style="width: {percentage}%"></div></div>
                            <div class="flex justify-between text-xs text-white/60 mt-2"><span>0%</span><span>100%</span></div>
                        </div>

                        {#if submissionDetails && submissionDetails.details && submissionDetails.details.length > 0}
                            <div class="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                <div class="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-sm px-8 py-6 border-b border-white/10">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-2xl font-bold text-white flex items-center gap-3">
                                            <svg class="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                            Question Analysis
                                        </h3>
                                        <div class="flex items-center gap-4">
                                            <label class="flex items-center gap-2 text-white cursor-pointer">
                                                <input type="checkbox" bind:checked={showAllIncorrect} class="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                                                <span class="text-sm font-medium">Show only incorrect answers</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="p-8 space-y-4">
                                    {#each submissionDetails.details as detail, index}
                                        {#if !showAllIncorrect || !detail.is_correct}
                                            <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300">
                                                <button on:click={() => toggleQuestion(detail.question_id)} class="w-full p-6 text-left hover:bg-white/5 transition-colors flex items-center justify-between">
                                                    <div class="flex items-center gap-4">
                                                        <div class="flex items-center justify-center w-12 h-12 rounded-full {detail.is_correct ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} shadow-lg">
                                                            {#if detail.is_correct}
                                                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                                            {:else}
                                                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                                            {/if}
                                                        </div>
                                                        <div>
                                                            <div class="font-bold text-white text-lg">Question {parseInt(detail.question_id) || index + 1}</div>
                                                            <div class="text-sm {detail.is_correct ? 'text-green-300' : 'text-red-300'} font-medium">{detail.is_correct ? 'Correct Answer' : 'Incorrect Answer'}</div>
                                                        </div>
                                                    </div>
                                                    <svg class={`w-6 h-6 text-white/60 transition-transform duration-300 ${expandedQuestions.has(detail.question_id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                                                </button>
                                                {#if expandedQuestions.has(detail.question_id)}
                                                    <div class="px-6 pb-6 border-t border-white/10 bg-white/5">
                                                        {#if detail.question}
                                                            <div class="mb-6 pt-6">
                                                                <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                                    Question:
                                                                </h4>
                                                                <div class="bg-white/10 p-4 rounded-xl border border-white/20"><p class="text-white leading-relaxed">{detail.question}</p></div>
                                                            </div>
                                                        {/if}
                                                        <div class="grid md:grid-cols-2 gap-6 pt-6">
                                                            <div>
                                                                <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                                                    Your Answer:
                                                                </h4>
                                                                <div class={`bg-white/10 p-4 rounded-xl border ${detail.is_correct ? 'border-green-400/30' : 'border-red-400/30'}`}>
                                                                    <span class={`${detail.is_correct ? 'text-green-300' : 'text-red-300'} font-medium`}>{formatAnswer(detail.user_answer || detail.answer)}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                                                    Correct Answer:
                                                                </h4>
                                                                <div class="bg-white/10 p-4 rounded-xl border border-green-400/30">
                                                                    <span class="text-green-300 font-medium">{formatAnswer(detail.correct_answer)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {#if detail.why_answer_this_one}
                                                            <div class="mt-6">
                                                                <h4 class="font-bold text-white mb-3 flex items-center gap-2">
                                                                    <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
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
                </div>

                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button on:click={retakeExam} class="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-medium shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm flex items-center justify-center gap-2">
                        {#if isAiExam}
                            <svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            Generate New AI Exam
                        {:else}
                            <svg class="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            ทำข้อสอบอีกครั้ง
                        {/if}
                    </button>
                    <button on:click={() => goto('/exams')} class="group px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-medium shadow-lg border border-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm flex items-center justify-center gap-2">
                        <svg class="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        {isAiExam ? 'Back to Exams' : 'กลับไปหน้ารายการข้อสอบ'}
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<ToastContainer />

<style>
    @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 33% { transform: translateY(-10px) rotate(1deg); } 66% { transform: translateY(5px) rotate(-1deg); } }
    .animate-float { animation: float 6s ease-in-out infinite; }
    :global(.custom-scrollbar::-webkit-scrollbar) { width: 8px; }
    :global(.custom-scrollbar::-webkit-scrollbar-track) { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
    :global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
    :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) { background: rgba(255, 255, 255, 0.5); }
</style>
