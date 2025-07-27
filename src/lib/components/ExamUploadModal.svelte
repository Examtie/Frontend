<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { toastStore } from '$lib/stores/toast';
    import { t } from '$lib/i18n';

    export let showModal = false;
    export let categories: any[] = [];
    export let onClose: () => void;
    export let onSuccess: (exam: any) => void;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    // Upload modal state
    let uploadForm = {
        title: '',
        description: '',
        tags: '',
        essay_count: 0,
        choice_count: 0,
        category_ids: [] as string[],
        answer_key: '',
        file: null as File | null
    };
    let uploadLoading = false;
    let newCategoryForm = {
        name: '',
        description: '',
        english_name: ''
    };
    let showNewCategoryForm = false;
    let creatingCategory = false;
    
    // Answer key helper state
    let answerKeyFormat = 'detailed'; // Default to helper mode
    let mcAnswers: string[] = [];
    let essayAnswers: string[] = [];
    let answerKeyValid = false;

    // Reactive validation for answer key
    $: {
        try {
            if (uploadForm.answer_key.trim()) {
                JSON.parse(uploadForm.answer_key.trim());
                answerKeyValid = true;
            } else {
                answerKeyValid = false;
            }
        } catch {
            answerKeyValid = false;
        }
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

    function resetUploadForm() {
        uploadForm = {
            title: '',
            description: '',
            tags: '',
            essay_count: 0,
            choice_count: 0,
            category_ids: [],
            answer_key: '',
            file: null
        };
        newCategoryForm = {
            name: '',
            description: '',
            english_name: ''
        };
        showNewCategoryForm = false;
        answerKeyFormat = 'detailed'; // Default to helper mode
        mcAnswers = [];
        essayAnswers = [];
    }

    function closeModal() {
        resetUploadForm();
        onClose();
    }

    // Answer key helper functions
    function generateAnswerKey() {
        if (answerKeyFormat === 'detailed') {
            // Create structured JSON answer key
            const answerKeyObj: Record<string, any> = {};
            
            // Add multiple choice answers
            mcAnswers.forEach((answer, index) => {
                if (answer.trim()) {
                    answerKeyObj[`${index + 1}`] = answer.trim();
                }
            });
            
            // Add essay answers (continuing from MC questions)
            const mcCount = mcAnswers.length;
            essayAnswers.forEach((answer, index) => {
                if (answer.trim()) {
                    answerKeyObj[`${mcCount + index + 1}`] = answer.trim();
                }
            });
            
            // Only update if we have answers
            if (Object.keys(answerKeyObj).length > 0) {
                uploadForm.answer_key = JSON.stringify(answerKeyObj, null, 2);
            } else {
                uploadForm.answer_key = '{}';
            }
        }
        // For simple format, keep the text-based format
    }

    function updateAnswerCounts() {
        const mcCount = Number(uploadForm.choice_count) || 0;
        const essayCount = Number(uploadForm.essay_count) || 0;
        
        // Adjust MC answers array
        if (mcAnswers.length < mcCount) {
            mcAnswers = [...mcAnswers, ...Array(mcCount - mcAnswers.length).fill('')];
        } else if (mcAnswers.length > mcCount) {
            mcAnswers = mcAnswers.slice(0, mcCount);
        }
        
        // Adjust essay answers array
        if (essayAnswers.length < essayCount) {
            essayAnswers = [...essayAnswers, ...Array(essayCount - essayAnswers.length).fill('')];
        } else if (essayAnswers.length > essayCount) {
            essayAnswers = essayAnswers.slice(0, essayCount);
        }

        // Auto-generate answer key if in detailed mode
        if (answerKeyFormat === 'detailed') {
            generateAnswerKey();
        }
    }

    // Toggle category selection
    function toggleCategory(categoryId: string) {
        if (uploadForm.category_ids.includes(categoryId)) {
            uploadForm.category_ids = uploadForm.category_ids.filter(id => id !== categoryId);
        } else {
            uploadForm.category_ids = [...uploadForm.category_ids, categoryId];
        }
    }

    async function createNewCategory() {
        if (!newCategoryForm.name.trim()) {
            toastStore.error('Category name is required.');
            return;
        }

        creatingCategory = true;
        try {
            const newCategory = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/exam-categories`, {
                method: 'POST',
                body: JSON.stringify({
                    name: newCategoryForm.name.trim(),
                    description: newCategoryForm.description.trim() || null,
                    english_name: newCategoryForm.english_name.trim() || null
                })
            });

            // Add to categories list and select it
            categories = [...categories, newCategory];
            uploadForm.category_ids = [...uploadForm.category_ids, newCategory.id];
            
            // Reset new category form
            newCategoryForm = {
                name: '',
                description: '',
                english_name: ''
            };
            showNewCategoryForm = false;
            
            toastStore.success('Category created successfully!');
        } catch (err: any) {
            toastStore.error(`Failed to create category: ${err.message}`);
        } finally {
            creatingCategory = false;
        }
    }

    async function uploadExam() {
        if (!uploadForm.file) {
            toastStore.error('Please select a file to upload.');
            return;
        }

        if (!uploadForm.title.trim()) {
            toastStore.error('Exam title is required.');
            return;
        }

        if (!uploadForm.description.trim()) {
            toastStore.error('Exam description is required.');
            return;
        }

        if (!uploadForm.answer_key.trim()) {
            toastStore.error('Answer key is required.');
            return;
        }

        if (!answerKeyValid) {
            toastStore.error('Answer key must be valid JSON format. Use the Helper or check your JSON syntax.');
            return;
        }

        uploadLoading = true;
        try {
            const formData = new FormData();
            formData.append('file', uploadForm.file);
            formData.append('title', uploadForm.title.trim());
            formData.append('description', uploadForm.description.trim());
            formData.append('tags', JSON.stringify(uploadForm.category_ids));
            formData.append('essay_count', uploadForm.essay_count.toString());
            formData.append('choice_count', uploadForm.choice_count.toString());
            formData.append('answer_key', uploadForm.answer_key.trim());

            const token = $auth.token;
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await fetch(`${API_BASE_URL}/admin/api/v1/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Upload failed' })) as any;
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }

            const newExam = await response.json();
            
            closeModal();
            toastStore.success('Exam uploaded successfully!');
            onSuccess(newExam);
            
        } catch (err: any) {
            toastStore.error(`Failed to upload exam: ${err.message}`);
        } finally {
            uploadLoading = false;
        }
    }

    function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            // Validate file type (optional)
            if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
                toastStore.error('Please select a PDF file.');
                return;
            }
            uploadForm.file = file;
        }
    }
