<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { auth } from '$lib/stores/auth';
    import { toastStore } from '$lib/stores/toast';
    import { t } from '$lib/i18n';
    import { goto } from '$app/navigation';

    export let showModal = false;

    const dispatch = createEventDispatcher();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    let activeTab: 'text' | 'pdf' = 'text';
    let textPrompt = '';
    let pdfFile: File | null = null;
    let numberOfQuestions = 5;
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    let questionType: 'mixed' | 'multiple_choice' | 'essay' = 'multiple_choice';
    let isGenerating = false;
    let estimatedTime = '2-3 minutes';

    // File input binding
    let fileInput: HTMLInputElement;

    function closeModal() {
        showModal = false;
        dispatch('close');
        resetForm();
    }

    function resetForm() {
        textPrompt = '';
        pdfFile = null;
        numberOfQuestions = 5;
        difficulty = 'medium';
        questionType = 'mixed';
        activeTab = 'text';
        isGenerating = false;
        estimatedTime = '2-3 minutes';
    }

    async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
        const token = $auth.token;
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Request failed' })) as any;
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async function generateExamFromText() {
        if (!textPrompt.trim()) {
            toastStore.error('Please enter a topic or text prompt');
            return;
        }

        isGenerating = true;
        
        try {
            const params = new URLSearchParams({
                amount: numberOfQuestions.toString(),
                prompt: textPrompt.trim(),
                difficulty: difficulty,
                question_type: questionType
            });
            
            const questions = await makeAuthenticatedRequest(
                `${API_BASE_URL}/ai/api/v1/exam/generate-text?${params}`,
                { method: 'POST' }
            );

            toastStore.success($t('examGeneratedSuccessfully'));
            
            // Store questions in localStorage temporarily and navigate to quiz
            const examData = {
                id: `ai-${Date.now()}`,
                title: `AI Generated Exam: ${textPrompt.slice(0, 50)}${textPrompt.length > 50 ? '...' : ''}`,
                questions: questions,
                isAiGenerated: true,
                examId: questions.generation_id,
                generatedAt: new Date().toISOString()
            };
            
            localStorage.setItem('tempAiExam', JSON.stringify(examData));
            closeModal();
            goto(`/quiz/ai-${examData.examId}`);
            
        } catch (error: any) {
            console.error('Error generating exam from text:', error);
            toastStore.error($t('examGenerationFailed') + ': ' + error.message);
        } finally {
            isGenerating = false;
        }
    }

    async function generateExamFromPdf() {
        if (!pdfFile) {
            toastStore.error('Please select a PDF file');
            return;
        }

        isGenerating = true;
        
        try {
            const formData = new FormData();
            formData.append('file', pdfFile);
            
            const params = new URLSearchParams({
                amount: numberOfQuestions.toString(),
                difficulty: difficulty,
                question_type: questionType
            });
            
            const questions = await makeAuthenticatedRequest(
                `${API_BASE_URL}/ai/api/v1/exam/generate-pdf?${params}`,
                {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${$auth.token}`,
                        // Don't set Content-Type, let browser set it with boundary for FormData
                    },
                }
            );

            toastStore.success($t('examGeneratedSuccessfully'));
            
            // Store questions in localStorage temporarily and navigate to quiz
            const examData = {
                id: `ai-pdf-${Date.now()}`,
                title: `AI Generated Exam: ${pdfFile.name}`,
                questions: questions,
                isAiGenerated: true,
                generatedAt: new Date().toISOString()
            };
            
            localStorage.setItem('tempAiExam', JSON.stringify(examData));
            closeModal();
            goto(`/quiz/ai-${examData.id}`);
            
        } catch (error: any) {
            console.error('Error generating exam from PDF:', error);
            toastStore.error($t('examGenerationFailed') + ': ' + error.message);
        } finally {
            isGenerating = false;
        }
    }

    function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
            if (file.type !== 'application/pdf') {
                toastStore.error('Please select a PDF file');
                target.value = '';
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toastStore.error('File size must be less than 10MB');
                target.value = '';
                return;
            }
            
            pdfFile = file;
        }
    }

    function handleGenerate() {
        if (activeTab === 'text') {
            generateExamFromText();
        } else {
            generateExamFromPdf();
        }
    }

    // Calculate estimated time based on settings
    function calculateEstimatedTime() {
        let baseTime = numberOfQuestions * 1.5; // 1.5 minutes per question base
        
        // Adjust for difficulty
        switch (difficulty) {
            case 'easy':
                baseTime *= 0.8;
                break;
            case 'hard':
                baseTime *= 1.3;
                break;
        }
        
        // Adjust for question type
        switch (questionType) {
            case 'multiple_choice':
                baseTime *= 0.7;
                break;
            case 'essay':
                baseTime *= 1.5;
                break;
        }
        
        const minutes = Math.round(baseTime);
        estimatedTime = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h ${minutes%60}m`;
    }

    // Reactive statement to update estimated time
    $: {
        calculateEstimatedTime();
    }

    // Handle click outside modal
    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    }

    // Handle escape key
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
    <div 
        class="fixed inset-0 z-50 overflow-y-auto"
        on:click={handleBackdropClick}
        on:keydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
    >
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"></div>

            <!-- Modal panel -->
            <div class="relative inline-block align-bottom bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-indigo-600/20 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 id="modal-title" class="text-xl font-bold text-white">
                                    AI Exam Generator
                                </h3>
                                <p class="text-sm text-gray-400 mt-1">Create personalized exam questions instantly</p>
                            </div>
                        </div>
                        <button
                            on:click={closeModal}
                            class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                            aria-label="Close modal"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="px-6 py-6">
                    <!-- Stats Bar -->
                    <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-purple-400">{numberOfQuestions}</div>
                            <div class="text-xs text-gray-400 uppercase tracking-wide">Questions</div>
                        </div>
                        <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-blue-400 capitalize">{difficulty}</div>
                            <div class="text-xs text-gray-400 uppercase tracking-wide">Difficulty</div>
                        </div>
                        <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-indigo-400">{estimatedTime}</div>
                            <div class="text-xs text-gray-400 uppercase tracking-wide">Est. Time</div>
                        </div>
                    </div>

                    <!-- Tab Navigation -->
                    <div class="flex space-x-1 bg-slate-800/50 border border-slate-700/50 p-1 rounded-xl mb-6">
                        <button
                            class="flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 {activeTab === 'text' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-slate-700/50'}"
                            on:click={() => activeTab = 'text'}
                        >
                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                            Text Prompt
                        </button>
                        <button
                            class="flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 {activeTab === 'pdf' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-slate-700/50'}"
                            on:click={() => activeTab = 'pdf'}
                        >
                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Upload PDF
                        </button>
                    </div>

                    <!-- Tab Content -->
                    <div class="space-y-6">
                        {#if activeTab === 'text'}
                            <!-- Text Input Tab -->
                            <div>
                                <label for="textPrompt" class="block text-sm font-medium text-gray-300 mb-2">
                                    Enter Topic or Subject
                                </label>
                                <textarea
                                    id="textPrompt"
                                    bind:value={textPrompt}
                                    placeholder="e.g., Biology basics, World War 2, JavaScript fundamentals..."
                                    rows="4"
                                    class="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                                ></textarea>
                            </div>
                        {:else}
                            <!-- PDF Upload Tab -->
                            <div>
                                <label for="pdfFile" class="block text-sm font-medium text-gray-300 mb-2">
                                    Upload PDF Document
                                </label>
                                <div class="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-slate-700/50 border-dashed rounded-xl hover:border-purple-500/50 transition-colors bg-slate-800/20">
                                    <div class="space-y-2 text-center">
                                        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                        <div class="flex text-sm text-gray-400">
                                            <label for="file-upload" class="relative cursor-pointer rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500 transition-colors">
                                                <span>Upload a file</span>
                                                <input 
                                                    id="file-upload" 
                                                    name="file-upload" 
                                                    type="file" 
                                                    class="sr-only"
                                                    accept=".pdf"
                                                    bind:this={fileInput}
                                                    on:change={handleFileSelect}
                                                >
                                            </label>
                                            <p class="pl-1">or drag and drop</p>
                                        </div>
                                        <p class="text-xs text-gray-500">PDF up to 10MB</p>
                                        {#if pdfFile}
                                            <div class="mt-3 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                                                <p class="text-sm text-green-400 font-medium flex items-center gap-2">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                    {pdfFile.name}
                                                </p>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/if}

                        <!-- Settings Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <!-- Number of Questions -->
                            <div>
                                <label for="numberOfQuestions" class="block text-sm font-medium text-gray-300 mb-2">
                                    Questions
                                </label>
                                <select
                                    id="numberOfQuestions"
                                    bind:value={numberOfQuestions}
                                    class="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                >
                                    <option value={3}>3 questions</option>
                                    <option value={5}>5 questions</option>
                                    <option value={10}>10 questions</option>
                                    <option value={15}>15 questions</option>
                                    <option value={20}>20 questions</option>
                                </select>
                            </div>

                            <!-- Difficulty -->
                            <div>
                                <label for="difficulty" class="block text-sm font-medium text-gray-300 mb-2">
                                    Difficulty
                                </label>
                                <select
                                    id="difficulty"
                                    bind:value={difficulty}
                                    class="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            <!-- Question Type -->
                            <div>
                                <label for="questionType" class="block text-sm font-medium text-gray-300 mb-2">
                                    Type
                                </label>
                                <select
                                    id="questionType"
                                    bind:value={questionType}
                                    class="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                >
                                    <option value="mixed">Mixed</option>
                                    <option value="multiple_choice">Multiple Choice</option>
                                    <option value="essay">Essay Only</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="bg-slate-800/30 border-t border-slate-700/50 px-6 py-4 flex justify-between items-center">
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Estimated completion: {estimatedTime}
                    </div>
                    <div class="flex gap-3">
                        <button
                            type="button"
                            on:click={closeModal}
                            disabled={isGenerating}
                            class="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            on:click={handleGenerate}
                            disabled={isGenerating || (activeTab === 'text' && !textPrompt.trim()) || (activeTab === 'pdf' && !pdfFile)}
                            class="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 border border-transparent rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                        >
                            {#if isGenerating}
                                <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                                Generating...
                            {:else}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                                Generate & Start Exam
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
