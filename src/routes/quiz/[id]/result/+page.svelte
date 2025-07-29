<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import Header from '../../../components/Header.svelte';
    import { t } from '$lib/i18n.js';

    // Read exam id from route params
    const examId = $page.params.id;

    type QuestionResult = {
        id: string;
        question: string;
        userAnswer: string | string[];
        correctAnswer: string | string[];
        isCorrect: boolean;
        recommendation: string;
        show?: boolean;
    };

    type ResultSummary = {
        examId: string;
        title: string;
        totalQuestions: number;
        correct: number;
        incorrect: number;
        timeSpentSeconds: number;
        questions: QuestionResult[];
        isAiExam?: boolean;
    };

    // Simple helper to format seconds -> HH:mm:ss
    function formatTime(seconds: number): string {
        const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    }

    let summary: ResultSummary = {
        examId,
        title: 'Loading...',
        totalQuestions: 0,
        correct: 0,
        incorrect: 0,
        timeSpentSeconds: 0,
        questions: [],
        isAiExam: false
    };

    onMount(() => {
        // Check if this is an AI exam result
        if (examId.startsWith('ai-')) {
            const aiResults = localStorage.getItem('aiExamResults');
            if (aiResults) {
                const results = JSON.parse(aiResults);
                summary = {
                    examId: results.examId,
                    title: results.title,
                    totalQuestions: results.totalQuestions,
                    correct: results.answers.length, // For AI exams, we'll show completion count
                    incorrect: results.totalQuestions - results.answers.length,
                    timeSpentSeconds: results.timeSpent,
                    questions: [], // AI exams don't have correct answers to compare
                    isAiExam: true
                };
                
                // Clean up localStorage
                localStorage.removeItem('aiExamResults');
            } else {
                // Fallback mock data for AI exams
                summary = {
                    examId,
                    title: 'AI Generated Exam',
                    totalQuestions: 5,
                    correct: 4,
                    incorrect: 1,
                    timeSpentSeconds: 300,
                    questions: [],
                    isAiExam: true
                };
            }
        } else {
            // Mock data for regular exams (replace with real API call)
            summary = {
                examId,
                title: 'แบบทดสอบเคมี – Mock',
                totalQuestions: 20,
                correct: 17,
                incorrect: 3,
                timeSpentSeconds: 1083,
                questions: [
                    {
                        id: 'q1',
                        question: 'สัญลักษณ์ธาตุของเหล็กคืออะไร',
                        userAnswer: 'Ir',
                        correctAnswer: 'Fe',
                        isCorrect: false,
                        recommendation: 'ทบทวนตารางธาตุหมู่ 8 (Transition Metals)'
                    },
                    {
                        id: 'q2',
                        question: 'สัญลักษณ์ธาตุของโซเดียมคืออะไร',
                        userAnswer: 'So',
                        correctAnswer: 'Na',
                        isCorrect: false,
                        recommendation: 'ทบทวนตารางธาตุหมู่โลหะอัลคาไล (Group 1)'
                    },
                    {
                        id: 'q3',
                        question: 'ปี พ.ศ. 2560 ตรงกับ ค.ศ. ใด',
                        userAnswer: '2018',
                        correctAnswer: '2017',
                        isCorrect: false,
                        recommendation: 'ทบทวนการแปลง พ.ศ. ↔ ค.ศ. (ลบ 543)'
                    }
                ],
                isAiExam: false
            };
        }
    });

    // Derived values
    $: accuracy = summary.totalQuestions > 0 ? ((summary.correct / summary.totalQuestions) * 100).toFixed(1) : '0.0';

    function retakeExam() {
        if (summary.isAiExam) {
            // For AI exams, go back to exams page to generate a new one
            goto('/exams');
        } else {
            goto(`/quiz/${examId}`);
        }
    }
</script>

<svelte:head>
    <title>สรุปผลข้อสอบ - Examtie</title>
    <meta name="description" content="ผลการทำข้อสอบและคำแนะนำสำหรับการทบทวน" />
</svelte:head>

