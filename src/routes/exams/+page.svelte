<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { bookmarkStore } from '$lib/stores/bookmarks';
    import { toastStore } from '$lib/stores/toast';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';
    import Header from '../components/Header.svelte';
    import ToastContainer from '../components/ToastContainer.svelte';

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

    type ExamCategory = {
        id: string;
        name: string;
        description: string | null;
        english_name?: string | null;
    };

    type ExamProgress = {
        exam_id: string;
        progress_percentage: number;
        answered_count: number;
        total_questions: number;
        last_attempted: string;
        is_completed: boolean;
        time_spent: number; // in seconds
    };

    type InProgressExam = {
        exam_id: string;
        title: string;
        description: string;
        tags: string[];
        url: string;
        essay_count: number;
        choice_count: number;
        progress_percentage: number;
        answered_count: number;
        total_questions: number;
        last_saved: string;
        time_spent: number;
        submission_id: string;
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    let exams: ExamFile[] = [];
    let categories: ExamCategory[] = [];
    let examProgress: Map<string, ExamProgress> = new Map();
    let inProgressExams: InProgressExam[] = [];
    let loading = false;
    let skeletonLoading = true;
    let error = '';

    // Pagination and filters
    let page = 1;
    let limit = 12;
    let selectedCategory = '';
    let searchQuery = '';
    let totalExams = 0;
    let totalPages = 0;
    let showInProgressOnly = false;

    // UI state
    let viewMode: 'grid' | 'list' = 'grid';
    let sortBy: 'title' | 'created_at' | 'popularity' = 'title';
    let sortOrder: 'asc' | 'desc' = 'asc';
    let bookmarkingExams: Set<string> = new Set(); // Track which exams are being bookmarked

    onMount(() => {
        // Wait for auth to initialize before checking authentication
        if (!$auth.isInitialized) {
            // Wait for auth initialization to complete
            const unsubscribe = auth.subscribe((authState) => {
                if (authState.isInitialized) {
                    unsubscribe();
                    // Now check authentication after initialization
                    if (!authState.isAuthenticated) {
                        goto('/login');
                        return;
                    }
                    // Auth is valid, load data
                    loadData();
                }
            });
        } else {
            // Auth already initialized, check immediately
            if (!$auth.isAuthenticated) {
                goto('/login');
                return;
            }
            loadData();
        }

        // Set up bookmark refresh on window focus (when user comes back to tab)
        const handleFocus = () => {
            if ($auth.isAuthenticated) {
                bookmarkStore.refresh();
            }
        };

        // Refresh when coming back online
        const handleOnline = () => {
            if ($auth.isAuthenticated) {
                loadData();
                bookmarkStore.refresh();
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleOnline);
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

    async function loadData() {
        loading = true;
        if (exams.length === 0) {
            skeletonLoading = true;
        }
        error = '';
        
        try {
            await Promise.all([
                loadExams(),
                loadCategories(),
                loadExamProgress(),
                loadInProgressExams()
            ]);
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
            skeletonLoading = false;
        }
    }

    async function loadCategories() {
        try {
            categories = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exam-categories`);
        } catch (err: any) {
            console.warn('Failed to load categories:', err.message);
            categories = [];
        }
    }

    async function loadExams() {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        let endpoint = `${API_BASE_URL}/user/api/v1/exams`;
        if (selectedCategory) {
            endpoint = `${API_BASE_URL}/user/api/v1/exams/by-category/${selectedCategory}`;
        }

        const response = await makeAuthenticatedRequest(`${endpoint}?${params}`);
        exams = Array.isArray(response) ? response : response.exams || [];
        totalExams = response.total || exams.length;
        totalPages = Math.ceil(totalExams / limit);
    }

    async function loadExamProgress() {
        try {
            const progressData = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exam-progress`);
            examProgress = new Map();
            if (Array.isArray(progressData)) {
                progressData.forEach((progress: ExamProgress) => {
                    examProgress.set(progress.exam_id, progress);
                });
            }
        } catch (err: any) {
            console.warn('Failed to load exam progress:', err.message);
            examProgress = new Map();
        }
    }

    async function loadInProgressExams() {
        try {
            inProgressExams = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/in-progress`);
        } catch (err: any) {
            console.warn('Failed to load in-progress exams:', err.message);
            inProgressExams = [];
        }
    }

    async function clearExamProgress(examId: string) {
        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exams/${examId}/progress`, {
                method: 'DELETE'
            });
            
            // Refresh the in-progress exams list
            await loadInProgressExams();
            toastStore.success('Progress cleared successfully');
        } catch (err: any) {
            toastStore.error(`Failed to clear progress: ${err.message}`);
        }
    }

    async function toggleBookmark(examId: string) {
        if (bookmarkingExams.has(examId)) return; // Prevent double-clicking
        
        bookmarkingExams.add(examId);
        bookmarkingExams = bookmarkingExams; // Trigger reactivity
        
        try {
            const result = await bookmarkStore.toggleBookmark(examId);
            if (result.action === 'added') {
                toastStore.success('Bookmark added! ⭐');
            } else {
                toastStore.info('Bookmark removed 📝');
            }
        } catch (err: any) {
            toastStore.error(`Failed to ${bookmarkStore.isBookmarked(examId) ? 'remove' : 'add'} bookmark: ${err.message}`);
        } finally {
            bookmarkingExams.delete(examId);
            bookmarkingExams = bookmarkingExams; // Trigger reactivity
        }
    }

    async function handleCategoryFilter() {
        page = 1;
        await loadExams();
    }

    async function handleSearch() {
        page = 1;
        // Clear previous timeout
        clearTimeout(searchTimeout);
        // Debounce search
        searchTimeout = setTimeout(async () => {
            await loadExams();
        }, 300);
    }

    // Search timeout for debouncing
    let searchTimeout: ReturnType<typeof setTimeout>;

    function goToPage(newPage: number) {
        page = newPage;
        loadExams();
    }

    function handleExamClick(exam: ExamFile) {
        // Navigate to exam detail/quiz page
        goto(`/quiz/${exam.id}`);
    }

    function getTagColor(index: number): string {
        const colors = [
            'bg-blue-500/20 text-blue-300 border-blue-500/30',
            'bg-green-500/20 text-green-300 border-green-500/30',
            'bg-purple-500/20 text-purple-300 border-purple-500/30',
            'bg-pink-500/20 text-pink-300 border-pink-500/30',
            'bg-orange-500/20 text-orange-300 border-orange-500/30'
        ];
        return colors[index % colors.length];
    }

    // Filter exams based on search query and in-progress filter
    $: filteredExams = (() => {
        let filtered = exams;
        
        // Apply in-progress filter
        if (showInProgressOnly) {
            const inProgressIds = new Set(inProgressExams.map(exam => exam.exam_id));
            filtered = filtered.filter(exam => inProgressIds.has(exam.id));
        }
        
        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(exam => 
                exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exam.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exam.tags.some(tag => {
                    const category = getCategoryById(tag);
                    return category && (
                        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (category.english_name && category.english_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    );
                })
            );
        }
        
        return filtered;
    })();

    // Helper function to get category by ID
    function getCategoryById(categoryId: string): ExamCategory | null {
        return categories.find(cat => cat.id === categoryId) || null;
    }

    // Helper function to get category display name
    function getCategoryDisplayName(categoryId: string): string {
        const category = getCategoryById(categoryId);
        if (!category) return categoryId; // Fallback to ID if category not found
        return category.english_name || category.name;
    }

    // Helper function to get category hover text
    function getCategoryHoverText(categoryId: string): string {
        const category = getCategoryById(categoryId);
        if (!category) return '';
        
        let hoverText = category.name;
        if (category.english_name && category.english_name !== category.name) {
            hoverText = `${category.english_name} (${category.name})`;
        }
        if (category.description) {
            hoverText += ` - ${category.description}`;
        }
        return hoverText;
    }

    // Helper functions for exam progress
    function getExamProgress(examId: string): ExamProgress | null {
        return examProgress.get(examId) || null;
    }

    function hasStartedExam(examId: string): boolean {
        const progress = getExamProgress(examId);
        return progress !== null && progress.answered_count > 0;
    }

    function formatTimeSpent(seconds: number): string {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }

    // Reactive bookmark count for stats
    $: bookmarks = $bookmarkStore.bookmarks;
    $: bookmarkCount = bookmarks.length;
</script>

<svelte:head>
    <title>Exams - ExamTie</title>
    <meta name="description" content="Browse and practice with our extensive collection of exam papers" />
</svelte:head>

<Header />

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
        <!-- Floating particles -->
        {#each Array.from({length: 30}) as _, i}
            <div 
                class="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-float-gentle"
                style="left: {Math.random() * 100}%; top: {Math.random() * 100}%; animation-delay: {Math.random() * 4}s;"
            ></div>
        {/each}
    </div>

    <div class="relative z-10 pt-8 pb-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <!-- Header Section -->
            <div class="text-center mb-12">
                <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
                    {$t('exams')} Collection
                </h1>
                <p class="text-xl text-gray-300 max-w-3xl mx-auto">
                    Browse our extensive collection of exam papers and practice questions
                </p>
            </div>

            <!-- Error Messages Only -->
            {#if error}
                <div class="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-center">
                    {error}
                </div>
            {/if}

            <!-- Filters and Search -->
            <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
                <div class="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <!-- Search -->
                    <div class="relative flex-1 max-w-md">
                        <input
                            type="text"
                            bind:value={searchQuery}
                            on:input={handleSearch}
                            placeholder="Search exams..."
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg class="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>

                    <!-- Category Filter -->
                    <div class="relative">
                        <select
                            bind:value={selectedCategory}
                            on:change={handleCategoryFilter}
                            class="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                        >
                            <option value="">All Categories</option>
                            {#each categories as category}
                                <option 
                                    value={category.id} 
                                    class="bg-slate-800 text-white"
                                    title={category.description || category.name}
                                >
                                    {category.english_name || category.name}
                                    {#if category.english_name && category.name !== category.english_name}
                                        ({category.name})
                                    {/if}
                                </option>
                            {/each}
                        </select>
                        <svg class="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>

                    <!-- View Mode Toggle -->
                    <div class="flex bg-white/10 rounded-lg p-1">
                        <button
                            class="px-3 py-1 rounded {viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-300'}"
                            on:click={() => viewMode = 'grid'}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                            </svg>
                        </button>
                        <button
                            class="px-3 py-1 rounded {viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-300'}"
                            on:click={() => viewMode = 'list'}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- In Progress Toggle -->
                    <div class="flex items-center gap-2">
                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={showInProgressOnly}
                                class="sr-only"
                            />
                            <div class="relative">
                                <div class="w-10 h-6 bg-white/20 rounded-full shadow-inner"></div>
                                <div class="absolute w-4 h-4 bg-white rounded-full shadow inset-y-1 left-1 transition-transform duration-200 {showInProgressOnly ? 'transform translate-x-4 bg-blue-500' : ''}"></div>
                            </div>
                            <span class="ml-2 text-sm text-gray-300">In Progress Only</span>
                        </label>
                    </div>
                </div>

                <!-- Stats Row -->
                {#if !loading && exams.length > 0}
                    <div class="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        <div class="text-sm text-gray-300">
                            Showing {filteredExams.length} of {totalExams} exams
                            {#if selectedCategory}
                                {#each categories as category}
                                    {#if category.id === selectedCategory}
                                        in <span class="font-medium" title={category.description || category.name}>
                                            {category.english_name || category.name}
                                        </span>
                                    {/if}
                                {/each}
                            {/if}
                        </div>
                        <div class="flex items-center gap-4 text-sm text-gray-400">
                            <span>🔖 {bookmarkCount} bookmarked</span>
                            <span>📝 {inProgressExams.length} in progress</span>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- In Progress Exams Section -->
            {#if !loading && inProgressExams.length > 0 && !showInProgressOnly}
                <div class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Continue Where You Left Off
                        </h2>
                        <button
                            on:click={() => showInProgressOnly = true}
                            class="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                            View All In Progress →
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each inProgressExams.slice(0, 3) as inProgressExam}
                            <div class="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-xl p-4 hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300">
                                <div class="flex items-start justify-between mb-3">
                                    <h3 class="font-semibold text-white text-sm line-clamp-2">
                                        {inProgressExam.title}
                                    </h3>
                                    <button
                                        on:click={() => clearExamProgress(inProgressExam.exam_id)}
                                        class="text-gray-400 hover:text-red-400 p-1 rounded"
                                        title="Clear progress"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </div>
                                
                                <div class="mb-3">
                                    <div class="flex items-center justify-between text-xs text-blue-300 mb-1">
                                        <span>Progress: {inProgressExam.progress_percentage.toFixed(0)}%</span>
                                        <span>{inProgressExam.answered_count}/{inProgressExam.total_questions} answered</span>
                                    </div>
                                    <div class="w-full bg-gray-700 rounded-full h-2">
                                        <div 
                                            class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                            style="width: {inProgressExam.progress_percentage}%"
                                        ></div>
                                    </div>
                                </div>
                                
                                <div class="flex items-center justify-between">
                                    <div class="text-xs text-gray-400">
                                        Last saved: {new Date(inProgressExam.last_saved).toLocaleDateString()}
                                        {#if inProgressExam.time_spent > 0}
                                            • {formatTimeSpent(inProgressExam.time_spent)}
                                        {/if}
                                    </div>
                                    <button
                                        on:click={() => goto(`/quiz/${inProgressExam.exam_id}`)}
                                        class="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                                    >
                                        Resume
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Loading Skeleton -->
            {#if skeletonLoading}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                    {#each Array(8) as _}
                        <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 animate-pulse">
                            <div class="h-4 bg-white/20 rounded mb-4"></div>
                            <div class="h-3 bg-white/10 rounded mb-2"></div>
                            <div class="h-3 bg-white/10 rounded mb-4 w-2/3"></div>
                            <div class="flex gap-2 mb-4">
                                <div class="h-6 bg-white/10 rounded-full w-16"></div>
                                <div class="h-6 bg-white/10 rounded-full w-20"></div>
                            </div>
                            <div class="h-10 bg-white/10 rounded"></div>
                        </div>
                    {/each}
                </div>
            {:else}
                <!-- Exams Display -->
                {#if viewMode === 'grid'}
                    <!-- Grid View -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                        {#each filteredExams as exam}
                            <div class="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
                                <div class="p-6">
                                    <!-- Exam Header -->
                                    <div class="flex items-start justify-between mb-4">
                                        <h3 class="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                                            {exam.title}
                                        </h3>
                                        <button
                                            on:click|stopPropagation={() => toggleBookmark(exam.id)}
                                            class="flex-shrink-0 ml-2 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 disabled:opacity-50 transform hover:scale-110 relative"
                                            title={$bookmarkStore.bookmarks.some(b => b.exam_id === exam.id) ? 'Remove bookmark' : 'Add bookmark'}
                                            disabled={bookmarkingExams.has(exam.id)}
                                        >
                                            {#if bookmarkingExams.has(exam.id)}
                                                <svg class="w-5 h-5 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                </svg>
                                            {:else}
                                                <svg class="w-5 h-5 transition-all duration-500 transform {$bookmarkStore.bookmarks.some(b => b.exam_id === exam.id) ? 'text-yellow-400 fill-current scale-110 rotate-12' : 'text-gray-400 hover:text-yellow-300 hover:scale-105'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                                                </svg>
                                            {/if}
                                        </button>
                                    </div>

                                    <!-- Description -->
                                    <p class="text-gray-300 text-sm mb-4 line-clamp-3">
                                        {exam.description}
                                    </p>

                                    <!-- Question Counts -->
                                    <div class="flex gap-4 mb-4 text-sm">
                                        <div class="flex items-center text-green-300">
                                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            {exam.choice_count} MC
                                        </div>
                                        <div class="flex items-center text-blue-300">
                                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                            </svg>
                                            {exam.essay_count} Essay
                                        </div>
                                    </div>

                                    <!-- Progress Bar (if exam has been started) -->
                                    {#if hasStartedExam(exam.id)}
                                        {@const progress = getExamProgress(exam.id)}
                                        <div class="mb-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                            <div class="flex items-center justify-between text-xs text-blue-300 mb-1">
                                                <span>Progress</span>
                                                <span>{progress?.progress_percentage.toFixed(0)}%</span>
                                            </div>
                                            <div class="w-full bg-gray-700 rounded-full h-2">
                                                <div 
                                                    class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                                    style="width: {progress?.progress_percentage || 0}%"
                                                ></div>
                                            </div>
                                            <div class="flex items-center justify-between text-xs text-gray-400 mt-1">
                                                <span>{progress?.answered_count}/{progress?.total_questions} answered</span>
                                                {#if progress && progress.time_spent > 0}
                                                    <span>{formatTimeSpent(progress.time_spent)}</span>
                                                {/if}
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- Tags -->
                                    {#if exam.tags.length > 0}
                                        <div class="flex flex-wrap gap-2 mb-4">
                                            {#each exam.tags.slice(0, 3) as tag, index}
                                                <span 
                                                    class="px-2 py-1 text-xs rounded-full border {getTagColor(index)}"
                                                    title={getCategoryHoverText(tag)}
                                                >
                                                    {getCategoryDisplayName(tag)}
                                                </span>
                                            {/each}
                                            {#if exam.tags.length > 3}
                                                <span 
                                                    class="px-2 py-1 text-xs rounded-full border bg-gray-500/20 text-gray-300 border-gray-500/30"
                                                    title={exam.tags.slice(3).map(tag => getCategoryHoverText(tag)).join(', ')}
                                                >
                                                    +{exam.tags.length - 3}
                                                </span>
                                            {/if}
                                        </div>
                                    {/if}

                                    <!-- Action Button -->
                                    <button
                                        on:click={() => handleExamClick(exam)}
                                        class="w-full bg-gradient-to-r {hasStartedExam(exam.id) ? 'from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600' : 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'} text-white py-2 px-4 rounded-lg transition-all duration-300 font-medium flex items-center justify-center gap-2"
                                    >
                                        {#if hasStartedExam(exam.id)}
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                            Continue Practice
                                        {:else}
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Start Practice
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <!-- List View -->
                    <div class="space-y-4 mb-8">
                        {#each filteredExams as exam}
                            <div class="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 p-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-start justify-between mb-2">
                                            <h3 class="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                                                {exam.title}
                                            </h3>
                                            <button
                                                on:click|stopPropagation={() => toggleBookmark(exam.id)}
                                                class="flex-shrink-0 ml-4 p-2 rounded-lg hover:bg-white/10 transition-all duration-300 disabled:opacity-50 transform hover:scale-110 relative"
                                                title={$bookmarkStore.bookmarks.some(b => b.exam_id === exam.id) ? 'Remove bookmark' : 'Add bookmark'}
                                                disabled={bookmarkingExams.has(exam.id)}
                                            >
                                                {#if bookmarkingExams.has(exam.id)}
                                                    <svg class="w-5 h-5 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                    </svg>
                                                {:else}
                                                    <svg class="w-5 h-5 transition-all duration-500 transform {$bookmarkStore.bookmarks.some(b => b.exam_id === exam.id) ? 'text-yellow-400 fill-current scale-110 rotate-12' : 'text-gray-400 hover:text-yellow-300 hover:scale-105'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                                                    </svg>
                                                {/if}
                                            </button>
                                        </div>
                                        
                                        <p class="text-gray-300 text-sm mb-3 line-clamp-2">
                                            {exam.description}
                                        </p>
                                        
                                        <div class="flex items-center gap-6 mb-3">
                                            <!-- Question Counts -->
                                            <div class="flex items-center text-green-300 text-sm">
                                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                {exam.choice_count} Multiple Choice
                                            </div>
                                            <div class="flex items-center text-blue-300 text-sm">
                                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                                </svg>
                                                {exam.essay_count} Essay
                                            </div>
                                        </div>
                                        
                                        <!-- Progress Bar (if exam has been started) -->
                                        {#if hasStartedExam(exam.id)}
                                            {@const progress = getExamProgress(exam.id)}
                                            <div class="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <div class="flex items-center justify-between text-sm text-blue-300 mb-2">
                                                    <span>Progress: {progress?.progress_percentage.toFixed(0)}%</span>
                                                    <span>{progress?.answered_count}/{progress?.total_questions} answered</span>
                                                </div>
                                                <div class="w-full bg-gray-700 rounded-full h-2">
                                                    <div 
                                                        class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                                        style="width: {progress?.progress_percentage || 0}%"
                                                    ></div>
                                                </div>
                                                {#if progress && progress.time_spent > 0}
                                                    <div class="text-xs text-gray-400 mt-1">
                                                        Time spent: {formatTimeSpent(progress.time_spent)}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}

                                        <!-- Tags -->
                                        {#if exam.tags.length > 0}
                                            <div class="flex flex-wrap gap-2 {hasStartedExam(exam.id) ? 'mt-3' : ''}">
                                                {#each exam.tags.slice(0, 5) as tag, index}
                                                    <span 
                                                        class="px-2 py-1 text-xs rounded-full border {getTagColor(index)}"
                                                        title={getCategoryHoverText(tag)}
                                                    >
                                                        {getCategoryDisplayName(tag)}
                                                    </span>
                                                {/each}
                                                {#if exam.tags.length > 5}
                                                    <span 
                                                        class="px-2 py-1 text-xs rounded-full border bg-gray-500/20 text-gray-300 border-gray-500/30"
                                                        title={exam.tags.slice(5).map(tag => getCategoryHoverText(tag)).join(', ')}
                                                    >
                                                        +{exam.tags.length - 5} more
                                                    </span>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                    
                                    <!-- Action Button -->
                                    <div class="ml-6 flex-shrink-0">
                                        <button
                                            on:click={() => handleExamClick(exam)}
                                            class="bg-gradient-to-r {hasStartedExam(exam.id) ? 'from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600' : 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'} text-white py-2 px-6 rounded-lg transition-all duration-300 font-medium flex items-center gap-2"
                                        >
                                            {#if hasStartedExam(exam.id)}
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                </svg>
                                                Continue
                                            {:else}
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                Start Practice
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- Empty State -->
                {#if filteredExams.length === 0 && !loading}
                    <div class="text-center py-16">
                        <div class="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-2">No exams found</h3>
                        <p class="text-gray-400 mb-6">
                            {searchQuery ? 'Try adjusting your search criteria' : 'No exams are available at the moment'}
                        </p>
                        {#if searchQuery}
                            <button
                                on:click={() => {searchQuery = ''; handleSearch();}}
                                class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                Clear Search
                            </button>
                        {/if}
                    </div>
                {/if}
            {/if}

            <!-- Pagination -->
            {#if totalPages > 1}
                <div class="flex justify-center items-center space-x-2">
                    <button
                        on:click={() => goToPage(page - 1)}
                        disabled={page === 1 || loading}
                        class="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Previous
                    </button>
                    
                    <div class="flex space-x-1">
                        {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => i + Math.max(1, page - 2)) as pageNum}
                            {#if pageNum <= totalPages}
                                <button
                                    on:click={() => goToPage(pageNum)}
                                    disabled={loading}
                                    class="px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors disabled:opacity-50 {page === pageNum ? 'bg-blue-500 border-blue-500' : ''}"
                                >
                                    {pageNum}
                                </button>
                            {/if}
                        {/each}
                    </div>
                    
                    <button
                        on:click={() => goToPage(page + 1)}
                        disabled={page === totalPages || loading}
                        class="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        Next
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <!-- Loading indicator for pagination -->
                {#if loading && !skeletonLoading}
                    <div class="flex justify-center mt-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<!-- Toast notifications -->
<ToastContainer />

<style>
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    @keyframes float-gentle {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-10px) rotate(1deg); }
        66% { transform: translateY(5px) rotate(-1deg); }
    }
    
    .animate-float-gentle {
        animation: float-gentle 6s ease-in-out infinite;
    }
</style>
