<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { t } from '$lib/i18n';
    import Header from '../../components/Header.svelte';

    type Question = {
        id: string;
        question: string;
        options?: string[];
        answer?: string;
        type: 'multiple_choice' | 'essay';
        explanation?: string;
    };

    type ExamFile = {
        id: string;
        title: string;
        description: string;
        tags: string[];
        url: string;
        uploaded_by: string;
        essay_count: number;
        choice_count: number;
    };

    const API_BASE_URL = 'https://examtieapi.breadtm.xyz';

    let examId: string;
    let exam: ExamFile | null = null;
    let questions: Question[] = [];
    let currentQuestionIndex = 0;
    let answers: Record<string, string> = {};
    let loading = false;
    let error = '';
    let isSubmitted = false;
    let score: number | null = null;
    let showExplanations = false;

    $: examId = $page.params.id;
    $: currentQuestion = questions[currentQuestionIndex];
    $: progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    onMount(async () => {
        // Check if user is authenticated
        if (!$auth.isAuthenticated) {
            goto('/login');
            return;
        }

        if (examId) {
            await loadExamQuestions();
        }
    });

    async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
        const token = $auth.token;
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Request failed' })) as any;
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async function loadExamQuestions() {
        loading = true;
        error = '';
        
        try {
            questions = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/${examId}/questions`);
            // Transform the questions to match our interface
            questions = questions.map((q: any, index: number) => ({
                id: q.id || `q_${index}`,
                question: q.question || q.text || '',
                options: q.options || q.choices || [],
                answer: q.answer || q.correct_answer || '',
                type: q.type || (q.options ? 'multiple_choice' : 'essay'),
                explanation: q.explanation || ''
            }));
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function handleAnswerSelect(answer: string) {
        if (currentQuestion) {
            answers[currentQuestion.id] = answer;
        }
    }

    function nextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
        }
    }

    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
        }
    }

    function goToQuestion(index: number) {
        currentQuestionIndex = index;
    }

    async function submitExam() {
        if (!confirm('Are you sure you want to submit your exam? You cannot change your answers after submission.')) {
            return;
        }

        loading = true;
        error = '';

        try {
            const submission = Object.entries(answers).map(([questionId, answer]) => ({
                question_id: questionId,
                answer: answer
            }));

            const result = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/${examId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ answers: submission }),
            });

            isSubmitted = true;
            score = result.score || null;
            showExplanations = true;
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function getSelectedAnswer(questionId: string): string {
        return answers[questionId] || '';
    }

    function isAnswerCorrect(questionId: string): boolean {
        const question = questions.find(q => q.id === questionId);
        if (!question) return false;
        return getSelectedAnswer(questionId) === question.answer;
    }

    function getAnsweredCount(): number {
        return Object.keys(answers).length;
    }
</script>

<svelte:head>
    <title>Quiz - ExamTie</title>
    <meta name="description" content="Take practice exams and improve your knowledge" />
</svelte:head>

<Header />

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
        <!-- Floating particles -->
        {#each Array.from({length: 20}) as _, i}
            <div 
                class="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-float-gentle"
                style="left: {Math.random() * 100}%; top: {Math.random() * 100}%; animation-delay: {Math.random() * 4}s;"
            ></div>
        {/each}
    </div>

    <div class="relative z-10 pt-8 pb-16">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {#if loading && questions.length === 0}
                <!-- Loading State -->
                <div class="text-center py-16">
                    <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 class="text-2xl font-semibold text-white mb-2">Loading Exam...</h2>
                    <p class="text-gray-400">Please wait while we prepare your questions</p>
                </div>
            {:else if error}
                <!-- Error State -->
                <div class="text-center py-16">
                    <div class="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-semibold text-white mb-2">Error Loading Exam</h2>
                    <p class="text-gray-400 mb-6">{error}</p>
                    <button
                        on:click={() => goto('/exams')}
                        class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        Back to Exams
                    </button>
                </div>
            {:else if questions.length === 0}
                <!-- No Questions State -->
                <div class="text-center py-16">
                    <div class="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-semibold text-white mb-2">No Questions Available</h2>
                    <p class="text-gray-400 mb-6">This exam doesn't have any questions yet</p>
                    <button
                        on:click={() => goto('/exams')}
                        class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        Back to Exams
                    </button>
                </div>
            {:else}
                <!-- Quiz Interface -->
                <div class="flex gap-8">
                    <!-- Question Navigation Sidebar -->
                    <div class="hidden lg:block w-64 flex-shrink-0">
                        <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sticky top-8">
                            <h3 class="text-lg font-semibold text-white mb-4">Questions</h3>
                            <div class="space-y-2 max-h-96 overflow-y-auto">
                                {#each questions as question, index}
                                    <button
                                        on:click={() => goToQuestion(index)}
                                        class="w-full text-left p-3 rounded-lg border transition-all duration-200 {
                                            currentQuestionIndex === index 
                                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                                                : answers[question.id] 
                                                    ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                        }"
                                    >
                                        <span class="font-medium">Q{index + 1}</span>
                                        <div class="flex items-center justify-between mt-1">
                                            <span class="text-xs opacity-75">{question.type === 'multiple_choice' ? 'MC' : 'Essay'}</span>
                                            {#if answers[question.id]}
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            {/if}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                            
                            <!-- Progress Summary -->
                            <div class="mt-6 pt-6 border-t border-white/10">
                                <div class="text-sm text-gray-300 mb-2">
                                    Progress: {getAnsweredCount()}/{questions.length}
                                </div>
                                <div class="w-full bg-white/10 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: {(getAnsweredCount() / questions.length) * 100}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Quiz Area -->
                    <div class="flex-1">
                        <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                            <!-- Quiz Header -->
                            <div class="bg-white/5 border-b border-white/10 p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h1 class="text-2xl font-bold text-white">
                                        Question {currentQuestionIndex + 1} of {questions.length}
                                    </h1>
                                    {#if isSubmitted && score !== null}
                                        <div class="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
                                            <span class="text-green-300 font-semibold">Score: {score}%</span>
                                        </div>
                                    {/if}
                                </div>
                                
                                <!-- Progress Bar -->
                                <div class="w-full bg-white/10 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300" style="width: {progress}%"></div>
                                </div>
                            </div>

                            <!-- Question Content -->
                            {#if currentQuestion}
                                <div class="p-6">
                                    <!-- Question Text -->
                                    <div class="mb-8">
                                        <h2 class="text-xl text-white mb-4 leading-relaxed">
                                            {currentQuestion.question}
                                        </h2>
                                        
                                        {#if currentQuestion.type === 'multiple_choice' && currentQuestion.options}
                                            <!-- Multiple Choice Options -->
                                            <div class="space-y-3">
                                                {#each currentQuestion.options as option, optionIndex}
                                                    <button
                                                        on:click={() => !isSubmitted && handleAnswerSelect(option)}
                                                        disabled={isSubmitted}
                                                        class="w-full text-left p-4 rounded-lg border transition-all duration-200 {
                                                            isSubmitted
                                                                ? option === currentQuestion.answer
                                                                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                                    : getSelectedAnswer(currentQuestion.id) === option && option !== currentQuestion.answer
                                                                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                                                        : 'bg-white/5 border-white/10 text-gray-300'
                                                                : getSelectedAnswer(currentQuestion.id) === option
                                                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                                        }"
                                                    >
                                                        <div class="flex items-center">
                                                            <span class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center mr-4 text-sm font-medium">
                                                                {String.fromCharCode(65 + optionIndex)}
                                                            </span>
                                                            <span>{option}</span>
                                                            {#if isSubmitted && option === currentQuestion.answer}
                                                                <svg class="w-5 h-5 ml-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                                </svg>
                                                            {:else if isSubmitted && getSelectedAnswer(currentQuestion.id) === option && option !== currentQuestion.answer}
                                                                <svg class="w-5 h-5 ml-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            {/if}
                                                        </div>
                                                    </button>
                                                {/each}
                                            </div>
                                        {:else}
                                            <!-- Essay Question -->
                                            <div>
                                                <textarea
                                                    bind:value={answers[currentQuestion.id]}
                                                    disabled={isSubmitted}
                                                    placeholder="Type your answer here..."
                                                    class="w-full h-32 bg-white/10 border border-white/20 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                                                ></textarea>
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Explanation (shown after submission) -->
                                    {#if isSubmitted && currentQuestion.explanation}
                                        <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <h3 class="text-blue-300 font-semibold mb-2">Explanation:</h3>
                                            <p class="text-gray-300">{currentQuestion.explanation}</p>
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- Navigation Footer -->
                            <div class="bg-white/5 border-t border-white/10 p-6">
                                <div class="flex items-center justify-between">
                                    <button
                                        on:click={previousQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        class="flex items-center bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                                    >
                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                        Previous
                                    </button>

                                    <div class="flex items-center space-x-4">
                                        {#if currentQuestionIndex === questions.length - 1 && !isSubmitted}
                                            <button
                                                on:click={submitExam}
                                                disabled={loading}
                                                class="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 px-6 rounded-lg transition-colors font-medium"
                                            >
                                                {loading ? 'Submitting...' : 'Submit Exam'}
                                            </button>
                                        {:else if !isSubmitted}
                                            <button
                                                on:click={nextQuestion}
                                                disabled={currentQuestionIndex === questions.length - 1}
                                                class="flex items-center bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                                            >
                                                Next
                                                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                                </svg>
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    @keyframes float-gentle {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-10px) rotate(1deg); }
        66% { transform: translateY(5px) rotate(-1deg); }
    }
    
    .animate-float-gentle {
        animation: float-gentle 6s ease-in-out infinite;
    }
</style>