</script>

<!-- Upload Exam Modal -->
{#if showModal}
    <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div 
                class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" 
                on:click={closeModal}
                on:keydown={(e) => e.key === 'Escape' && closeModal()}
                role="button"
                tabindex="0"
                aria-label="Close modal"
            ></div>
            
            <!-- Modal panel -->
            <div class="relative inline-block align-bottom bg-slate-800 rounded-2xl border border-slate-700 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div class="bg-slate-800 px-6 pt-6 pb-4">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-2xl font-bold text-white flex items-center gap-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                </svg>
                            </div>
                            Upload New Exam
                        </h3>
                        <button
                            on:click={closeModal}
                            class="text-gray-400 hover:text-white transition-colors"
                            aria-label="Close modal"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <form on:submit|preventDefault={uploadExam} class="space-y-6">
                        <!-- File Upload -->
                        <div>
                            <label for="exam-file" class="block text-sm font-medium text-gray-300 mb-2">
                                Exam File *
                            </label>
                            <div class="relative">
                                <input
                                    id="exam-file"
                                    type="file"
                                    accept=".pdf"
                                    on:change={handleFileSelect}
                                    class="hidden"
                                />
                                <label
                                    for="exam-file"
                                    class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700 transition-colors"
                                >
                                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg class="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                        <p class="mb-2 text-sm text-gray-400">
                                            <span class="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p class="text-xs text-gray-500">PDF files only</p>
                                    </div>
                                </label>
                                {#if uploadForm.file}
                                    <div class="mt-2 text-sm text-green-400 flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        {uploadForm.file.name}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Exam Details -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Title -->
                            <div class="md:col-span-2">
                                <label for="exam-title" class="block text-sm font-medium text-gray-300 mb-2">
                                    Exam Title *
                                </label>
                                <input
                                    id="exam-title"
                                    type="text"
                                    bind:value={uploadForm.title}
                                    placeholder="Enter exam title"
                                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <!-- Description -->
                            <div class="md:col-span-2">
                                <label for="exam-description" class="block text-sm font-medium text-gray-300 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    id="exam-description"
                                    bind:value={uploadForm.description}
                                    placeholder="Enter exam description"
                                    rows="3"
                                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    required
                                ></textarea>
                            </div>

                            <!-- Question Counts -->
                            <div>
                                <label for="essay-count" class="block text-sm font-medium text-gray-300 mb-2">
                                    Essay Questions
                                </label>
                                <input
                                    id="essay-count"
                                    type="number"
                                    bind:value={uploadForm.essay_count}
                                    on:input={updateAnswerCounts}
                                    min="0"
                                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label for="choice-count" class="block text-sm font-medium text-gray-300 mb-2">
                                    Multiple Choice Questions
                                </label>
                                <input
                                    id="choice-count"
                                    type="number"
                                    bind:value={uploadForm.choice_count}
                                    on:input={updateAnswerCounts}
                                    min="0"
                                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <!-- Category Selection (Multiple) -->
                            <div class="md:col-span-2">
                                <div class="block text-sm font-medium text-gray-300 mb-2">
                                    Select Categories (Multiple selection allowed)
                                </div>
                                <div class="space-y-2 max-h-32 overflow-y-auto border border-slate-600 rounded-lg p-3 bg-slate-700/50">
                                    {#if categories.length === 0}
                                        <div class="text-gray-400 text-sm text-center py-4">
                                            <div class="mb-2">No categories available.</div>
                                            <div class="text-xs">
                                                Categories need to be created by an admin first.<br/>
                                                You can create a new category using the button below if you have admin permissions.
                                            </div>
                                        </div>
                                    {:else}
                                        {#each categories as category}
                                            <label class="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={uploadForm.category_ids.includes(category.id)}
                                                    on:change={() => toggleCategory(category.id)}
                                                    class="rounded border-slate-500 text-blue-500 focus:ring-blue-500 focus:ring-2"
                                                />
                                                <span class="text-white text-sm">
                                                    {category.english_name || category.name}
                                                    {#if category.english_name && category.name !== category.english_name}
                                                        <span class="text-gray-400">({category.name})</span>
                                                    {/if}
                                                </span>
                                            </label>
                                        {/each}
                                    {/if}
                                </div>
                                <div class="mt-2 flex justify-between items-center">
                                    <div class="text-xs text-gray-400">
                                        {uploadForm.category_ids.length} categories selected
                                    </div>
                                    <button
                                        type="button"
                                        on:click={() => showNewCategoryForm = !showNewCategoryForm}
                                        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                                    >
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                        </svg>
                                        New Category
                                    </button>
                                </div>
                            </div>

                            <!-- New Category Form -->
                            {#if showNewCategoryForm}
                                <div class="md:col-span-2 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                    <h4 class="text-lg font-medium text-white mb-4">Create New Category</h4>
                                    <div class="space-y-4">
                                        <div>
                                            <label for="new-category-name" class="block text-sm font-medium text-gray-300 mb-2">
                                                Category Name (Local) *
                                            </label>
                                            <input
                                                id="new-category-name"
                                                type="text"
                                                bind:value={newCategoryForm.name}
                                                placeholder="e.g., วิทยาศาสตร์"
                                                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label for="new-category-english" class="block text-sm font-medium text-gray-300 mb-2">
                                                English Name
                                            </label>
                                            <input
                                                id="new-category-english"
                                                type="text"
                                                bind:value={newCategoryForm.english_name}
                                                placeholder="e.g., Science"
                                                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label for="new-category-description" class="block text-sm font-medium text-gray-300 mb-2">
                                                Description
                                            </label>
                                            <input
                                                id="new-category-description"
                                                type="text"
                                                bind:value={newCategoryForm.description}
                                                placeholder="Brief description of this category"
                                                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div class="flex gap-2">
                                            <button
                                                type="button"
                                                on:click={createNewCategory}
                                                disabled={creatingCategory || !newCategoryForm.name.trim()}
                                                class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                {#if creatingCategory}
                                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Loading...
                                                {:else}
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                    Create Category
                                                {/if}
                                            </button>
                                            <button
                                                type="button"
                                                on:click={() => showNewCategoryForm = false}
                                                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            <!-- Answer Key -->
                            <div class="md:col-span-2">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-2">
                                        <div class="block text-sm font-medium text-gray-300">
                                            Answer Key *
                                        </div>
                                        {#if uploadForm.answer_key.trim()}
                                            {#if answerKeyValid}
                                                <div class="flex items-center gap-1 text-green-400 text-xs">
                                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                    Valid JSON
                                                </div>
                                            {:else}
                                                <div class="flex items-center gap-1 text-red-400 text-xs">
                                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                    </svg>
                                                    Invalid JSON
                                                </div>
                                            {/if}
                                        {/if}
                                    </div>
                                    <div class="flex bg-slate-700 rounded-lg p-1">
                                        <button
                                            type="button"
                                            class="px-3 py-1 text-xs rounded {answerKeyFormat === 'simple' ? 'bg-blue-500 text-white' : 'text-gray-300'}"
                                            on:click={() => answerKeyFormat = 'simple'}
                                        >
                                            Manual JSON
                                        </button>
                                        <button
                                            type="button"
                                            class="px-3 py-1 text-xs rounded {answerKeyFormat === 'detailed' ? 'bg-blue-500 text-white' : 'text-gray-300'}"
                                            on:click={() => answerKeyFormat = 'detailed'}
                                        >
                                            Helper
                                        </button>
                                    </div>
                                </div>

                                {#if answerKeyFormat === 'simple'}
                                    <textarea
                                        bind:value={uploadForm.answer_key}
                                        placeholder={'Enter answer key in JSON format, e.g.:\n{\n  "1": "A",\n  "2": "B",\n  "3": "Sample essay answer or guidelines"\n}'}
                                        rows="6"
                                        class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                                        required
                                    ></textarea>
                                    <p class="mt-1 text-sm text-gray-400">
                                        Provide a JSON object mapping question numbers to answers. For multiple choice use letters (A, B, C, D), for essays use text descriptions.
                                    </p>
                                {:else}
                                    <div class="space-y-4">
                                        <!-- Multiple Choice Answers -->
                                        {#if uploadForm.choice_count > 0}
                                            <div>
                                                <h4 class="text-sm font-medium text-gray-300 mb-2">Multiple Choice Answers</h4>
                                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {#each mcAnswers as answer, i}
                                                        <div class="flex items-center space-x-2">
                                                            <span class="text-gray-400 text-sm">{i + 1}.</span>
                                                            <select
                                                                bind:value={mcAnswers[i]}
                                                                on:change={generateAnswerKey}
                                                                class="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                                                            >
                                                                <option value="">-</option>
                                                                <option value="A">A</option>
                                                                <option value="B">B</option>
                                                                <option value="C">C</option>
                                                                <option value="D">D</option>
                                                                <option value="E">E</option>
                                                            </select>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}

                                        <!-- Essay Answers -->
                                        {#if uploadForm.essay_count > 0}
                                            <div>
                                                <h4 class="text-sm font-medium text-gray-300 mb-2">Essay Question Guidelines</h4>
                                                <div class="space-y-2">
                                                    {#each essayAnswers as answer, i}
                                                        <div>
                                                            <div class="block text-xs text-gray-400 mb-1">Essay {i + 1} Answer/Guidelines:</div>
                                                            <textarea
                                                                bind:value={essayAnswers[i]}
                                                                on:input={generateAnswerKey}
                                                                placeholder="Enter the answer or guidelines for essay question {i + 1}"
                                                                rows="2"
                                                                class="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white placeholder-gray-400 text-sm resize-none"
                                                            ></textarea>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}

                                        <!-- Generated Answer Key Preview -->
                                        {#if uploadForm.answer_key}
                                            <div>
                                                <h4 class="text-sm font-medium text-gray-300 mb-2">Generated Answer Key:</h4>
                                                <div class="bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                    {uploadForm.answer_key}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Modal Footer -->
                <div class="bg-slate-700/50 px-6 py-4 border-t border-slate-600">
                    <div class="flex items-center justify-between">
                        <p class="text-sm text-gray-400">
                            * Required fields
                        </p>
                        <div class="flex gap-3">
                            <button
                                type="button"
                                on:click={closeModal}
                                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                on:click={uploadExam}
                                disabled={uploadLoading || !uploadForm.file || !uploadForm.title.trim() || !uploadForm.description.trim() || !answerKeyValid}
                                class="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                {#if uploadLoading}
                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Uploading...
                                {:else}
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                    </svg>
                                    Upload Exam
                                {/if}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
