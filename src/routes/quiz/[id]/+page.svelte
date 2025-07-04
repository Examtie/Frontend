<script lang="ts">
    import { page } from '$app/stores';
    import { auth } from '$lib/stores/auth';
    import { toastStore } from '$lib/stores/toast';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import ToastContainer from '../../components/ToastContainer.svelte';

    // Types
    type Question = {
        id: string;
        type: 'multiple_choice' | 'fill' | 'essay';
        question: string;
        choices?: string[];
        answer?: string | string[];
    };

    type ExamData = {
        id: string;
        title: string;
        description: string;
        url: string;
        essay_count: number;
        choice_count: number;
        questions: Question[];
    };

    type UserAnswer = {
        question_id: string;
        answer: string | string[];
    };

    const API_BASE_URL = 'https://examtieapi.breadtm.xyz';

    // Reactive variables
    let examId: string;
    let exam: ExamData | null = null;
    let questions: Question[] = [];
    let currentQuestionIndex = 0;
    let userAnswers: Map<string, UserAnswer> = new Map();
    let loading = false;
    let error = '';
    let submitting = false;
    let showSubmitConfirmation = false;
    let pdfUrl = '';

    // UI state
    let showQuestionList = false;
    let essayAnswer = '';
    let selectedChoice = '';
    let showPdfViewer = false; // For mobile PDF toggle
    let isMobile = false;

    // Get exam ID from route params
    $: examId = $page.params.id;

    onMount(async () => {
        if (!$auth.isAuthenticated) {
            goto('/login');
            return;
        }

        // Check if mobile
        function checkMobile() {
            isMobile = window.innerWidth < 768;
        }
        
        checkMobile();
        window.addEventListener('resize', checkMobile);

        if (examId) {
            await loadExamData();
        }

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
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

    async function loadExamData() {
        loading = true;
        error = '';

        try {
            // Load exam details first
            const examResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams`);
            const examData = examResponse.find((e: any) => e.id === examId);
            
            if (!examData) {
                throw new Error('Exam not found');
            }

            exam = {
                id: examData.id,
                title: examData.title,
                description: examData.description,
                url: examData.url,
                essay_count: examData.essay_count,
                choice_count: examData.choice_count,
                questions: []
            };

            // Set PDF URL
            pdfUrl = examData.url;

            // Load questions - note: the API returns questions as array of objects
            const questionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/${examId}/questions`);
            questions = questionsResponse || [];

            // Generate answer sheet based on essay_count and choice_count if no questions returned
            if (questions.length === 0 && (exam.essay_count > 0 || exam.choice_count > 0)) {
                questions = [];
                
                // Create multiple choice questions
                for (let i = 1; i <= exam.choice_count; i++) {
                    questions.push({
                        id: `choice_${i}`,
                        type: 'multiple_choice',
                        question: `Choice Question ${i}`,
                        choices: ['A', 'B', 'C', 'D']
                    });
                }
                
                // Create essay questions
                for (let i = 1; i <= exam.essay_count; i++) {
                    questions.push({
                        id: `essay_${i}`,
                        type: 'essay',
                        question: `Essay Question ${i}`
                    });
                }
            }

            // Initialize user answers
            userAnswers = new Map();
            questions.forEach(q => {
                userAnswers.set(q.id, {
                    question_id: q.id,
                    answer: q.type === 'multiple_choice' ? '' : ''
                });
            });

            // Set initial answer for current question
            if (questions.length > 0) {
                const currentQuestion = questions[currentQuestionIndex];
                if (currentQuestion.type === 'multiple_choice') {
                    selectedChoice = userAnswers.get(currentQuestion.id)?.answer as string || '';
                } else {
                    essayAnswer = userAnswers.get(currentQuestion.id)?.answer as string || '';
                }
            }

        } catch (err: any) {
            error = err.message;
            toastStore.error(`Failed to load exam: ${err.message}`);
        } finally {
            loading = false;
        }
    }

    function handleMultipleChoiceAnswer(choice: string) {
        if (!questions[currentQuestionIndex]) return;
        
        const questionId = questions[currentQuestionIndex].id;
        selectedChoice = choice;
        
        userAnswers.set(questionId, {
            question_id: questionId,
            answer: choice
        });
        userAnswers = userAnswers; // Trigger reactivity
    }

    function handleEssayAnswer() {
        if (!questions[currentQuestionIndex]) return;
        
        const questionId = questions[currentQuestionIndex].id;
        
        userAnswers.set(questionId, {
            question_id: questionId,
            answer: essayAnswer
        });
        userAnswers = userAnswers; // Trigger reactivity
    }

    function goToQuestion(index: number) {
        if (index < 0 || index >= questions.length) return;
        
        // Save current answer before switching
        saveCurrentAnswer();
        
        currentQuestionIndex = index;
        showQuestionList = false;
        showPdfViewer = false; // Close PDF viewer on mobile when switching questions
        
        // Load answer for new question
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion.type === 'multiple_choice') {
            selectedChoice = userAnswers.get(currentQuestion.id)?.answer as string || '';
        } else {
            essayAnswer = userAnswers.get(currentQuestion.id)?.answer as string || '';
        }
    }

    function saveCurrentAnswer() {
        if (!questions[currentQuestionIndex]) return;
        
        const questionId = questions[currentQuestionIndex].id;
        const currentQuestion = questions[currentQuestionIndex];
        
        if (currentQuestion.type === 'multiple_choice') {
            userAnswers.set(questionId, {
                question_id: questionId,
                answer: selectedChoice
            });
        } else {
            userAnswers.set(questionId, {
                question_id: questionId,
                answer: essayAnswer
            });
        }
        userAnswers = userAnswers; // Trigger reactivity
    }

    function nextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            goToQuestion(currentQuestionIndex + 1);
        }
    }

    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            goToQuestion(currentQuestionIndex - 1);
        }
    }

    function getAnsweredQuestionsCount(): number {
        let count = 0;
        userAnswers.forEach(answer => {
            if (answer.answer && answer.answer.toString().trim() !== '') {
                count++;
            }
        });
        return count;
    }

    function confirmSubmit() {
        saveCurrentAnswer();
        showSubmitConfirmation = true;
    }

    async function submitExam() {
        if (!exam) return;
        
        submitting = true;
        error = '';

        try {
            const answers = Array.from(userAnswers.values()).filter(answer => 
                answer.answer && answer.answer.toString().trim() !== ''
            );

            const submissionData = {
                answers: answers
            };

            await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/${examId}/submit`, {
                method: 'POST',
                body: JSON.stringify(submissionData)
            });

            toastStore.success('Exam submitted successfully!');
            showSubmitConfirmation = false;
            
            // Redirect to results or exams page
            setTimeout(() => {
                goto('/exams');
            }, 2000);

        } catch (err: any) {
            error = err.message;
            toastStore.error(`Failed to submit exam: ${err.message}`);
        } finally {
            submitting = false;
        }
    }

    // Reactive statements
    $: currentQuestion = questions[currentQuestionIndex];
    $: progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
    $: answeredCount = getAnsweredQuestionsCount();
    $: isQuestionAnswered = currentQuestion ? userAnswers.get(currentQuestion.id)?.answer && userAnswers.get(currentQuestion.id)?.answer.toString().trim() !== '' : false;
</script>

<svelte:head>
    <title>{exam?.title || 'Quiz'} - ExamTie</title>
    <meta name="description" content={exam?.description || 'Practice quiz on ExamTie'} />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
    {#if loading}
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-white text-lg">Loading exam...</p>
            </div>
        </div>
    {:else if error}
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">Error Loading Exam</h2>
                <p class="text-gray-300 mb-4">{error}</p>
                <button 
                    on:click={() => goto('/exams')}
                    class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                    Back to Exams
                </button>
            </div>
        </div>
    {:else if exam && questions.length > 0}
        <!-- Mobile Layout -->
        {#if isMobile}
            <div class="min-h-screen bg-slate-50">
                <!-- Mobile Header -->
                <div class="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
                    <div class="flex items-center justify-between mb-3">
                        <button
                            on:click={() => goto('/exams')}
                            class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            Back
                        </button>
                        
                        <div class="flex items-center gap-2">
                            <!-- PDF Toggle Button -->
                            <button
                                on:click={() => showPdfViewer = !showPdfViewer}
                                class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                {showPdfViewer ? 'Hide PDF' : 'View PDF'}
                            </button>
                            
                            <!-- Questions List Toggle -->
                            <button
                                on:click={() => showQuestionList = !showQuestionList}
                                class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                                </svg>
                                <span class="hidden sm:inline">Questions</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <h1 class="text-lg font-bold text-gray-800 truncate">{exam.title}</h1>
                        <p class="text-sm text-gray-600 truncate">{exam.description}</p>
                    </div>
                    
                    <!-- Mobile Progress Bar -->
                    <div>
                        <div class="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                            <span>{answeredCount}/{questions.length} answered</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style="width: {progress}%"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- Mobile PDF Viewer (Fullscreen when active) -->
                {#if showPdfViewer}
                    <div class="fixed inset-0 bg-white z-50 flex flex-col">
                        <div class="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                            <h3 class="font-semibold text-gray-800">Exam Paper</h3>
                            <button
                                on:click={() => showPdfViewer = false}
                                class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div class="flex-1 overflow-hidden">
                            {#if pdfUrl}
                                <iframe 
                                    src={pdfUrl} 
                                    class="w-full h-full border-0"
                                    title="Exam PDF"
                                ></iframe>
                            {:else}
                                <div class="flex items-center justify-center h-full">
                                    <div class="text-center">
                                        <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                        </div>
                                        <p class="text-gray-500">No PDF available</p>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- Mobile Question List -->
                {#if showQuestionList}
                    <div class="fixed inset-0 bg-white z-40 flex flex-col">
                        <div class="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                            <h3 class="font-semibold text-gray-800">Question Navigator</h3>
                            <button
                                on:click={() => showQuestionList = false}
                                class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                            <div class="grid grid-cols-6 gap-3">
                                {#each questions as question, index}
                                    <button
                                        on:click={() => goToQuestion(index)}
                                        class="aspect-square text-sm font-medium rounded-lg border-2 transition-all duration-200 {
                                            index === currentQuestionIndex 
                                                ? 'bg-blue-500 border-blue-500 text-white' 
                                                : userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''
                                                    ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                                                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                        }"
                                    >
                                        {index + 1}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Mobile Question Content -->
                <div class="p-4 pb-20">
                    {#if currentQuestion}
                        <div class="mb-6">
                            <div class="flex items-center gap-2 mb-4">
                                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span class="text-white font-bold text-sm">{currentQuestionIndex + 1}</span>
                                </div>
                                <span class="text-sm font-medium px-2 py-1 rounded-full {
                                    currentQuestion.type === 'multiple_choice' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-blue-100 text-blue-700'
                                }">
                                    {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 'Written Answer'}
                                </span>
                            </div>
                            
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">
                                {currentQuestion.question}
                            </h3>

                            <!-- Multiple Choice Options -->
                            {#if currentQuestion.type === 'multiple_choice' && currentQuestion.choices}
                                <div class="space-y-3">
                                    {#each currentQuestion.choices as choice, index}
                                        <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 {
                                            selectedChoice === choice 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }">
                                            <input 
                                                type="radio" 
                                                name="choice" 
                                                value={choice}
                                                bind:group={selectedChoice}
                                                on:change={() => handleMultipleChoiceAnswer(choice)}
                                                class="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span class="ml-3 text-gray-700 text-base">{choice}</span>
                                        </label>
                                    {/each}
                                </div>
                            {:else}
                                <!-- Essay/Fill Answer -->
                                <div>
                                    <textarea 
                                        bind:value={essayAnswer}
                                        on:input={handleEssayAnswer}
                                        placeholder="Enter your answer here..."
                                        class="w-full h-40 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                                    ></textarea>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Mobile Navigation Footer -->
                <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                    <div class="flex items-center justify-between mb-2">
                        <button
                            on:click={previousQuestion}
                            disabled={currentQuestionIndex === 0}
                            class="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Previous
                        </button>

                        <div class="flex items-center gap-2 text-sm text-gray-600">
                            <div class="w-2 h-2 rounded-full {isQuestionAnswered ? 'bg-green-500' : 'bg-gray-300'}"></div>
                            {isQuestionAnswered ? 'Answered' : 'Not answered'}
                        </div>

                        {#if currentQuestionIndex === questions.length - 1}
                            <button
                                on:click={confirmSubmit}
                                class="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Submit
                            </button>
                        {:else}
                            <button
                                on:click={nextQuestion}
                                class="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                Next
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <!-- Desktop Layout (Original) -->
            <div class="flex h-screen">
                <!-- Left Panel - PDF Viewer -->
                <div class="w-1/2 bg-white border-r border-gray-300">
                    <div class="h-full flex flex-col">
                        <div class="bg-gray-100 px-4 py-3 border-b">
                            <h3 class="font-semibold text-gray-800">Exam Paper</h3>
                        </div>
                        <div class="flex-1 overflow-hidden">
                            {#if pdfUrl}
                                <iframe 
                                    src={pdfUrl} 
                                    class="w-full h-full border-0"
                                    title="Exam PDF"
                                ></iframe>
                            {:else}
                                <div class="flex items-center justify-center h-full">
                                    <div class="text-center">
                                        <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                        </div>
                                        <p class="text-gray-500">No PDF available</p>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Right Panel - Answer Sheet -->
                <div class="w-1/2 bg-slate-50">
                    <div class="h-full flex flex-col">
                        <!-- Header -->
                        <div class="bg-white px-6 py-4 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <button
                                        on:click={() => goto('/exams')}
                                        class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                                        </svg>
                                        Back to Exams
                                    </button>
                                    <div>
                                        <h2 class="text-xl font-bold text-gray-800">{exam.title}</h2>
                                        <p class="text-sm text-gray-600">{exam.description}</p>
                                    </div>
                                </div>
                                <button
                                    on:click={() => showQuestionList = !showQuestionList}
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                                    </svg>
                                    Questions
                                </button>
                            </div>
                            
                            <!-- Progress Bar -->
                            <div class="mt-4">
                                <div class="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                                    <span>{answeredCount}/{questions.length} answered</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style="width: {progress}%"
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <!-- Question List Dropdown -->
                        {#if showQuestionList}
                            <div class="bg-white border-b border-gray-200 max-h-48 overflow-y-auto">
                                <div class="p-4">
                                    <h3 class="font-semibold text-gray-800 mb-3">Question Navigator</h3>
                                    <div class="grid grid-cols-10 gap-2">
                                        {#each questions as question, index}
                                            <button
                                                on:click={() => goToQuestion(index)}
                                                class="w-8 h-8 text-xs rounded-lg border-2 transition-all duration-200 {
                                                    index === currentQuestionIndex 
                                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                                        : userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''
                                                            ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                                }"
                                            >
                                                {index + 1}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        {/if}

                        <!-- Question Content -->
                        <div class="flex-1 p-6 overflow-y-auto">
                            {#if currentQuestion}
                                <div class="mb-6">
                                    <div class="flex items-center gap-2 mb-4">
                                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-bold text-sm">{currentQuestionIndex + 1}</span>
                                        </div>
                                        <span class="text-sm font-medium px-2 py-1 rounded-full {
                                            currentQuestion.type === 'multiple_choice' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-blue-100 text-blue-700'
                                        }">
                                            {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 'Written Answer'}
                                        </span>
                                    </div>
                                    
                                    <h3 class="text-lg font-semibold text-gray-800 mb-4">
                                        {currentQuestion.question}
                                    </h3>

                                    <!-- Multiple Choice Options -->
                                    {#if currentQuestion.type === 'multiple_choice' && currentQuestion.choices}
                                        <div class="space-y-3">
                                            {#each currentQuestion.choices as choice, index}
                                                <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 {
                                                    selectedChoice === choice 
                                                        ? 'border-blue-500 bg-blue-50' 
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }">
                                                    <input 
                                                        type="radio" 
                                                        name="choice" 
                                                        value={choice}
                                                        bind:group={selectedChoice}
                                                        on:change={() => handleMultipleChoiceAnswer(choice)}
                                                        class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span class="ml-3 text-gray-700">{choice}</span>
                                                </label>
                                            {/each}
                                        </div>
                                    {:else}
                                        <!-- Essay/Fill Answer -->
                                        <div>
                                            <textarea 
                                                bind:value={essayAnswer}
                                                on:input={handleEssayAnswer}
                                                placeholder="Enter your answer here..."
                                                class="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            ></textarea>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <!-- Navigation Footer -->
                        <div class="bg-white border-t border-gray-200 p-4">
                            <div class="flex items-center justify-between">
                                <button
                                    on:click={previousQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    class="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                    </svg>
                                    Previous
                                </button>

                                <div class="flex items-center gap-2">
                                    <!-- Question Status Indicator -->
                                    <div class="flex items-center gap-1 text-sm text-gray-600">
                                        <div class="w-2 h-2 rounded-full {isQuestionAnswered ? 'bg-green-500' : 'bg-gray-300'}"></div>
                                        {isQuestionAnswered ? 'Answered' : 'Not answered'}
                                    </div>
                                </div>

                                {#if currentQuestionIndex === questions.length - 1}
                                    <button
                                        on:click={confirmSubmit}
                                        class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Submit Exam
                                    </button>
                                {:else}
                                    <button
                                        on:click={nextQuestion}
                                        class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    >
                                        Next
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    {:else}
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">No Questions Available</h2>
                <p class="text-gray-300 mb-4">This exam doesn't have any questions yet.</p>
                <button 
                    on:click={() => goto('/exams')}
                    class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                    Back to Exams
                </button>
            </div>
        </div>
    {/if}
</div>

<!-- Submit Confirmation Modal -->
{#if showSubmitConfirmation}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl p-6 max-w-md w-full">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Submit Exam?</h3>
                <p class="text-gray-600 mb-4">
                    You have answered {answeredCount} out of {questions.length} questions.
                </p>
                
                {#if answeredCount < questions.length}
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p class="text-sm text-yellow-800">
                            <strong>Warning:</strong> You haven't answered all questions. 
                            Unanswered questions will be marked as incorrect.
                        </p>
                    </div>
                {/if}
                
                <p class="text-sm text-gray-500">
                    Are you sure you want to submit your exam? This action cannot be undone.
                </p>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-3">
                <button
                    on:click={() => showSubmitConfirmation = false}
                    class="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    on:click={submitExam}
                    disabled={submitting}
                    class="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {#if submitting}
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                    {:else}
                        Submit Exam
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<ToastContainer />
