<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { onMount } from 'svelte';
    import katex from 'katex';
    import ScientificCalculator from './ScientificCalculator.svelte';
    import MarkdownNotepad from './MarkdownNotepad.svelte';

    // Types
    type Question = {
        id: string;
        type: 'multiple_choice' | 'fill' | 'essay';
        question: string;
        choices?: string[];
        answer?: string | string[];
    };

    type UserAnswer = {
        question_id: string;
        answer: string | string[];
    };

    export let questions: Question[] = [];
    export let examTitle: string = '';
    export let examStartTime: Date | null = null;

    const dispatch = createEventDispatcher();

    // UI state
    let currentQuestionIndex = 0;
    let userAnswers: Map<string, UserAnswer> = new Map();
    let showQuestionList = false;
    let selectedChoice = '';
    let essayAnswer = '';
    let elapsedTime = '00:00:00';
    let timerInterval: number | null = null;
    let showSubmitConfirmation = false;
    let autoSaveIndicator = false;
    let autoSaveError = false;
    let showStats = false;
    let showNotepad = false;
    let showCalculator = false;
    let showDesmos = false;
    let notepadContent = '';
    let lastSaveTime: Date | null = null;
    let isMobile = false;
    
    // Resizable panel state
    let toolPanelWidth = 400; // Reduced default width in pixels (was 600)
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let showToolPanelPopout = false;

    // Reactive variables
    $: currentQuestion = questions[currentQuestionIndex];
    $: progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
    $: answeredCount = getAnsweredQuestionsCount();
    $: isQuestionAnswered = currentQuestion ? userAnswers.get(currentQuestion.id)?.answer && userAnswers.get(currentQuestion.id)?.answer.toString().trim() !== '' : false;
    $: completionPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    $: unansweredCount = questions.length - answeredCount;
    $: estimatedTimeRemaining = answeredCount > 0 && examStartTime ? Math.round((questions.length - answeredCount) * ((Date.now() - examStartTime.getTime()) / (1000 * 60 * answeredCount))) : 0;
    $: timePerQuestion = answeredCount > 0 && examStartTime ? ((Date.now() - examStartTime.getTime()) / (1000 * answeredCount)) : 0;

    onMount(() => {
        if (examStartTime) {
            timerInterval = setInterval(updateTimer, 1000);
        }

        // Initialize form fields for current question
        if (questions.length > 0 && currentQuestion) {
            updateFormFields();
        }

        // Load notepad content from localStorage
        const savedNotepad = localStorage.getItem('aiExamNotepad');
        if (savedNotepad) {
            notepadContent = savedNotepad;
        }

        // Check if mobile
        function checkMobile() {
            isMobile = window.innerWidth < 768;
        }
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // Load notepad content from localStorage
        const savedNotepadContent = localStorage.getItem('examNotepadContent');
        if (savedNotepadContent) {
            notepadContent = savedNotepadContent;
        }

        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            window.removeEventListener('resize', checkMobile);
        };
    });
    
    // Save notepad content to localStorage whenever it changes
    $: if (notepadContent !== undefined) {
        localStorage.setItem('examNotepadContent', notepadContent);
    }

    function renderLatex(text: string): string {
        if (!text) return '';
        
        // Replace $...$ with rendered LaTeX
        return text.replace(/\$([^$]+)\$/g, (match, latex) => {
            try {
                return katex.renderToString(latex, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.warn('LaTeX rendering error:', e);
                return match; // Return original if rendering fails
            }
        });
    }

    function saveNotepad() {
        localStorage.setItem('aiExamNotepad', notepadContent);
        lastSaveTime = new Date();
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

    function getAnsweredQuestionsCount(): number {
        let count = 0;
        userAnswers.forEach(answer => {
            if (answer.answer && answer.answer.toString().trim() !== '') {
                count++;
            }
        });
        return count;
    }

    function updateFormFields() {
        if (!currentQuestion) return;
        
        const answer = userAnswers.get(currentQuestion.id);
        if (currentQuestion.type === 'multiple_choice') {
            selectedChoice = answer ? answer.answer.toString() : '';
        } else if (currentQuestion.type === 'essay' || currentQuestion.type === 'fill') {
            essayAnswer = answer ? answer.answer.toString() : '';
        }
    }

    function handleMultipleChoiceAnswer(choice: string) {
        if (!currentQuestion) return;
        
        selectedChoice = choice;
        userAnswers.set(currentQuestion.id, {
            question_id: currentQuestion.id,
            answer: choice
        });
        userAnswers = userAnswers; // Trigger reactivity
        showAutoSaveIndicator();
    }

    function handleEssayAnswer() {
        if (!currentQuestion) return;
        
        userAnswers.set(currentQuestion.id, {
            question_id: currentQuestion.id,
            answer: essayAnswer
        });
        userAnswers = userAnswers; // Trigger reactivity
        showAutoSaveIndicator();
    }

    function showAutoSaveIndicator() {
        autoSaveError = false;
        autoSaveIndicator = true;
        setTimeout(() => {
            autoSaveIndicator = false;
        }, 2000);
    }

    function goToQuestion(index: number) {
        if (index < 0 || index >= questions.length) return;
        
        currentQuestionIndex = index;
        showQuestionList = false;
        updateFormFields();
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

    function confirmSubmit() {
        showSubmitConfirmation = true;
    }

    function submitExam() {
        const answers = Array.from(userAnswers.values()).map(answer => ({
            question_id: answer.question_id,
            answer: answer.answer
        }));
        dispatch('submit', { answers, elapsedTime });
        showSubmitConfirmation = false;
    }

    function getQuestionStatusIcon(index: number) {
        const question = questions[index];
        if (!question) return '○';
        
        const answer = userAnswers.get(question.id);
        if (answer && answer.answer.toString().trim() !== '') {
            return '✓';
        }
        return '○';
    }

    function getQuestionStatusColor(index: number) {
        const question = questions[index];
        if (!question) return 'text-gray-400';
        
        const answer = userAnswers.get(question.id);
        if (answer && answer.answer.toString().trim() !== '') {
            return 'text-green-400';
        }
        return 'text-gray-400';
    }

    // Resizing functions
    function startResize(event: MouseEvent) {
        isResizing = true;
        startX = event.clientX;
        startWidth = toolPanelWidth;
        
        // Add event listeners to document
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    function handleResize(event: MouseEvent) {
        if (!isResizing) return;
        
        const deltaX = startX - event.clientX; // Negative delta means expanding left
        const newWidth = Math.max(250, Math.min(600, startWidth + deltaX)); // Min 250px, max 600px (reduced from 300-800)
        toolPanelWidth = newWidth;
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    function toggleToolPopout() {
        if (!showToolPanelPopout) {
            // Open in new window
            const activeToolName = getActiveToolName();
            let url = '';
            let windowFeatures = 'width=800,height=600,scrollbars=yes,resizable=yes';
            
            if (showNotepad) {
                // Create a proper notepad popout
                url = 'https://www.desmos.com/calculator';
                windowFeatures = 'width=800,height=600,scrollbars=yes,resizable=yes';
            } else if (showCalculator) {
                // Create a calculator popout that works properly
                url = 'https://www.desmos.com/scientific';
                windowFeatures = 'width=550,height=750,scrollbars=no,resizable=yes';
            } else if (showDesmos) {
                url = 'https://www.desmos.com/calculator';
                windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes';
            }
            
            if (url) {
                const popoutWindow = window.open(url, `examtie-${activeToolName.toLowerCase()}`, windowFeatures);
                
                if (popoutWindow) {
                    // Set up communication for notepad
                    if (showNotepad) {
                        const messageHandler = (event: MessageEvent) => {
                            if (event.data.type === 'notepad-update') {
                                notepadContent = event.data.content;
                                saveNotepad();
                            }
                        };
                        window.addEventListener('message', messageHandler);
                        
                        popoutWindow.addEventListener('load', () => {
                            popoutWindow.postMessage({
                                type: 'notepad-sync',
                                content: notepadContent
                            }, '*');
                        });
                        
                        const checkClosed = setInterval(() => {
                            if (popoutWindow.closed) {
                                window.removeEventListener('message', messageHandler);
                                clearInterval(checkClosed);
                                showToolPanelPopout = false;
                            }
                        }, 1000);
                    } else {
                        // For calculator and desmos, just track if window is closed
                        const checkClosed = setInterval(() => {
                            if (popoutWindow.closed) {
                                clearInterval(checkClosed);
                                showToolPanelPopout = false;
                            }
                        }, 1000);
                    }
                    
                    showToolPanelPopout = true;
                }
            }
        } else {
            showToolPanelPopout = false;
        }
    }

    function getActiveToolName() {
        if (showNotepad) return 'Notepad';
        if (showCalculator) return 'Calculator';
        if (showDesmos) return 'Desmos';
        return '';
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col">
    <!-- Header -->
    <div class="bg-white/10 backdrop-blur-md border-b border-white/20 px-3 py-2 md:px-6 md:py-3 flex-shrink-0 relative z-40">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 md:gap-4">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <svg class="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <div class="px-1.5 py-0.5 md:px-2 md:py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold rounded-full">
                        AI
                    </div>
                </div>
                <div>
                    <h1 class="text-sm md:text-lg font-semibold text-white">{examTitle}</h1>
                    <p class="text-xs md:text-sm text-gray-300">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
            </div>
            
            <!-- Header Controls - Will stay fixed even when tools are open -->
            <div class="flex items-center gap-2 md:gap-4 bg-white/5 backdrop-blur-sm rounded-lg px-2 py-1 md:px-4 md:py-2 border border-white/10">
                <!-- Timer -->
                <div class="flex items-center gap-1 md:gap-2 bg-white/10 rounded-lg px-2 py-1 md:px-3 md:py-2">
                    <svg class="w-3 h-3 md:w-4 md:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-white font-mono text-xs md:text-sm">{elapsedTime}</span>
                </div>

                <!-- Progress -->
                <div class="flex items-center gap-1 md:gap-2 bg-white/10 rounded-lg px-2 py-1 md:px-3 md:py-2">
                    <span class="text-white text-xs md:text-sm">{answeredCount}/{questions.length}</span>
                    <div class="w-12 md:w-16 h-1.5 md:h-2 bg-white/20 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300" style="width: {completionPercentage}%"></div>
                    </div>
                </div>

                <!-- Stats Button -->
                <button
                    on:click={() => showStats = !showStats}
                    class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
                    title="Quiz statistics"
                    aria-label="Toggle quiz statistics"
                >
                    <svg class="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </button>

                <!-- Question List Toggle -->
                <button
                    on:click={() => showQuestionList = !showQuestionList}
                    class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
                    title="Question list"
                    aria-label="Toggle question list"
                >
                    <svg class="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                    </svg>
                </button>

                <!-- Tool Panel Buttons -->
                <div class="flex items-center gap-1 md:gap-2 border-l border-white/20 pl-2 md:pl-4 ml-1 md:ml-2">
                    <button
                        on:click={() => showNotepad = !showNotepad}
                        class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 {showNotepad ? 'bg-white/20' : ''}"
                        title="Toggle notepad"
                        aria-label="Toggle notepad"
                    >
                        <svg class="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    
                    <button
                        on:click={() => showCalculator = !showCalculator}
                        class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 {showCalculator ? 'bg-white/20' : ''}"
                        title="Toggle calculator"
                        aria-label="Toggle calculator"
                    >
                        <svg class="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                    
                    <button
                        on:click={() => showDesmos = !showDesmos}
                        class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 {showDesmos ? 'bg-white/20' : ''}"
                        title="Toggle Desmos graphing calculator"
                        aria-label="Toggle Desmos graphing calculator"
                    >
                        <svg class="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
        <!-- Quiz Content Area -->
        <div class="flex-1 flex flex-col transition-all duration-200" style="margin-right: {(showNotepad || showCalculator || showDesmos) && !isMobile && !showToolPanelPopout ? toolPanelWidth + 'px' : '0'}">
            <!-- Tool Panel Push-down Area for Mobile -->
            {#if (showNotepad || showCalculator || showDesmos) && isMobile}
                <div class="bg-white/5 backdrop-blur-md border-b border-white/20 p-4 flex-shrink-0 relative z-30">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-white font-medium flex items-center gap-2">
                            {#if showNotepad}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Notepad
                            {:else if showCalculator}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                                Calculator
                            {:else if showDesmos}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                                </svg>
                                Desmos
                            {/if}
                        </h3>
                        
                        <div class="flex items-center gap-2">
                            <!-- Tool selection buttons for mobile -->
                            <div class="flex gap-1 bg-white/10 rounded-lg p-1">
                                <button
                                    on:click={() => { showNotepad = true; showCalculator = false; showDesmos = false; }}
                                    class="p-2 rounded-md {showNotepad ? 'bg-white/20' : 'hover:bg-white/10'} transition-colors"
                                    title="Notepad"
                                    aria-label="Switch to notepad"
                                >
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button
                                    on:click={() => { showNotepad = false; showCalculator = true; showDesmos = false; }}
                                    class="p-2 rounded-md {showCalculator ? 'bg-white/20' : 'hover:bg-white/10'} transition-colors"
                                    title="Calculator"
                                    aria-label="Switch to calculator"
                                >
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                    </svg>
                                </button>
                                <button
                                    on:click={() => { showNotepad = false; showCalculator = false; showDesmos = true; }}
                                    class="p-2 rounded-md {showDesmos ? 'bg-white/20' : 'hover:bg-white/10'} transition-colors"
                                    title="Desmos"
                                    aria-label="Switch to Desmos"
                                >
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Close button -->
                            <button
                                on:click={() => {
                                    showNotepad = false;
                                    showCalculator = false;
                                    showDesmos = false;
                                }}
                                class="p-2 hover:bg-white/20 rounded-lg transition-colors bg-red-500/20 hover:bg-red-500/30"
                                title="Close panel"
                                aria-label="Close panel"
                            >
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Mobile Tool Content -->
                    <div class="max-h-60 md:max-h-80 overflow-hidden rounded-lg">
                        {#if showNotepad}
                            <div class="h-60 md:h-80">
                                <MarkdownNotepad bind:content={notepadContent} onSave={saveNotepad} />
                            </div>
                        {:else if showCalculator}
                            <div class="flex justify-center py-2">
                                <div class="scale-75 md:scale-100 origin-top">
                                    <ScientificCalculator />
                                </div>
                            </div>
                        {:else if showDesmos}
                            <iframe
                                src="https://www.desmos.com/calculator"
                                class="w-full h-60 md:h-80 rounded-lg border border-white/20"
                                title="Desmos Graphing Calculator"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            ></iframe>
                        {/if}
                    </div>
                </div>
            {/if}
            <!-- Question Area -->
            <div class="flex-1 flex items-start justify-center p-2 md:p-4 lg:p-6 overflow-y-auto">
                {#if currentQuestion}
                    <div class="w-full max-w-lg md:max-w-2xl lg:max-w-3xl">
                        <div class="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
                            <!-- Question Header -->
                            <div class="bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-4 py-4 md:px-6 md:py-5 lg:px-6 lg:py-6 border-b border-white/10">
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="px-3 py-1 bg-white/20 rounded-full text-xs md:text-sm text-white font-medium">
                                        {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 
                                         currentQuestion.type === 'essay' ? 'Essay' : 'Fill in the blank'}
                                    </span>
                                    {#if autoSaveIndicator}
                                        <div class="flex items-center gap-2 text-green-400 text-xs">
                                            <div class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                            Saved
                                        </div>
                                    {/if}
                                </div>
                                <h2 class="text-lg md:text-xl lg:text-2xl font-semibold text-white leading-snug">
                                    {@html renderLatex(currentQuestion.question)}
                                </h2>
                            </div>

                            <!-- Question Content -->
                            <div class="p-4 md:p-6">
                                {#if currentQuestion.type === 'multiple_choice' && currentQuestion.choices}
                                    <div class="space-y-3 md:space-y-4">
                                        {#each currentQuestion.choices as choice, index}
                                            <label class="flex items-center p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-xl border border-white/10 hover:border-white/20 cursor-pointer transition-all duration-200 group">
                                                <input
                                                    type="radio"
                                                    name="choice"
                                                    value={choice}
                                                    bind:group={selectedChoice}
                                                    on:change={() => handleMultipleChoiceAnswer(choice)}
                                                    class="w-4 h-4 md:w-5 md:h-5 text-blue-500 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                                />
                                                <span class="ml-3 md:ml-4 text-sm md:text-base lg:text-lg text-white group-hover:text-blue-200 transition-colors duration-200 leading-snug">
                                                    {@html renderLatex(choice)}
                                                </span>
                                            </label>
                                        {/each}
                                    </div>
                                {:else if currentQuestion.type === 'essay' || currentQuestion.type === 'fill'}
                                    <div>
                                        <textarea
                                            bind:value={essayAnswer}
                                            on:input={handleEssayAnswer}
                                            placeholder="Enter your answer here..."
                                            class="w-full h-32 md:h-40 p-3 md:p-4 bg-white/5 border border-white/20 rounded-lg md:rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none transition-all duration-200 text-sm md:text-base leading-relaxed"
                                            rows={currentQuestion.type === 'essay' ? 8 : 5}
                                        ></textarea>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Navigation -->
                        <div class="flex items-center justify-between mt-4 md:mt-6">
                            <button
                                on:click={previousQuestion}
                                disabled={currentQuestionIndex === 0}
                                class="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg md:rounded-xl transition-all duration-200 text-sm md:text-base font-medium"
                            >
                                <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                                Previous
                            </button>

                            <div class="flex items-center gap-3 md:gap-4">
                                <span class="text-white/70 text-sm md:text-base font-medium">
                                    {currentQuestionIndex + 1} of {questions.length}
                                </span>
                                
                                {#if currentQuestionIndex === questions.length - 1}
                                    <button
                                        on:click={confirmSubmit}
                                        class="px-6 py-2 md:px-8 md:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg md:rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 text-sm md:text-base shadow-lg"
                                    >
                                        Submit Exam
                                    </button>
                                {:else}
                                    <button
                                        on:click={nextQuestion}
                                        class="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg md:rounded-xl transition-all duration-200 text-sm md:text-base font-medium"
                                    >
                                        Next
                                        <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Right-side Resizable Tool Panel -->
        {#if (showNotepad || showCalculator || showDesmos) && !isMobile && !showToolPanelPopout}
            <div 
                class="fixed right-0 bg-white/5 backdrop-blur-md border-l border-white/20 flex flex-col z-30 {isResizing ? 'resizing' : 'tool-panel-transition'}"
                style="width: {toolPanelWidth}px; top: 80px; bottom: 0;"
            >
                <!-- Resize Handle -->
                <div 
                    class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors group resize-handle"
                    on:mousedown={startResize}
                    title="Drag to resize"
                    role="button"
                    tabindex="0"
                    aria-label="Resize panel"
                    on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            // Could implement keyboard resizing here
                        }
                    }}
                >
                    <div class="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white/30 group-hover:bg-blue-400 transition-colors rounded-r"></div>
                </div>

                <!-- Tool Panel Header -->
                <div class="bg-white/10 px-4 py-3 border-b border-white/20 flex items-center justify-between flex-shrink-0">
                    <div class="flex items-center gap-3">
                        <h3 class="text-white font-medium flex items-center gap-2">
                            {#if showNotepad}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Notepad
                            {:else if showCalculator}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                                Calculator
                            {:else if showDesmos}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                                </svg>
                                Desmos
                            {/if}
                        </h3>

                        <!-- Tool selection buttons -->
                        <div class="flex gap-1 bg-white/10 rounded-lg p-1">
                            <button
                                on:click={() => { showNotepad = true; showCalculator = false; showDesmos = false; }}
                                class="p-1.5 rounded-md {showNotepad ? 'bg-white/20' : 'hover:bg-white/10'} transition-colors"
                                title="Notepad"
                                aria-label="Switch to notepad"
                            >
                                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                            </button>
                            <button
                                on:click={() => { showNotepad = false; showCalculator = true; showDesmos = false; }}
                                class="p-1.5 rounded-md {showCalculator ? 'bg-white/20' : 'hover:bg-white/10'} transition-colors"
                                title="Calculator"
                                aria-label="Switch to calculator"
                            >
                                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                            </button>
                            <button
                                on:click={() => { showNotepad = false; showCalculator = false; showDesmos = true; }}
                                class="p-1.5 rounded-md {showDesmos ? 'bg-white/20' : 'hover:bg-white/10'} transition-colors"
                                title="Desmos"
                                aria-label="Switch to Desmos"
                            >
                                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- Pop-out button -->
                        <button
                            on:click={toggleToolPopout}
                            class="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            title="Pop out to new window"
                            aria-label="Pop out to new window"
                        >
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                        </button>
                        
                        <!-- Close button -->
                        <button
                            on:click={() => {
                                showNotepad = false;
                                showCalculator = false;
                                showDesmos = false;
                            }}
                            class="p-2 hover:bg-red-500/30 bg-red-500/20 rounded-lg transition-colors"
                            title="Close panel"
                            aria-label="Close panel"
                        >
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Tool Content -->
                <div class="flex-1 overflow-hidden">
                    {#if showNotepad}
                        <div class="h-full p-4">
                            <MarkdownNotepad bind:content={notepadContent} onSave={saveNotepad} />
                        </div>
                    {:else if showCalculator}
                        <div class="h-full p-6 flex justify-center overflow-y-auto">
                            <div class="w-full max-w-lg">
                                <ScientificCalculator />
                            </div>
                        </div>
                    {:else if showDesmos}
                        <iframe
                            src="https://www.desmos.com/calculator"
                            class="w-full h-full border-0"
                            title="Desmos Graphing Calculator"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                        ></iframe>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
    <!-- Tool Panels (Desktop Only Split View) -->
    {#if !isMobile}
        <!-- Legacy panels - kept for backward compatibility but empty -->
    {/if}
</div>

<!-- Submit Confirmation Modal -->
{#if showSubmitConfirmation}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div class="text-center">
                <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-white mb-2">Submit Exam?</h3>
                <p class="text-gray-300 mb-6">
                    You have answered {answeredCount} out of {questions.length} questions.
                    {#if unansweredCount > 0}
                        <br><span class="text-orange-400">{unansweredCount} questions remain unanswered.</span>
                    {/if}
                </p>
                <div class="flex gap-3">
                    <button
                        on:click={() => showSubmitConfirmation = false}
                        class="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200"
                    >
                        Continue
                    </button>
                    <button
                        on:click={submitExam}
                        class="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all duration-200"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Enhanced Stats Panel -->
{#if showStats}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    AI Quiz Analytics
                </h3>
                <button
                    on:click={() => showStats = false}
                    class="text-gray-300 hover:text-white transition-colors"
                    aria-label="Close statistics"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="space-y-6">
                <!-- Progress Overview -->
                <div class="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl p-5 border border-blue-400/30">
                    <h4 class="font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                        </svg>
                        Progress Overview
                    </h4>
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-blue-400">{answeredCount}</div>
                            <div class="text-sm text-gray-300">Answered</div>
                        </div>
                        <div class="text-center">
                            <div class="text-3xl font-bold text-gray-400">{unansweredCount}</div>
                            <div class="text-sm text-gray-300">Remaining</div>
                        </div>
                        <div class="text-center">
                            <div class="text-3xl font-bold text-purple-400">{questions.length}</div>
                            <div class="text-sm text-gray-300">Total</div>
                        </div>
                    </div>
                    <div class="w-full bg-white/20 rounded-full h-4">
                        <div 
                            class="bg-gradient-to-r from-blue-400 to-indigo-400 h-4 rounded-full transition-all duration-700 relative overflow-hidden"
                            style="width: {completionPercentage}%"
                        >
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </div>
                    </div>
                    <div class="text-center mt-3 text-lg font-medium text-white">
                        {completionPercentage.toFixed(1)}% Complete
                    </div>
                </div>

                <!-- Time & Performance Statistics -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Time Statistics -->
                    <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-5 border border-green-400/30">
                        <h4 class="font-semibold text-white mb-4 flex items-center gap-2">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Time Analysis
                        </h4>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-300">Total Time</span>
                                <span class="font-mono font-bold text-white text-lg">{elapsedTime}</span>
                            </div>
                            {#if answeredCount > 0}
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-300">Avg per Question</span>
                                    <span class="font-mono font-medium text-white">
                                        {Math.floor(timePerQuestion / 1000 / 60)}:{(Math.floor(timePerQuestion / 1000) % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                {#if estimatedTimeRemaining > 0}
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-300">Est. Remaining</span>
                                        <span class="font-mono font-medium text-green-400">{estimatedTimeRemaining} min</span>
                                    </div>
                                {/if}
                            {/if}
                            {#if lastSaveTime}
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-300">Last Saved</span>
                                    <span class="text-sm text-white">
                                        {lastSaveTime.toLocaleTimeString()}
                                    </span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- AI Exam Info -->
                    <div class="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-5 border border-purple-400/30">
                        <h4 class="font-semibold text-white mb-4 flex items-center gap-2">
                            <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            AI Exam Info
                        </h4>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-300">Exam Type</span>
                                <span class="px-2 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs font-medium">AI Generated</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-300">Multiple Choice</span>
                                <span class="font-medium text-white">{questions.filter(q => q.type === 'multiple_choice').length}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-300">Essay Questions</span>
                                <span class="font-medium text-white">{questions.filter(q => q.type === 'essay').length}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-300">Fill-in-blank</span>
                                <span class="font-medium text-white">{questions.filter(q => q.type === 'fill').length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Navigation Grid -->
                <div class="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-xl p-5 border border-orange-400/30">
                    <h4 class="font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"></path>
                        </svg>
                        Quick Navigation
                    </h4>
                    <div class="grid grid-cols-10 gap-2">
                        {#each questions as question, index}
                            <button
                                on:click={() => {
                                    goToQuestion(index);
                                    showStats = false;
                                }}
                                class="aspect-square text-xs font-bold rounded-lg border-2 transition-all duration-200 hover:scale-110 transform {
                                    index === currentQuestionIndex 
                                        ? 'bg-blue-500 border-blue-400 text-white shadow-lg scale-110' 
                                        : userAnswers.get(question.id)?.answer && userAnswers.get(question.id)?.answer.toString().trim() !== ''
                                            ? 'bg-green-500 border-green-400 text-white hover:bg-green-600'
                                            : 'bg-white/10 border-white/30 text-gray-300 hover:bg-white/20 hover:border-white/50'
                                }"
                                title="Question {index + 1}{userAnswers.get(question.id)?.answer ? ' (Answered)' : ' (Unanswered)'}"
                            >
                                {index + 1}
                            </button>
                        {/each}
                    </div>
                    <div class="mt-4 flex items-center justify-center gap-6 text-sm">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 bg-blue-500 rounded border border-blue-400"></div>
                            <span class="text-gray-300">Current</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 bg-green-500 rounded border border-green-400"></div>
                            <span class="text-gray-300">Answered</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 bg-white/10 rounded border border-white/30"></div>
                            <span class="text-gray-300">Unanswered</span>
                        </div>
                    </div>
                </div>

                <!-- Performance Tips -->
                <div class="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-5 border border-yellow-400/30">
                    <h4 class="font-semibold text-white mb-3 flex items-center gap-2">
                        <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                        </svg>
                        Performance Tips
                    </h4>
                    <div class="space-y-2 text-sm text-gray-200">
                        {#if completionPercentage < 25}
                            <p>🚀 You're just getting started! Take your time to read each question carefully.</p>
                        {:else if completionPercentage < 50}
                            <p>💪 Great progress! You're moving at a good pace.</p>
                        {:else if completionPercentage < 75}
                            <p>🎯 You're more than halfway there! Keep up the excellent work.</p>
                        {:else if completionPercentage < 100}
                            <p>🏁 Almost done! Review any unanswered questions before submitting.</p>
                        {:else}
                            <p>✨ Excellent! All questions answered. Ready to submit when you are.</p>
                        {/if}
                        
                        {#if timePerQuestion > 180000}
                            <p>⏱️ Consider moving a bit faster to maintain momentum.</p>
                        {:else if timePerQuestion < 60000}
                            <p>⚡ You're answering quickly! Make sure to read questions thoroughly.</p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Question List Sidebar -->
{#if showQuestionList}
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" 
        on:click={() => showQuestionList = false}
        on:keydown={(e) => e.key === 'Escape' && (showQuestionList = false)}
        role="dialog"
        aria-modal="true"
        aria-label="Question list"
        tabindex="-1"
    >
        <div 
            class="absolute right-0 top-0 h-full w-80 bg-white/10 backdrop-blur-md border-l border-white/20" 
            on:click|stopPropagation
            on:keydown|stopPropagation
            role="dialog"
            tabindex="0"
        >
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-white">Questions</h3>
                    <button
                        on:click={() => showQuestionList = false}
                        class="p-1 hover:bg-white/20 rounded"
                        aria-label="Close question list"
                    >
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="grid grid-cols-5 gap-2">
                    {#each questions as question, index}
                        <button
                            on:click={() => goToQuestion(index)}
                            class="aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 {
                                index === currentQuestionIndex 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }"
                        >
                            <span class="text-xs {getQuestionStatusColor(index)}">{getQuestionStatusIcon(index)}</span>
                            <span class="ml-1">{index + 1}</span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Pop-out Tool Window (only shown when user clicks pop-out, not used for mobile) -->
{#if showToolPanelPopout}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 max-w-4xl w-full h-[80vh] flex flex-col">
            <div class="bg-white/10 px-4 py-3 border-b border-white/20 flex items-center justify-between">
                <h3 class="text-white font-medium flex items-center gap-2">
                    {#if showNotepad}
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Notepad
                    {:else if showCalculator}
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        Calculator
                    {:else if showDesmos}
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                        </svg>
                        Desmos
                    {/if}
                    - Pop-out Mode (Will open in new browser window)
                </h3>
                
                <div class="flex items-center gap-2">
                    <!-- Dock back button -->
                    <button
                        on:click={toggleToolPopout}
                        class="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Cancel pop-out"
                        aria-label="Cancel pop-out"
                    >
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4a1 1 0 011-1h4m0 0L4 8m0 0v4m15-8v4a1 1 0 01-1 1h-4m0 0L20 4m0 0H16"></path>
                        </svg>
                    </button>
                    
                    <!-- Close button -->
                    <button
                        on:click={() => {
                            showToolPanelPopout = false;
                            showNotepad = false;
                            showCalculator = false;
                            showDesmos = false;
                        }}
                        class="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Close tool"
                        aria-label="Close tool"
                    >
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-hidden p-6 flex items-center justify-center">
                <div class="text-center text-white">
                    <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Opening in New Window</h3>
                    <p class="text-gray-300">
                        {getActiveToolName()} will open in a separate browser window for better multitasking.
                    </p>
                    <p class="text-sm text-gray-400 mt-2">
                        If the window didn't open, please check your popup blocker settings.
                    </p>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    @reference "tailwindcss";

    :global(.katex) {
        color: inherit !important;
    }
    
    :global(.katex .base) {
        color: inherit !important;
    }
    
    :global(.katex-display) {
        margin: 0.5em 0 !important;
    }

    /* Resizing styles */
    .resizing {
        user-select: none;
        cursor: col-resize;
    }

    .resize-handle:hover {
        background-color: rgba(59, 130, 246, 0.5);
    }

    /* Smooth transitions for tool panel */
    .tool-panel-transition {
        transition: width 0.2s ease-out;
    }
</style>