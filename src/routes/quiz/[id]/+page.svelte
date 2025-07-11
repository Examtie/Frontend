<script lang="ts">
    import PdfViewer from '$lib/components/PdfViewer.svelte';
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

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    let answerSheetWidth = 40.0; // Percentage width for answer sheet (40% default)
    let isResizing = false;
    let examStartTime: Date | null = null;
    let elapsedTime = '00:00:00';
    let timerInterval: number | null = null;
    let showStats = false;
    let autoSaveIndicator = false;
    let autoSaveError = false;
    let lastSaveTime: Date | null = null;
    let showKeyboardHelp = false;
    let autoSaveTimeout: number | null = null;
    let questionStartTimes: Map<string, Date> = new Map(); // Track time per question

    // Get exam ID from route params
    $: examId = $page.params.id;

    onMount(() => {
        if (!$auth.isAuthenticated) {
            goto('/login');
            return;
        }

        // Check if mobile
        function checkMobile() {
            isMobile = window.innerWidth < 768;
        }
        
        checkMobile();
        
        // Load saved answer sheet width from localStorage
        if (typeof window !== 'undefined' && !isMobile) {
            const savedWidth = localStorage.getItem('examtie-answer-sheet-width');
            if (savedWidth) {
                answerSheetWidth = Math.max(25, Math.min(75, parseFloat(savedWidth)));
            }
        }
        
        // Start timer
        examStartTime = new Date();
        timerInterval = setInterval(updateTimer, 1000);
        
        window.addEventListener('resize', checkMobile);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        
        // Remove keyboard shortcuts for resizing as user doesn't want presets

        if (examId) {
            loadExamData();
        }

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
            if (timerInterval) {
                clearInterval(timerInterval);
            }
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
            
            // --- FIXED RESUME LOGIC ---
            // Try to load saved progress first
            try {
                // 1. Fetch all exams that are in progress
                const inProgressExams = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/in-progress`);
                
                // 2. Find the progress data for the current exam
                const progressForThisExam = inProgressExams.find((p: any) => p.exam_id === examId);

                // 3. If progress exists, populate the answers map
                if (progressForThisExam && progressForThisExam.answers) {
                    progressForThisExam.answers.forEach((savedAnswer: any) => {
                        if (savedAnswer.question_id && savedAnswer.answer) {
                            userAnswers.set(savedAnswer.question_id, {
                                question_id: savedAnswer.question_id,
                                answer: savedAnswer.answer
                            });
                        }
                    });
                    
                    const restoredCount = progressForThisExam.answered_count || progressForThisExam.answers.length;
                    if (restoredCount > 0) {
                        toastStore.info(`Restored ${restoredCount} saved answers`);
                    }
                }
            } catch (err) {
                console.warn('Could not load saved progress:', err);
                // Don't throw an error, just continue without saved data.
            }
            
            // Initialize answers for questions that don't have saved answers
            questions.forEach(q => {
                if (!userAnswers.has(q.id)) {
                    userAnswers.set(q.id, {
                        question_id: q.id,
                        answer: q.type === 'multiple_choice' ? '' : ''
                    });
                }
            });

            // Set initial answer for current question
            if (questions.length > 0) {
                const currentQuestion = questions[currentQuestionIndex];
                if (currentQuestion.type === 'multiple_choice') {
                    selectedChoice = userAnswers.get(currentQuestion.id)?.answer as string || '';
                } else {
                    essayAnswer = userAnswers.get(currentQuestion.id)?.answer as string || '';
                }
                
                // Initialize start time for first question
                questionStartTimes.set(currentQuestion.id, new Date());
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
        
        // Auto-save with debouncing
        triggerAutoSave();
    }

    function handleEssayAnswer() {
        if (!questions[currentQuestionIndex]) return;
        
        const questionId = questions[currentQuestionIndex].id;
        
        userAnswers.set(questionId, {
            question_id: questionId,
            answer: essayAnswer
        });
        userAnswers = userAnswers; // Trigger reactivity
        
        // Auto-save with debouncing
        triggerAutoSave();
    }

    function triggerAutoSave() {
        // Clear existing timeout
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        
        // Set new timeout to auto-save after 2 seconds of inactivity
        autoSaveTimeout = setTimeout(async () => {
            await performAutoSave();
        }, 2000);
        
        // Show immediate saving indicator
        autoSaveIndicator = true;
        autoSaveError = false;
    }

    async function performAutoSave() {
        if (!exam || !examStartTime) return;
        
        try {
            const answers = Array.from(userAnswers.values()).filter(answer => 
                answer.answer && answer.answer.toString().trim() !== ''
            );

            // Only save if there are actual answers
            if (answers.length === 0) {
                return;
            }

            const timeSpent = Math.floor((Date.now() - examStartTime.getTime()) / 1000);

            const saveData = {
                answers: answers,
                is_draft: true, // This indicates it's an auto-save, not final submission
                time_spent: timeSpent
            };

            await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/${examId}/save-progress`, {
                method: 'POST',
                body: JSON.stringify(saveData)
            });

            lastSaveTime = new Date();
            
            // Show success indicator briefly
            showAutoSaveIndicator();
            
        } catch (err: any) {
            console.warn('Auto-save failed:', err.message);
            // Show error indicator for failed saves
            showAutoSaveError();
        }
    }

    function showAutoSaveError() {
        autoSaveIndicator = false;
        autoSaveError = true;
        setTimeout(() => {
            autoSaveError = false;
        }, 3000);
    }

    function showAutoSaveIndicator() {
        autoSaveError = false;
        autoSaveIndicator = true;
        lastSaveTime = new Date();
        setTimeout(() => {
            autoSaveIndicator = false;
        }, 2000);
    }

    function goToQuestion(index: number) {
        if (index < 0 || index >= questions.length) return;
        
        // Record time spent on current question
        if (questions[currentQuestionIndex]) {
            const currentQuestionId = questions[currentQuestionIndex].id;
            const startTime = questionStartTimes.get(currentQuestionId);
            if (startTime) {
                const timeSpent = Date.now() - startTime.getTime();
                // Store time spent (could be saved to backend later)
                console.log(`Time spent on question ${currentQuestionIndex + 1}: ${Math.round(timeSpent / 1000)}s`);
            }
        }
        
        currentQuestionIndex = index;
        showQuestionList = false;
        showPdfViewer = false; // Close PDF viewer on mobile when switching questions
        
        // Record start time for new question
        if (questions[index]) {
            const questionId = questions[index].id;
            questionStartTimes.set(questionId, new Date());
        }
        
        // Update form fields based on current question
        if (questions[index]) {
            const currentQuestion = questions[index];
            if (currentQuestion.type === 'multiple_choice') {
                selectedChoice = userAnswers.get(currentQuestion.id)?.answer as string || '';
            } else {
                essayAnswer = userAnswers.get(currentQuestion.id)?.answer as string || '';
            }
        }
        
        // Scroll to the question (for multi-question view)
        if (typeof window !== 'undefined' && !isMobile) {
            setTimeout(() => {
                const questionElement = document.querySelector(`[data-question-index="${index}"]`);
                if (questionElement) {
                    questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }

    function saveCurrentAnswer() {
        // No longer needed with multi-question view - answers are saved directly
        // This function is kept for compatibility but does nothing
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
        showSubmitConfirmation = true;
    }

    async function submitExam() {
        if (!exam || !examStartTime) return;
        
        submitting = true;
        error = '';

        try {
            const answers = Array.from(userAnswers.values()).filter(answer => 
                answer.answer && answer.answer.toString().trim() !== ''
            );

            const timeSpent = Math.floor((Date.now() - examStartTime.getTime()) / 1000);

            const submissionData = {
                answers: answers,
                time_spent: timeSpent
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

    async function manualSave() {
        if (!exam || !examStartTime) return;
        
        try {
            showAutoSaveIndicator();
            await performAutoSave();
            toastStore.success('Progress saved!');
        } catch (err: any) {
            toastStore.error(`Failed to save progress: ${err.message}`);
        }
    }

    // Reactive statements
    $: currentQuestion = questions[currentQuestionIndex];
    $: progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
    $: answeredCount = userAnswers && getAnsweredQuestionsCount();
    $: isQuestionAnswered = currentQuestion ? userAnswers.get(currentQuestion.id)?.answer && userAnswers.get(currentQuestion.id)?.answer.toString().trim() !== '' : false;
    $: pdfWidth = 100 - answerSheetWidth; // PDF width is the remainder
    $: completionPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    $: unansweredCount = questions.length - answeredCount;
    $: estimatedTimeRemaining = answeredCount > 0 && examStartTime ? Math.round((questions.length - answeredCount) * ((Date.now() - examStartTime.getTime()) / (1000 * 60 * answeredCount))) : 0;
    $: timePerQuestion = answeredCount > 0 && examStartTime ? ((Date.now() - examStartTime.getTime()) / (1000 * answeredCount)) : 0;

    // Answer sheet resizing functions
    function handleMouseDown(e: MouseEvent) {
        if (isMobile) return;
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isResizing || isMobile) return;
        
        const containerWidth = window.innerWidth;
        const mouseX = e.clientX;
        
        // Calculate the position as a percentage of the container width
        let newPdfWidthPercent = (mouseX / containerWidth) * 100;
        
        // Constrain the PDF width between 25% and 75%
        newPdfWidthPercent = Math.max(25, Math.min(75, newPdfWidthPercent));
        
        // Update the answer sheet width (it's the remainder)
        const newAnswerSheetWidth = 100 - newPdfWidthPercent;
        
        // Only update if the value actually changed to trigger reactivity
        if (Math.abs(answerSheetWidth - newAnswerSheetWidth) > 0.1) {
            answerSheetWidth = newAnswerSheetWidth;
        }
        
        e.preventDefault();
        e.stopPropagation();
    }

    function handleMouseUp() {
        if (isResizing) {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (typeof window !== 'undefined') {
                localStorage.setItem('examtie-answer-sheet-width', answerSheetWidth.toString());
            }
        }
        isResizing = false;
    }

    function setAnswerSheetWidth(width: number) {
        answerSheetWidth = Math.max(25, Math.min(75, width));
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('examtie-answer-sheet-width', answerSheetWidth.toString());
        }
    }

    function updateTimer() {
        if (!examStartTime) return;
        
        const now = new Date();
        const elapsed = now.getTime() - examStartTime.getTime();
        
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        elapsedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Prevent keyboard shortcuts when typing in textarea or input
        if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
            return;
        }
        
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                previousQuestion();
                break;
            case 'ArrowRight':
                event.preventDefault();
                nextQuestion();
                break;
            case 'Enter':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    confirmSubmit();
                }
                break;
            case 'Escape':
                event.preventDefault();
                showQuestionList = false;
                showSubmitConfirmation = false;
                showKeyboardHelp = false;
                if (isMobile) {
                    showPdfViewer = false;
                }
                break;
            case 'Tab':
                if (event.shiftKey) {
                    event.preventDefault();
                    showQuestionList = !showQuestionList;
                }
                break;
            case 's':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    showStats = !showStats;
                }
                break;
            case '?':
                event.preventDefault();
                showKeyboardHelp = !showKeyboardHelp;
                break;
            // Number keys 1-9 for quick question navigation
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                const questionIndex = parseInt(event.key) - 1;
                if (questionIndex < questions.length) {
                    event.preventDefault();
                    goToQuestion(questionIndex);
                }
                break;
        }
    }
</script>

<svelte:head>
    <title>{exam?.title || 'Quiz'} - ExamTie</title>
    <meta name="description" content={exam?.description || 'Practice quiz on ExamTie'} />
</svelte:head>

<style>
    .resizing {
        cursor: col-resize;
        user-select: none;
    }
    
    .resizing * {
        cursor: col-resize !important;
        user-select: none !important;
    }
    
    .resizing iframe {
        pointer-events: none !important;
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .pulse-green {
        animation: pulseGreen 2s ease-in-out;
    }
    
    @keyframes pulseGreen {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .typing-indicator {
        display: inline-block;
        width: 4px;
        height: 16px;
        background: #3b82f6;
        animation: typing 1s infinite;
    }
    
    @keyframes typing {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
    
    /* Drag handle styles */
    .drag-handle {
        position: relative;
        transition: all 0.2s ease;
    }
    
    .drag-handle:hover {
        transform: scale(1.1);
    }
    
    .drag-handle.dragging {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
</style>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 {isResizing ? 'resizing' : ''}">
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
                    Back
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
                            <!-- Auto-save indicator -->
                            {#if autoSaveIndicator}
                                <div class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 flex items-center gap-1 fade-in">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Saved
                                </div>
                            {/if}
                            
                            <!-- Timer -->
                            <div class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                {elapsedTime}
                            </div>
                            
                            <!-- PDF Toggle Button -->
                            <button
                                on:click={() => showPdfViewer = !showPdfViewer}
                                class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                {showPdfViewer ? 'Hide PDF' : 'View PDF'}
                            </button>
                            
                            <!-- Questions List Toggle -->
                            <button
                                on:click={() => showQuestionList = !showQuestionList}
                                class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
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
                            <span class="flex items-center gap-1">
                                {answeredCount}/{questions.length} answered
                                <span class="text-green-600 font-medium">({completionPercentage.toFixed(0)}%)</span>
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                            <div 
                                class="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
                                style="width: {completionPercentage}%"
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
                                <PdfViewer src={pdfUrl} />
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
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-semibold text-gray-800">Question Navigator</h3>
                                <div class="flex items-center gap-2 text-xs text-gray-500">
                                    <div class="flex items-center gap-1">
                                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Done</span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span>Current</span>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-8 gap-2">
                                {#each questions as question, index}
                                    <button
                                        on:click={() => goToQuestion(index)}
                                        class="relative aspect-square text-xs font-medium rounded border-2 transition-all duration-200 hover:scale-105 {
                                            index === currentQuestionIndex 
                                                ? 'bg-blue-500 border-blue-500 text-white shadow-lg' 
                                                : userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''
                                                    ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                                                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                        }"
                                        title="Question {index + 1}"
                                    >
                                        {index + 1}
                                        {#if index === currentQuestionIndex}
                                            <div class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Mobile Question Content -->
                <div class="p-4 pb-20 bg-gradient-to-b from-slate-50 to-white min-h-screen">
                    {#if currentQuestion}
                        <div class="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <!-- Question Header -->
                            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                            {currentQuestionIndex + 1}
                                        </div>
                                        <span class="text-sm font-medium text-gray-700">
                                            {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 'Essay Answer'}
                                        </span>
                                    </div>
                                    {#if isQuestionAnswered}
                                        <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Done
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="p-4">
                                <!-- Multiple Choice Options -->
                                {#if currentQuestion.type === 'multiple_choice' && currentQuestion.choices}
                                    <div class="space-y-3">
                                        {#each currentQuestion.choices as choice, index}
                                            <label class="cursor-pointer group block">
                                                <input 
                                                    type="radio" 
                                                    name="choice" 
                                                    value={choice}
                                                    bind:group={selectedChoice}
                                                    on:change={() => handleMultipleChoiceAnswer(choice)}
                                                    class="hidden"
                                                />
                                                <div class="flex items-center gap-3 p-3 border-2 rounded-lg transition-all duration-200 group-hover:border-blue-300 group-hover:bg-blue-50 {
                                                    selectedChoice === choice 
                                                        ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                                        : 'border-gray-200 bg-white hover:shadow-sm'
                                                }">
                                                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 {
                                                        selectedChoice === choice 
                                                            ? 'border-blue-500 bg-blue-500' 
                                                            : 'border-gray-300 group-hover:border-blue-300'
                                                    }">
                                                        {#if selectedChoice === choice}
                                                            <div class="w-2 h-2 bg-white rounded-full"></div>
                                                        {/if}
                                                    </div>
                                                    <span class="text-base font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                                                        {choice}
                                                    </span>
                                                </div>
                                            </label>
                                        {/each}
                                    </div>
                                {:else}
                                    <!-- Essay/Fill Answer -->
                                    <div class="relative">
                                        <textarea 
                                            bind:value={essayAnswer}
                                            on:input={handleEssayAnswer}
                                            placeholder="Enter your answer here..."
                                            class="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base leading-relaxed transition-all duration-200"
                                        ></textarea>
                                        {#if essayAnswer.trim()}
                                            <div class="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                                                {essayAnswer.length} characters
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Mobile Navigation Footer -->
                <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <button
                            on:click={previousQuestion}
                            disabled={currentQuestionIndex === 0}
                            class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Prev
                        </button>

                        <div class="flex items-center gap-2 text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded-lg">
                            <div class="w-2 h-2 rounded-full {isQuestionAnswered ? 'bg-green-500' : 'bg-gray-300'} transition-colors"></div>
                            {isQuestionAnswered ? 'Done' : 'Pending'}
                            {#if autoSaveIndicator}
                                <span class="text-green-600 font-medium flex items-center gap-1">
                                    <svg class="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Saved
                                </span>
                            {:else if autoSaveError}
                                <span class="text-red-600 font-medium flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Save failed
                                </span>
                            {/if}
                        </div>

                        {#if currentQuestionIndex === questions.length - 1}
                            <button
                                on:click={confirmSubmit}
                                class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md text-sm"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Submit
                            </button>
                        {:else}
                            <button
                                on:click={nextQuestion}
                                class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
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
            <!-- Desktop Layout with Adjustable Answer Sheet -->
            <div class="flex h-screen relative {isResizing ? 'select-none' : ''}">
                <!-- Left Panel - PDF Viewer -->
                <div class="bg-white border-r border-gray-300 {isResizing ? 'shadow-lg' : 'transition-all duration-200'}" style="width: {pdfWidth}%;">
                    <div class="h-full flex flex-col">
                        <div class="bg-gray-100 px-4 py-3 border-b">
                            <h3 class="font-semibold text-gray-800">{exam?.title || 'Exam Paper'}</h3>
                        </div>
                        <div class="flex-1 overflow-hidden">
                            {#if pdfUrl}
                                <PdfViewer src={pdfUrl} />
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

                <!-- Resize Handle -->
                <button 
                    class="w-3 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 flex items-center justify-center group relative select-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 drag-handle {isResizing ? 'bg-blue-500 dragging' : ''}"
                    on:mousedown={handleMouseDown}
                    aria-label="Resize panels - drag to adjust the size of PDF and answer sheet panels"
                    title="Drag to resize panels"
                    on:keydown={(e) => {
                        if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            answerSheetWidth = Math.min(75, answerSheetWidth + 5);
                            localStorage.setItem('examtie-answer-sheet-width', answerSheetWidth.toString());
                        } else if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            answerSheetWidth = Math.max(25, answerSheetWidth - 5);
                            localStorage.setItem('examtie-answer-sheet-width', answerSheetWidth.toString());
                        }
                    }}
                >
                    <!-- Resize indicator -->
                    <div class="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
                        <div class="w-1 h-8 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity {isResizing ? 'opacity-100' : ''}">
                            <div class="w-full h-full bg-blue-500 rounded-full"></div>
                        </div>
                    </div>
                    <!-- Six dots for visual grip -->
                    <div class="flex flex-col gap-1 opacity-40 group-hover:opacity-100 transition-opacity {isResizing ? 'opacity-100' : ''}">
                        <div class="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div class="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div class="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div class="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div class="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div class="w-1 h-1 bg-gray-600 rounded-full"></div>
                    </div>
                </button>

                <!-- Right Panel - Answer Sheet -->
                <div class="bg-slate-50 {isResizing ? 'shadow-lg' : 'transition-all duration-200'}" style="width: {answerSheetWidth}%;">
                    <div class="h-full flex flex-col">
                        <!-- Header -->
                        <div class="bg-white px-3 py-3 border-b border-gray-200">
                            <div class="flex items-center justify-between gap-2 mb-3">
                                <div class="flex items-center gap-2 min-w-0">
                                    <button
                                        on:click={() => goto('/exams')}
                                        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                                        </svg>
                                        Back
                                    </button>
                                </div>
                                <div class="flex items-center gap-2">
                                    <!-- Auto-save indicator -->
                                    {#if autoSaveIndicator}
                                        <div class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 flex items-center gap-1 fade-in">
                                            <svg class="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Saving...
                                        </div>
                                    {:else if autoSaveError}
                                        <div class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full border border-red-200 flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Save failed
                                        </div>
                                    {:else if lastSaveTime}
                                        <div class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Saved
                                        </div>
                                    {/if}
                                    
                                    <!-- Manual Save Button -->
                                    <button
                                        on:click={manualSave}
                                        class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-200 transition-all duration-200 flex items-center gap-1"
                                        title="Save progress manually"
                                    >
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                        </svg>
                                        Save
                                    </button>
                                    
                                    <!-- Timer -->
                                    <div class="text-xs px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg font-mono border border-blue-200 flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        {elapsedTime}
                                    </div>
                                    
                                    <!-- Stats Toggle -->
                                    <button
                                        on:click={() => showStats = !showStats}
                                        class="inline-flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                        title="Toggle stats"
                                        aria-label="Toggle statistics panel"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                        </svg>
                                    </button>
                                    
                                    <!-- Keyboard Help -->
                                    <button
                                        on:click={() => showKeyboardHelp = !showKeyboardHelp}
                                        class="inline-flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                        title="Keyboard shortcuts"
                                        aria-label="Show keyboard shortcuts help"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </button>
                                    
                                    <button
                                        on:click={() => showQuestionList = !showQuestionList}
                                        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                                        </svg>
                                        <span class="hidden lg:inline">Questions</span>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Progress Bar -->
                            <div>
                                <div class="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                                    <span class="flex items-center gap-1">
                                        {answeredCount}/{questions.length} answered
                                        <span class="text-green-600 font-medium">({completionPercentage.toFixed(0)}%)</span>
                                    </span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                                    <div 
                                        class="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
                                        style="width: {completionPercentage}%"
                                    ></div>
                                </div>
                            </div>
                            
                            <!-- Stats Panel -->
                            {#if showStats}
                                <div class="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 fade-in">
                                    <h4 class="font-medium text-blue-900 mb-2 text-sm">Progress Stats</h4>
                                    <div class="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <div class="text-gray-600 text-xs">Questions Answered</div>
                                            <div class="font-semibold text-blue-700">{answeredCount} of {questions.length}</div>
                                        </div>
                                        <div>
                                            <div class="text-gray-600 text-xs">Completion Rate</div>
                                            <div class="font-semibold text-green-700">{completionPercentage.toFixed(1)}%</div>
                                        </div>
                                        <div>
                                            <div class="text-gray-600 text-xs">Time Elapsed</div>
                                            <div class="font-semibold text-orange-700">{elapsedTime}</div>
                                        </div>
                                        <div>
                                            <div class="text-gray-600 text-xs">Avg. Time/Question</div>
                                            <div class="font-semibold text-purple-700">{Math.round(timePerQuestion)}s</div>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>

                        <!-- Question List Dropdown -->
                        {#if showQuestionList}
                            <div class="bg-white border-b border-gray-200 max-h-48 overflow-y-auto fade-in">
                                <div class="p-3">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="font-semibold text-gray-800 text-sm">Question Navigator</h3>
                                        <div class="flex items-center gap-2 text-xs text-gray-500">
                                            <div class="flex items-center gap-1">
                                                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span>Done</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span>Current</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
                                                <span>Todo</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-12 gap-1">
                                        {#each questions as question, index}
                                            <button
                                                on:click={() => goToQuestion(index)}
                                                class="relative w-6 h-6 text-xs font-medium rounded border-2 transition-all duration-200 hover:scale-105 {
                                                    index === currentQuestionIndex 
                                                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg' 
                                                        : userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''
                                                            ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:border-gray-400'
                                                }"
                                                title="Question {index + 1}"
                                            >
                                                {index + 1}
                                                {#if index === currentQuestionIndex}
                                                    <div class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                                {/if}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        {/if}

                        <!-- Question Content -->
                        <div class="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
                            <!-- Show all questions for multi-question answering -->
                            {#each questions as question, index}
                                <div class="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md {index === currentQuestionIndex ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : ''}" data-question-index={index}>
                                    <!-- Question Header -->
                                    <div class="flex items-center justify-between mb-3">
                                        <div class="flex items-center gap-2">
                                            <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                                {index + 1}
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span class="text-xs font-medium text-gray-600">
                                                    {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Essay Answer'}
                                                </span>
                                                {#if userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''}
                                                    <span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200 flex items-center gap-1">
                                                        <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                        </svg>
                                                        Done
                                                    </span>
                                                {:else}
                                                    <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                                        Todo
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                        {#if index === currentQuestionIndex}
                                            <div class="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                                Current
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Multiple Choice Options -->
                                    {#if question.type === 'multiple_choice' && question.choices}
                                        <div class="flex items-center gap-4 flex-wrap">
                                            <span class="text-sm font-medium text-gray-700">Q{index + 1}:</span>
                                            {#each question.choices as choice, choiceIndex}
                                                <label class="cursor-pointer flex items-center gap-2 group">
                                                    <input 
                                                        type="radio" 
                                                        name="choice_{question.id}" 
                                                        value={choice}
                                                        checked={userAnswers.get(question.id)?.answer === choice}
                                                        on:change={() => {
                                                            userAnswers.set(question.id, {
                                                                question_id: question.id,
                                                                answer: choice
                                                            });
                                                            userAnswers = userAnswers;
                                                            triggerAutoSave();
                                                        }}
                                                        class="hidden"
                                                    />
                                                    <div class="flex items-center gap-1 px-2 py-1 border-2 rounded-lg transition-all duration-200 group-hover:border-blue-300 group-hover:bg-blue-50 {
                                                        userAnswers.get(question.id)?.answer === choice 
                                                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                                            : 'border-gray-200 bg-white hover:shadow-sm'
                                                    }">
                                                        <div class="w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all duration-200 {
                                                            userAnswers.get(question.id)?.answer === choice 
                                                                ? 'border-blue-500 bg-blue-500' 
                                                                : 'border-gray-300 group-hover:border-blue-300'
                                                        }">
                                                            {#if userAnswers.get(question.id)?.answer === choice}
                                                                <div class="w-1 h-1 bg-white rounded-full"></div>
                                                            {/if}
                                                        </div>
                                                        <span class="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                                                            {choice}
                                                        </span>
                                                    </div>
                                                </label>
                                            {/each}
                                        </div>
                                    {:else}
                                        <!-- Essay/Fill Answer -->
                                        <div class="space-y-2">
                                            <div class="relative">
                                                <textarea 
                                                    value={userAnswers.get(question.id)?.answer || ''}
                                                    on:input={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        userAnswers.set(question.id, {
                                                            question_id: question.id,
                                                            answer: target.value
                                                        });
                                                        userAnswers = userAnswers;
                                                        triggerAutoSave();
                                                    }}
                                                    placeholder="Enter your answer here..."
                                                    class="w-full h-32 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 text-sm leading-relaxed"
                                                ></textarea>
                                                {#if userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''}
                                                    <div class="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                                                        {userAnswers.get(question.id)?.answer.toString().length} chars
                                                    </div>
                                                {/if}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>

                        <!-- Navigation Footer -->
                        <div class="bg-white border-t border-gray-200 p-4 shadow-sm">
                            <div class="flex items-center justify-between">
                                <button
                                    on:click={previousQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    class="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-sm"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                    </svg>
                                    Previous
                                </button>

                                <div class="flex items-center gap-4">
                                    <!-- Progress indicator -->
                                    <div class="flex items-center gap-2 text-sm">
                                        <div class="w-2 h-2 rounded-full {isQuestionAnswered ? 'bg-green-500' : 'bg-gray-300'} transition-colors"></div>
                                        <span class="text-gray-600">
                                            {isQuestionAnswered ? 'Answered' : 'Not answered'}
                                        </span>
                                    </div>
                                    
                                    <!-- Auto-save indicator -->
                                    {#if autoSaveIndicator}
                                        <div class="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full fade-in">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Auto-saved
                                        </div>
                                    {/if}
                                </div>

                                {#if currentQuestionIndex === questions.length - 1}
                                    <button
                                        on:click={confirmSubmit}
                                        class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Submit Exam
                                    </button>
                                {:else}
                                    <button
                                        on:click={nextQuestion}
                                        class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
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

<!-- Stats Panel -->
{#if showStats}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800">Quiz Statistics</h3>
                <button
                    on:click={() => showStats = false}
                    class="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close statistics"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="space-y-4">
                <!-- Progress Overview -->
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-3">Progress Overview</h4>
                    <div class="grid grid-cols-2 gap-4 mb-3">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{answeredCount}</div>
                            <div class="text-sm text-gray-600">Answered</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-500">{unansweredCount}</div>
                            <div class="text-sm text-gray-600">Remaining</div>
                        </div>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div 
                            class="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                            style="width: {completionPercentage}%"
                        ></div>
                    </div>
                    <div class="text-center mt-2 text-sm font-medium text-gray-700">
                        {completionPercentage.toFixed(1)}% Complete
                    </div>
                </div>

                <!-- Time Statistics -->
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-3">Time Statistics</h4>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Total Time</span>
                            <span class="font-mono font-medium text-gray-800">{elapsedTime}</span>
                        </div>
                        {#if answeredCount > 0}
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Time per Question</span>
                                <span class="font-mono font-medium text-gray-800">
                                    {Math.floor(timePerQuestion / 1000 / 60)}:{(Math.floor(timePerQuestion / 1000) % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                            {#if estimatedTimeRemaining > 0}
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Est. Time Remaining</span>
                                    <span class="font-mono font-medium text-gray-800">{estimatedTimeRemaining} min</span>
                                </div>
                            {/if}
                        {/if}
                        {#if lastSaveTime}
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Last Saved</span>
                                <span class="text-sm text-gray-800">
                                    {lastSaveTime.toLocaleTimeString()}
                                </span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Question Breakdown -->
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-3">Question Breakdown</h4>
                    <div class="grid grid-cols-2 gap-4">
                        {#if exam?.choice_count && exam.choice_count > 0}
                            <div class="text-center">
                                <div class="text-lg font-bold text-purple-600">{exam.choice_count}</div>
                                <div class="text-xs text-gray-600">Multiple Choice</div>
                            </div>
                        {/if}
                        {#if exam?.essay_count && exam.essay_count > 0}
                            <div class="text-center">
                                <div class="text-lg font-bold text-pink-600">{exam.essay_count}</div>
                                <div class="text-xs text-gray-600">Essay Questions</div>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Quick Navigation -->
                <div class="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-3">Quick Navigation</h4>
                    <div class="grid grid-cols-8 gap-2">
                        {#each questions as question, index}
                            <button
                                on:click={() => {
                                    goToQuestion(index);
                                    showStats = false;
                                }}
                                class="aspect-square text-xs font-medium rounded border-2 transition-all duration-200 hover:scale-105 {
                                    index === currentQuestionIndex 
                                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg' 
                                        : userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''
                                            ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                }"
                            >
                                {index + 1}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Keyboard Help Modal -->
{#if showKeyboardHelp}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800">Keyboard Shortcuts</h3>
                <button
                    on:click={() => showKeyboardHelp = false}
                    class="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close keyboard shortcuts help"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Previous Question</span>
                    <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Next Question</span>
                    <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Submit Exam</span>
                    <div class="flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl</kbd>
                        <span class="text-gray-400">+</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Enter</kbd>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Toggle Questions</span>
                    <div class="flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Shift</kbd>
                        <span class="text-gray-400">+</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Tab</kbd>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Toggle Stats</span>
                    <div class="flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl</kbd>
                        <span class="text-gray-400">+</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">S</kbd>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Jump to Question</span>
                    <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">1-9</kbd>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Close Dialogs</span>
                    <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Esc</kbd>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600">Show Help</span>
                    <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">?</kbd>
                </div>
            </div>
            
            <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                <p class="text-xs text-blue-700">
                    <strong>Tip:</strong> Keyboard shortcuts are disabled when typing in answer fields.
                </p>
            </div>
        </div>
    </div>
{/if}

<!-- Submit Confirmation Modal -->
{#if showSubmitConfirmation}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Ready to Submit?</h3>
                <p class="text-gray-600 mb-4">
                    You have answered <span class="font-semibold text-green-600">{answeredCount}</span> out of <span class="font-semibold">{questions.length}</span> questions.
                </p>
                
                <!-- Progress Summary -->
                <div class="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">Progress Summary</span>
                        <span class="text-sm font-bold text-blue-600">{completionPercentage.toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                            class="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                            style="width: {completionPercentage}%"
                        ></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span class="text-gray-600">Answered: {answeredCount}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 bg-gray-300 rounded-full"></div>
                            <span class="text-gray-600">Remaining: {unansweredCount}</span>
                        </div>
                    </div>
                </div>
                
                {#if unansweredCount > 0}
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div class="flex items-center gap-2 mb-1">
                            <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                            <span class="text-sm font-medium text-yellow-800">Notice</span>
                        </div>
                        <p class="text-sm text-yellow-800">
                            You have <span class="font-semibold">{unansweredCount}</span> unanswered questions. 
                            They will be marked as incomplete.
                        </p>
                    </div>
                {/if}
                
                <p class="text-sm text-gray-500">
                    Time elapsed: <span class="font-mono font-medium">{elapsedTime}</span>
                </p>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-3">
                <button
                    on:click={() => showSubmitConfirmation = false}
                    class="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                    </svg>
                    Review Answers
                </button>
                <button
                    on:click={submitExam}
                    disabled={submitting}
                    class="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                    {#if submitting}
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                    {:else}
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Submit Exam
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<ToastContainer />