<Header />
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
        <!-- Floating particles -->
        <div class="absolute inset-0 opacity-30">
            <div class="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div class="absolute top-3/4 right-1/4 w-1 h-1 bg-indigo-400 rounded-full animate-pulse delay-1000"></div>
            <div class="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-500"></div>
        </div>
    </div>
    
    <div class="relative z-10 flex items-center justify-center min-h-screen py-8 px-4">
        <div class="max-w-4xl w-full bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <!-- Header Section -->
            <div class="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm px-8 py-6 border-b border-white/10">
                <div class="flex items-center justify-center gap-3 mb-2">
                    {#if summary.isAiExam}
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <div class="px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold rounded-full">
                                AI
                            </div>
                        </div>
                    {/if}
                </div>
                <h1 class="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
                    {summary.isAiExam ? $t('aiExamResults') : 'สรุปผลการทำข้อสอบ'}
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
                                {summary.isAiExam ? $t('answered') : 'ข้อถูก'}
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
                                {summary.isAiExam ? $t('unanswered') : 'ข้อผิด'}
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
                        {summary.isAiExam ? $t('completionRate') : 'ความแม่นยำ'}: 
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

                <!-- Questions Details Section -->
                {#if summary.isAiExam}
                    <!-- AI Exam Completion Message -->
                    <div class="space-y-4 mb-8">
                        <div class="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-semibold text-white">AI Exam Completed!</h3>
                            </div>
                            <p class="text-gray-300 mb-4">
                                You've successfully completed this AI-generated exam. Your responses have been recorded and you can review your performance above.
                            </p>
                            <div class="bg-white/10 rounded-xl p-4">
                                <p class="text-sm text-white/80 mb-2">💡 <strong>{$t('nextSteps')}</strong></p>
                                <ul class="text-sm text-gray-300 space-y-1">
                                    <li>• Generate a new AI exam on a different topic</li>
                                    <li>• Try increasing the difficulty level</li>
                                    <li>• Practice with more questions to improve your knowledge</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- Regular Exam Question Details -->
                    <div class="space-y-4 mb-8">
                        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            รายละเอียดข้อสอบ
                        </h3>
                        {#each summary.questions as q (q.id)}
                            <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
                                <button class="w-full text-left p-6 flex items-center justify-between hover:bg-white/5 transition-colors duration-200" on:click={() => q.show = !q.show}>
                                    <div class="flex items-center gap-3 flex-1 min-w-0">
                                        <div class="w-8 h-8 bg-gradient-to-br {q.isCorrect ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'} rounded-full flex items-center justify-center flex-shrink-0">
                                            {#if q.isCorrect}
                                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            {:else}
                                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            {/if}
                                        </div>
                                        <span class="font-medium text-white truncate">{q.question}</span>
                                    </div>
                                    <svg class="w-5 h-5 text-white/60 transform transition-transform duration-200 flex-shrink-0 ml-2 {q.show ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {#if q.show}
                                    <div class="border-t border-white/10 px-6 pb-6 space-y-4 bg-white/5">
                                        <div class="space-y-3">
                                            <div class="bg-white/10 rounded-xl p-4 border border-white/10">
                                                <p class="text-sm text-white/80 mb-1 font-medium">คำตอบของคุณ:</p>
                                                <p class="text-white font-medium">{q.userAnswer}</p>
                                            </div>
                                            <div class="bg-white/10 rounded-xl p-4 border border-white/10">
                                                <p class="text-sm text-white/80 mb-1 font-medium">คำตอบที่ถูกต้อง:</p>
                                                <p class="text-green-400 font-medium">{q.correctAnswer}</p>
                                            </div>
                                        </div>
                                        <div class="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/30 p-4 rounded-xl backdrop-blur-sm">
                                            <div class="flex items-start gap-3">
                                                <div class="w-6 h-6 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p class="text-sm font-medium text-orange-200 mb-1">คำแนะนำ</p>
                                                    <p class="text-sm text-orange-100">{q.recommendation}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/each}
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
                            {$t('generateNewAiExam')}
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
                        {summary.isAiExam ? $t('backToExams') : 'กลับไปหน้ารายการข้อสอบ'}
                    </button>
                </div>
            </div>
        </div>
    </div>

<style>
    /* Simple fade-in animation */
    div :global(.fade-in) {
        animation: fade 0.4s ease-in-out;
    }

    @keyframes fade {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
