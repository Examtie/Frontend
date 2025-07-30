<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { toastStore } from '$lib/stores/toast';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n';
    import Header from '../components/Header.svelte';
    import ExamUploadModal from '$lib/components/ExamUploadModal.svelte';

    type AdminUser = {
        id: string;
        email: string;
        full_name: string;
        username: string;
        roles: string[];
        bio?: string;
        profile_image?: string;
        created_at?: string;
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
        created_at?: string;
    };

    type SystemStats = {
        users: {
            total: number;
            by_role: Record<string, number>;
        };
        exam_files: {
            total: number;
        };
        analytics: {
            total_downloads: number;
            total_revenue: number;
            monthly_growth: number;
            active_users_today: number;
            popular_tags: { tag: string; count: number }[];
        };
        pending_content: {
            exam_files: number;
            flashcard_sets: number;
        };
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    let activeTab = 'dashboard';
    let sidebarOpen = false;
    let users: AdminUser[] = [];
    let examFiles: ExamFile[] = [];
    let categories: any[] = [];
    let stats: SystemStats | null = null;
    let loading = false;
    let skeletonLoading = true;
    let error = '';
    let successMessage = '';

    // User management
    let userPage = 1;
    let userLimit = 10;
    let userSearch = '';
    let userRoleFilter = '';
    let selectedUsers: string[] = [];
    let bulkAction = '';
    let userSortBy = 'created_at';
    let userSortOrder: 'asc' | 'desc' = 'desc';
    let totalUsers = 0;
    let totalUserPages = 0;

    // Exam file management
    let examFilePage = 1;
    let examFileLimit = 10;
    let examFileSearch = '';
    let examFileTagFilter = '';
    let examFileSortBy = 'created_at';
    let examFileSortOrder: 'asc' | 'desc' = 'desc';
    let totalExamFiles = 0;
    let totalExamFilePages = 0;

    // Infinite scroll
    let loadingMore = false;
    let enableInfiniteScroll = false;

    // System features management
    let systemFeatures: any[] = [];
    let pendingContent: any[] = [];
    let analyticsData: any = null;
    let revenueData: any[] = [];
    let growthData: any[] = [];

    // Modals
    let showUserModal = false;
    let showExamFileModal = false;
    let showUploadModal = false;
    let editingUser: AdminUser | null = null;
    let editingExamFile: ExamFile | null = null;

    // --- START: Fix for Category Errors ---
    let showCategoryModal = false;
    let editingCategory: any | null = null; // To hold the category being edited/created
    // --- END: Fix for Category Errors ---

    // Form data
    let userForm = {
        full_name: '',
        bio: '',
        profile_image: ''
    };

    let examFileForm = {
        title: '',
        description: '',
        tags: '',
        essay_count: 0,
        choice_count: 0
    };

    // Upload form (simplified - now using shared component)

    onMount(async () => {
        // Wait for auth to initialize before checking authentication
        if (!$auth.isInitialized) {
            // Wait for auth initialization to complete
            const unsubscribe = auth.subscribe((authState) => {
                if (authState.isInitialized) {
                    unsubscribe();
                    // Now check authentication and admin role after initialization
                    if (!authState.isAuthenticated || !authState.user?.roles.includes('admin')) {
                        goto('/');
                        return;
                    }
                    // Auth is valid and user is admin, load data
                    loadData();
                }
            });
        } else {
            // Auth already initialized, check immediately
            if (!$auth.isAuthenticated || !$auth.user?.roles.includes('admin')) {
                goto('/');
                return;
            }
            await loadData();
        }
    });

    async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
        const token = $auth.token;
        if (!token) {
            throw new Error('No authentication token');
        }

        // Don't set Content-Type if body is FormData (for file uploads)
        const isFormData = options.body instanceof FormData;
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        
        // Only set Content-Type for non-FormData requests
        if (!isFormData && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Request failed' })) as any;
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async function loadData() {
        loading = true;
        if (users.length === 0 && examFiles.length === 0) {
            skeletonLoading = true;
        }
        error = '';
        
        try {
            await Promise.all([
                loadUsers(),
                loadExamFiles(),
                loadCategories(),
                loadStats(),
                loadSystemFeatures(),
                loadPendingContent(),
                loadAnalyticsData()
            ]);
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
            skeletonLoading = false;
        }
    }

    async function loadUsers() {
        try {
            const params = new URLSearchParams({
                page: userPage.toString(),
                limit: userLimit.toString(),
                sort_by: userSortBy,
                sort_order: userSortOrder,
            });
            
            if (userSearch) params.append('search', userSearch);
            if (userRoleFilter) params.append('role', userRoleFilter);

            const response = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users?${params}`);
            
            // Handle pagination properly
            if (response.pagination) {
                users = response.data || response.users || [];
                totalUsers = response.pagination.total;
                totalUserPages = response.pagination.total_pages;
            } else {
                // Fallback for non-paginated response
                users = response.users || response;
                totalUsers = response.total || users.length;
                totalUserPages = response.total_pages || Math.ceil(totalUsers / userLimit);
            }
        } catch (err: any) {
            error = err.message;
        }
    }

    async function loadExamFiles() {
        try {
            const params = new URLSearchParams({
                page: examFilePage.toString(),
                limit: examFileLimit.toString(),
                sort_by: examFileSortBy,
                sort_order: examFileSortOrder,
            });

            if (examFileSearch) params.append('search', examFileSearch);
            if (examFileTagFilter) params.append('tag', examFileTagFilter);

            const response = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/exam-files?${params}`);
            
            // Handle pagination properly
            if (response.pagination) {
                examFiles = response.data || response.exam_files || [];
                totalExamFiles = response.pagination.total;
                totalExamFilePages = response.pagination.total_pages;
            } else {
                // Fallback for non-paginated response
                examFiles = response.exam_files || response;
                totalExamFiles = response.total || examFiles.length;
                totalExamFilePages = response.total_pages || Math.ceil(totalExamFiles / examFileLimit);
            }
        } catch (err: any) {
            error = err.message;
        }
    }

    async function loadStats() {
        stats = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/stats`) as SystemStats;
    }

    async function loadCategories() {
        try {
            categories = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/exam-categories`);
        } catch (err: any) {
            console.warn('Failed to load categories:', err.message);
            categories = [];
        }
    }

    async function loadSystemFeatures() {
        try {
            systemFeatures = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/system/features`);
        } catch (err: any) {
            console.warn('Failed to load system features:', err.message);
            systemFeatures = [];
        }
    }

    async function loadPendingContent() {
        try {
            pendingContent = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/content/pending`);
        } catch (err: any) {
            console.warn('Failed to load pending content:', err.message);
            pendingContent = [];
        }
    }

    async function loadAnalyticsData() {
        try {
            analyticsData = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/analytics`);
            revenueData = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/analytics/revenue`);
            growthData = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/analytics/growth`);
        } catch (err: any) {
            console.warn('Failed to load analytics data:', err.message);
            analyticsData = null;
            revenueData = [];
            growthData = [];
        }
    }

    async function getUserDetail(userId: string) {
        try {
            const userDetail = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users/@data?user_id=${userId}`);
            return userDetail;
        } catch (err: any) {
            error = err.message;
            return null;
        }
    }

    async function updateUserRole(userId: string, role: string) {
        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role }),
            });
            successMessage = `User role updated to ${role} successfully`;
            setTimeout(() => successMessage = '', 3000);
            await loadUsers();
            await loadStats();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function deleteUser(userId: string) {
        const user = users.find(u => u.id === userId);
        const userName = user ? `${user.full_name} (${user.email})` : 'this user';
        
        if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;

        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users/${userId}`, {
                method: 'DELETE',
            });
            successMessage = 'User deleted successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadUsers();
            await loadStats();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function bulkUpdateUserRoles() {
        if (selectedUsers.length === 0 || !bulkAction) return;

        if (!confirm(`Are you sure you want to update the role of ${selectedUsers.length} user(s) to "${bulkAction}"?`)) return;

        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users/bulk/role`, {
                method: 'PATCH',
                body: JSON.stringify({
                    user_ids: selectedUsers,
                    role: bulkAction
                }),
            });
            selectedUsers = [];
            bulkAction = '';
            successMessage = 'User roles updated successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadUsers();
            await loadStats();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function bulkDeleteUsers() {
        if (selectedUsers.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) return;

        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users/bulk`, {
                method: 'DELETE',
                body: JSON.stringify({
                    user_ids: selectedUsers
                }),
            });
            selectedUsers = [];
            successMessage = 'Users deleted successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadUsers();
            await loadStats();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function updateUserProfile() {
        if (!editingUser) return;

        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users/${editingUser.id}`, {
                method: 'PATCH',
                body: JSON.stringify(userForm),
            });
            showUserModal = false;
            editingUser = null;
            successMessage = 'User profile updated successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadUsers();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function deleteExamFile(fileId: string) {
        const examFile = examFiles.find(f => f.id === fileId);
        const fileName = examFile ? examFile.title : 'this file';
        
        if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) return;

        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/exam-files/${fileId}`, {
                method: 'DELETE',
            });
            successMessage = 'Exam file deleted successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadExamFiles();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function updateExamFile() {
        if (!editingExamFile) return;

        try {
            // Validation: At least one question type must be greater than 0
            if (examFileForm.essay_count < 1 && examFileForm.choice_count < 1) {
                error = 'At least one question type (essay or multiple choice) must be 1 or greater';
                toastStore.error('At least one question type must be 1 or greater');
                return;
            }

            const tags = examFileForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/exam-files/${editingExamFile.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: examFileForm.title,
                    description: examFileForm.description,
                    tags: tags,
                    essay_count: examFileForm.essay_count,
                    choice_count: examFileForm.choice_count
                }),
            });
            showExamFileModal = false;
            editingExamFile = null;
            successMessage = 'Exam file updated successfully';
            toastStore.success('Exam file updated successfully');
            setTimeout(() => successMessage = '', 3000);
            await loadExamFiles();
        } catch (err: any) {
            error = err.message;
            toastStore.error(err.message || 'Failed to update exam file');
        }
    }

    // --- START: Fix for Category Errors ---
    /**
     * Opens the category modal to edit a specific category.
     * NOTE: You will need to implement a modal component for categories that uses
     * the `showCategoryModal` and `editingCategory` variables.
     */
    function editCategory(category: any) {
        editingCategory = category;
        // Here you would typically populate a form model from the category object
        // e.g., categoryForm.name = category.name;
        showCategoryModal = true;
        // For now, we'll just log to the console and show a toast.
        console.log("Editing category:", category);
        toastStore.info(`Editing category: ${category.name}. (Modal UI needs implementation)`);
    }

    /**
     * Deletes a category after confirmation.
     */
    async function deleteCategory(categoryId: string) {
        const category = categories.find(c => c.id === categoryId);
        const categoryName = category ? category.name : 'this category';
        
        if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) return;

        try {
            // NOTE: The API endpoint for deleting categories might be different.
            // Please verify this endpoint with your backend documentation.
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/exam-categories/${categoryId}`, {
                method: 'DELETE',
            });
            successMessage = 'Category deleted successfully';
            toastStore.success('Category deleted successfully.');
            setTimeout(() => successMessage = '', 3000);
            await loadCategories(); // Reload the category list
        } catch (err: any) {
            error = err.message;
            toastStore.error(err.message || 'Failed to delete category');
        }
    }
    // --- END: Fix for Category Errors ---

    // Upload modal functions for shared component
    function closeUploadModal() {
        showUploadModal = false;
    }

    function handleExamUploadSuccess(newExam: any) {
        // Add the new exam to the beginning of the list
        examFiles = [newExam, ...examFiles];
        loadStats(); // Refresh stats
    }

    // Debug function to test R2 configuration
    async function testR2Config() {
        try {
            const result = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/test-r2`);
            console.log('R2 Configuration Test:', result);
            
            if (result.r2_configured && result.bucket_accessible) {
                toastStore.success('R2 storage is properly configured and accessible!');
            } else {
                let errorMsg = 'R2 Configuration Issues:\n';
                if (!result.r2_configured) errorMsg += '- R2 not configured (missing environment variables)\n';
                if (!result.bucket_accessible) errorMsg += `- Bucket not accessible: ${result.bucket_test_error}\n`;
                toastStore.error(errorMsg);
            }
        } catch (error: any) {
            toastStore.error(`R2 test failed: ${error.message}`);
        }
    }

    // Debug function to test upload
    async function debugUpload() {
        try {
            const token = $auth.token;
            if (!token) {
                toastStore.error('No authentication token found');
                return;
            }
            
            toastStore.info('Running upload test...');
            // await testApiConnection(API_BASE_URL, token);
            // await testUpload(API_BASE_URL, token);
            toastStore.success('Upload test completed successfully!');
            
            // Reload files to see the test file
            await loadExamFiles();
        } catch (error: any) {
            toastStore.error(`Upload test failed: ${error.message}`);
        }
    }

    function openUserModal(user: AdminUser) {
        editingUser = user;
        userForm = {
            full_name: user.full_name,
            bio: user.bio || '',
            profile_image: user.profile_image || ''
        };
        showUserModal = true;
    }

    function openExamFileModal(examFile: ExamFile) {
        editingExamFile = examFile;
        examFileForm = {
            title: examFile.title,
            description: examFile.description,
            tags: examFile.tags.join(', '),
            essay_count: examFile.essay_count,
            choice_count: examFile.choice_count
        };
        showExamFileModal = true;
    }

    function toggleUserSelection(userId: string) {
        if (selectedUsers.includes(userId)) {
            selectedUsers = selectedUsers.filter(id => id !== userId);
        } else {
            selectedUsers = [...selectedUsers, userId];
        }
    }

    function selectAllUsers() {
        if (selectedUsers.length === users.length) {
            selectedUsers = [];
        } else {
            selectedUsers = users.map(user => user.id);
        }
    }

    async function handleSearch() {
        userPage = 1;
        await loadUsers();
    }

    async function handleRoleFilter() {
        userPage = 1;
        await loadUsers();
    }

    async function handleExamFileSearch() {
        examFilePage = 1;
        await loadExamFiles();
    }

    async function handleExamFileTagFilter() {
        examFilePage = 1;
        await loadExamFiles();
    }

    // Debounced search function
    let searchTimeout: ReturnType<typeof setTimeout>;
    function debounceSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(handleSearch, 300);
    }

    let examFileSearchTimeout: ReturnType<typeof setTimeout>;
    function debounceExamFileSearch() {
        clearTimeout(examFileSearchTimeout);
        examFileSearchTimeout = setTimeout(handleExamFileSearch, 300);
    }

    function getRoleColor(role: string): string {
        switch (role) {
            case 'admin': return 'bg-red-500/20 text-red-300 border border-red-500/30';
            case 'staff': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
            case 'seller': return 'bg-green-500/20 text-green-300 border border-green-500/30';
            default: return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        }
    }

    // Sorting functions
    function sortUsers(column: string) {
        if (userSortBy === column) {
            userSortOrder = userSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            userSortBy = column;
            userSortOrder = 'desc';
        }
        userPage = 1;
        loadUsers();
    }

    function sortExamFiles(column: string) {
        if (examFileSortBy === column) {
            examFileSortOrder = examFileSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            examFileSortBy = column;
            examFileSortOrder = 'desc';
        }
        examFilePage = 1;
        loadExamFiles();
    }

    // Pagination functions
    function goToUserPage(page: number) {
        userPage = page;
        loadUsers();
    }

    function goToExamFilePage(page: number) {
        examFilePage = page;
        loadExamFiles();
    }

    // Infinite scroll function
    function handleScroll(event: Event) {
        if (!enableInfiniteScroll || loadingMore) return;
        
        const target = event.target as HTMLElement;
        const { scrollTop, scrollHeight, clientHeight } = target;
        
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadMoreItems();
        }
    }

    async function loadMoreItems() {
        if (loadingMore) return;
        
        loadingMore = true;
        try {
            if (activeTab === 'users' && userPage < totalUserPages) {
                userPage++;
                const params = new URLSearchParams({
                    page: userPage.toString(),
                    limit: userLimit.toString(),
                    sort_by: userSortBy,
                    sort_order: userSortOrder,
                });
                
                if (userSearch) params.append('search', userSearch);
                if (userRoleFilter) params.append('role', userRoleFilter);

                const response = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/users?${params}`);
                const newUsers = response.data || response.users || [];
                users = [...users, ...newUsers];
            } else if (activeTab === 'exam-files' && examFilePage < totalExamFilePages) {
                examFilePage++;
                const params = new URLSearchParams({
                    page: examFilePage.toString(),
                    limit: examFileLimit.toString(),
                    sort_by: examFileSortBy,
                    sort_order: examFileSortOrder,
                });

                if (examFileSearch) params.append('search', examFileSearch);
                if (examFileTagFilter) params.append('tag', examFileTagFilter);

                const response = await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/exam-files?${params}`);
                const newFiles = response.data || response.exam_files || [];
                examFiles = [...examFiles, ...newFiles];
            }
        } catch (err: any) {
            error = err.message;
        } finally {
            loadingMore = false;
        }
    }

    function toggleInfiniteScroll() {
        enableInfiniteScroll = !enableInfiniteScroll;
        if (!enableInfiniteScroll) {
            // Reset to normal pagination
            userPage = 1;
            examFilePage = 1;
            loadData();
        }
    }

    // Content moderation functions
    async function approveContent(contentId: string, contentType: string) {
        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/content/${contentType}/${contentId}/approve`, {
                method: 'POST'
            });
            successMessage = 'Content approved successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadPendingContent();
            await loadStats();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function rejectContent(contentId: string, contentType: string, reason: string = '') {
        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/content/${contentType}/${contentId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
            successMessage = 'Content rejected successfully';
            setTimeout(() => successMessage = '', 3000);
            await loadPendingContent();
        } catch (err: any) {
            error = err.message;
        }
    }

    // System feature management functions
    async function toggleSystemFeature(featureKey: string, enabled: boolean) {
        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/admin/api/v1/system/features/${featureKey}`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled })
            });
            successMessage = `Feature ${enabled ? 'enabled' : 'disabled'} successfully`;
            setTimeout(() => successMessage = '', 3000);
            await loadSystemFeatures();
        } catch (err: any) {
            error = err.message;
        }
    }
</script>

<svelte:head>
    <title>Admin Dashboard - Examtie</title>
    <meta name="description" content="Administrative dashboard for Examtie" />
</svelte:head>

<!-- <Header /> -->

<!-- Sidebar Toggle for Mobile -->
<div class="lg:hidden">
    <button
        on:click={() => sidebarOpen = !sidebarOpen}
        class="fixed top-6 left-6 z-50 p-3 bg-slate-800/90 backdrop-blur-lg rounded-xl border border-slate-700/50 text-white hover:bg-slate-700/90 transition-all duration-300"
    >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
    </button>
</div>

<!-- Admin Layout Container -->
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0">
        <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/10 to-slate-900/5"></div>
        <div class="absolute top-20 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl animate-bounce animation-delay-1000"></div>
    </div>

    <!-- Sidebar Overlay for Mobile -->
    {#if sidebarOpen}
        <div 
            class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            on:click={() => sidebarOpen = false}
        ></div>
    {/if}

    <!-- Sidebar -->
    <div class="fixed left-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-40 transform transition-transform duration-300 ease-in-out {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0">
        <!-- Sidebar Header -->
        <div class="p-6 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Admin Panel
                        </h1>
                        <p class="text-xs text-gray-400">Control Center</p>
                    </div>
                </div>
                <button
                    on:click={() => sidebarOpen = false}
                    class="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- User Info -->
        <div class="p-6 border-b border-slate-700/30">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span class="text-white text-lg font-bold">{$auth.user?.email?.[0]?.toUpperCase() || 'A'}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{$auth.user?.email || 'Administrator'}</p>
                    <div class="flex items-center space-x-2 mt-1">
                        <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <p class="text-xs text-emerald-400 font-medium">Online</p>
                        <span class="text-xs text-gray-500">•</span>
                        <p class="text-xs text-gray-400">Admin Role</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-2">
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Overview</h3>
                <button
                    class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                    on:click={() => {activeTab = 'dashboard'; sidebarOpen = false;}}
                >
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'dashboard' ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <span class="font-medium">Dashboard</span>
                        <p class="text-xs text-gray-400 mt-0.5">System overview</p>
                    </div>
                    {#if activeTab === 'dashboard'}
                        <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    {/if}
                </button>
            </div>

            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Management</h3>
                <div class="space-y-2">
                    <button
                        class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'users' ? 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white border border-emerald-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                        on:click={() => {activeTab = 'users'; sidebarOpen = false;}}
                    >
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'users' ? 'bg-gradient-to-br from-emerald-500 to-blue-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="font-medium">Users</span>
                            <p class="text-xs text-gray-400 mt-0.5">{stats?.users?.total || 0} registered</p>
                        </div>
                        {#if activeTab === 'users'}
                            <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        {/if}
                    </button>

                    <button
                        class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'exam-files' ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-white border border-amber-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                        on:click={() => {activeTab = 'exam-files'; sidebarOpen = false;}}
                    >
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'exam-files' ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="font-medium">Exam Files</span>
                            <p class="text-xs text-gray-400 mt-0.5">{stats?.exam_files?.total || 0} uploaded</p>
                        </div>
                        {#if activeTab === 'exam-files'}
                            <div class="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        {/if}
                    </button>

                    <button
                        class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'categories' ? 'bg-gradient-to-r from-pink-600/20 to-rose-600/20 text-white border border-pink-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                        on:click={() => {activeTab = 'categories'; sidebarOpen = false;}}
                    >
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'categories' ? 'bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="font-medium">Categories</span>
                            <p class="text-xs text-gray-400 mt-0.5">{categories?.length || 0} tags</p>
                        </div>
                        {#if activeTab === 'categories'}
                            <div class="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                        {/if}
                    </button>
                </div>
            </div>

            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Content</h3>
                <div class="space-y-2">
                    <button
                        class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'moderation' ? 'bg-gradient-to-r from-red-600/20 to-pink-600/20 text-white border border-red-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                        on:click={() => {activeTab = 'moderation'; sidebarOpen = false;}}
                    >
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'moderation' ? 'bg-gradient-to-br from-red-500 to-pink-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="font-medium">Moderation</span>
                            <p class="text-xs text-gray-400 mt-0.5">{(stats?.pending_content?.exam_files || 0) + (stats?.pending_content?.flashcard_sets || 0)} pending</p>
                        </div>
                        {#if (stats?.pending_content?.exam_files || 0) + (stats?.pending_content?.flashcard_sets || 0) > 0}
                            <div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        {/if}
                        {#if activeTab === 'moderation'}
                            <div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        {/if}
                    </button>
                </div>
            </div>

            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Insights</h3>
                <div class="space-y-2">
                    <button
                        class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'analytics' ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-white border border-purple-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                        on:click={() => {activeTab = 'analytics'; sidebarOpen = false;}}
                    >
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'analytics' ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="font-medium">Analytics</span>
                            <p class="text-xs text-gray-400 mt-0.5">{stats?.analytics?.monthly_growth || 0}% growth</p>
                        </div>
                        {#if activeTab === 'analytics'}
                            <div class="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        {/if}
                    </button>

                    <button
                        class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group {activeTab === 'system' ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-white border border-cyan-500/30' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}"
                        on:click={() => {activeTab = 'system'; sidebarOpen = false;}}
                    >
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center {activeTab === 'system' ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg' : 'bg-slate-800 group-hover:bg-slate-700'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="font-medium">System</span>
                            <p class="text-xs text-gray-400 mt-0.5">Settings & Config</p>
                        </div>
                        {#if activeTab === 'system'}
                            <div class="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        {/if}
                    </button>
                </div>
            </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-slate-700/30">
            <div class="flex items-center justify-between text-xs text-gray-400">
                <span>Version 2.0</span>
                <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span>All systems operational</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="lg:ml-80 min-h-screen">
        <!-- Top Header Bar -->
        <header class="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/30 sticky top-0 z-30">
            <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div>
                            <h2 class="text-2xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                            <p class="text-sm text-gray-400 mt-1">
                                {#if activeTab === 'dashboard'}
                                    System overview and quick actions
                                {:else if activeTab === 'users'}
                                    Manage user accounts and permissions
                                {:else if activeTab === 'exam-files'}
                                    Upload and organize exam content
                                {:else if activeTab === 'categories'}
                                    Manage exam categories and tags
                                {:else if activeTab === 'moderation'}
                                    Review and moderate content
                                {:else if activeTab === 'analytics'}
                                    Platform insights and reports
                                {:else if activeTab === 'system'}
                                    System configuration and settings
                                {/if}
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <!-- Quick Action Buttons -->
                        {#if activeTab === 'exam-files'}
                            <button
                                on:click={() => showUploadModal = true}
                                class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                <span class="font-medium">Upload Exam</span>
                            </button>
                        {/if}
                        
                        <!-- Refresh Button -->
                        <button
                            on:click={loadData}
                            class="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300"
                            disabled={loading}
                        >
                            <svg class="w-5 h-5 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>

    <!-- Error Message -->
    {#if error}
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div class="bg-red-900/20 backdrop-blur-lg border border-red-500/30 rounded-xl p-4 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-300">Error</h3>
                        <p class="mt-1 text-sm text-red-200">{error}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <button
                            on:click={() => error = ''}
                            class="inline-flex text-red-400 hover:text-red-300 transition-colors p-1 rounded-md hover:bg-red-500/20"
                        >
                            <span class="sr-only">Dismiss</span>
                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Success Message -->
    {#if successMessage}
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div class="bg-green-900/20 backdrop-blur-lg border border-green-500/30 rounded-xl p-4 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-green-300">Success</h3>
                        <p class="mt-1 text-sm text-green-200">{successMessage}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <button
                            on:click={() => successMessage = ''}
                            class="inline-flex text-green-400 hover:text-green-300 transition-colors p-1 rounded-md hover:bg-green-500/20"
                        >
                            <span class="sr-only">Dismiss</span>
                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Stats Cards with Skeleton Loading -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {#if skeletonLoading}
                <!-- Skeleton Loading Cards -->
                {#each Array.from({length: 8}) as _, i}
                    <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 animate-pulse">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-12 h-12 bg-slate-700/50 rounded-xl"></div>
                            </div>
                            <div class="ml-4 flex-1">
                                <div class="h-4 bg-slate-700/50 rounded-md mb-2 w-20"></div>
                                <div class="h-8 bg-slate-600/50 rounded-md mb-2 w-16"></div>
                                <div class="h-3 bg-slate-700/50 rounded-md w-12"></div>
                            </div>
                        </div>
                    </div>
                {/each}
            {:else if stats}
                <!-- Total Users Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-blue-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="white" d="M9.775 12q-.9 0-1.5-.675T7.8 9.75l.325-2.45q.2-1.425 1.3-2.363T12 4t2.575.938t1.3 2.362l.325 2.45q.125.9-.475 1.575t-1.5.675zm0-2h4.45L13.9 7.6q-.1-.7-.637-1.15T12 6t-1.263.45T10.1 7.6zM4 20v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20zm2-2h12v-.8q0-.275-.137-.5t-.363-.35q-1.35-.675-2.725-1.012T12 15t-2.775.338T6.5 16.35q-.225.125-.363.35T6 17.2zm6 0"/></svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Total Users</p>
                            <p class="text-3xl font-bold text-white">{stats.users.total.toLocaleString()}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-green-400 font-medium">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Admins Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-red-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="32" height="32" viewBox="0 0 36 36"><!-- Icon from Clarity by VMware - https://github.com/vmware/clarity-assets/blob/master/LICENSE --><path fill="currentColor" d="M14.68 14.81a6.76 6.76 0 1 1 6.76-6.75a6.77 6.77 0 0 1-6.76 6.75m0-11.51a4.76 4.76 0 1 0 4.76 4.76a4.76 4.76 0 0 0-4.76-4.76" class="clr-i-outline clr-i-outline-path-1"/><path fill="currentColor" d="M16.42 31.68A2.14 2.14 0 0 1 15.8 30H4v-5.78a14.8 14.8 0 0 1 11.09-4.68h.72a2.2 2.2 0 0 1 .62-1.85l.12-.11c-.47 0-1-.06-1.46-.06A16.47 16.47 0 0 0 2.2 23.26a1 1 0 0 0-.2.6V30a2 2 0 0 0 2 2h12.7Z" class="clr-i-outline clr-i-outline-path-2"/><path fill="currentColor" d="M26.87 16.29a.4.4 0 0 1 .15 0a.4.4 0 0 0-.15 0" class="clr-i-outline clr-i-outline-path-3"/><path fill="currentColor" d="m33.68 23.32l-2-.61a7.2 7.2 0 0 0-.58-1.41l1-1.86A.38.38 0 0 0 32 19l-1.45-1.45a.36.36 0 0 0-.44-.07l-1.84 1a7 7 0 0 0-1.43-.61l-.61-2a.36.36 0 0 0-.36-.24h-2.05a.36.36 0 0 0-.35.26l-.61 2a7 7 0 0 0-1.44.6l-1.82-1a.35.35 0 0 0-.43.07L17.69 19a.38.38 0 0 0-.06.44l1 1.82a6.8 6.8 0 0 0-.63 1.43l-2 .6a.36.36 0 0 0-.26.35v2.05A.35.35 0 0 0 16 26l2 .61a7 7 0 0 0 .6 1.41l-1 1.91a.36.36 0 0 0 .06.43l1.45 1.45a.38.38 0 0 0 .44.07l1.87-1a7 7 0 0 0 1.4.57l.6 2a.38.38 0 0 0 .35.26h2.05a.37.37 0 0 0 .35-.26l.61-2.05a7 7 0 0 0 1.38-.57l1.89 1a.36.36 0 0 0 .43-.07L32 30.4a.35.35 0 0 0 0-.4l-1-1.88a7 7 0 0 0 .58-1.39l2-.61a.36.36 0 0 0 .26-.35v-2.1a.36.36 0 0 0-.16-.35M24.85 28a3.34 3.34 0 1 1 3.33-3.33A3.34 3.34 0 0 1 24.85 28" class="clr-i-outline clr-i-outline-path-4"/><path fill="none" d="M0 0h36v36H0z"/></svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Admins</p>
                            <p class="text-3xl font-bold text-white">{(stats.users.by_role.admin || 0).toLocaleString()}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-red-400 font-medium">Privileged</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Staff Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-yellow-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Material Design Icons by Pictogrammers - https://github.com/Templarian/MaterialDesign/blob/master/LICENSE --><path fill="currentColor" d="M17.5 9a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5m-3.07-.85L2 20.59L3.41 22L15.85 9.57c-.6-.33-1.09-.82-1.42-1.42M13 5l.63-1.37L15 3l-1.37-.63L13 1l-.62 1.37L11 3l1.38.63zm8 0l.63-1.37L23 3l-1.37-.63L21 1l-.62 1.37L19 3l1.38.63zm0 4l-.62 1.37L19 11l1.38.63L21 13l.63-1.37L23 11l-1.37-.63z"/></svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Staff</p>
                            <p class="text-3xl font-bold text-white">{(stats.users.by_role.staff || 0).toLocaleString()}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-yellow-400 font-medium">Moderators</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Exam Files Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-green-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Exam Files</p>
                            <p class="text-3xl font-bold text-white">{(stats.exam_files?.total || 0).toLocaleString()}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-green-400 font-medium">Available</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Downloads Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-purple-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Total Downloads</p>
                            <p class="text-3xl font-bold text-white">{(stats.analytics?.total_downloads || 0).toLocaleString()}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-purple-400 font-medium">All Time</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Revenue Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-emerald-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Total Revenue</p>
                            <p class="text-3xl font-bold text-white">฿{(stats.analytics?.total_revenue || 0).toLocaleString()}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-emerald-400 font-medium">All Time</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Growth Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-orange-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Monthly Growth</p>
                            <p class="text-3xl font-bold text-white">{stats.analytics?.monthly_growth || 0}%</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-orange-400 font-medium">This Month</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pending Content Card -->
                <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-amber-500/50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-300 mb-1">Pending Review</p>
                            <p class="text-3xl font-bold text-white">{(stats.pending_content?.exam_files || 0) + (stats.pending_content?.flashcard_sets || 0)}</p>
                            <div class="flex items-center mt-2">
                                <div class="w-2 h-2 bg-amber-400 rounded-full mr-2 animate-pulse"></div>
                                <span class="text-xs text-amber-400 font-medium">Needs Review</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Main Content Container -->
        <div class="p-6 space-y-6">
            <!-- Dashboard Tab -->
            {#if activeTab === "dashboard"}
                <div class="space-y-6">
                    <!-- Quick Action Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <button
                            on:click={() => activeTab = 'moderation'}
                            class="p-6 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-amber-400">{(stats?.pending_content?.exam_files || 0) + (stats?.pending_content?.flashcard_sets || 0)}</span>
                            </div>
                            <h4 class="text-white font-semibold">Content Review</h4>
                            <p class="text-gray-400 text-sm">Items pending moderation</p>
                        </button>

                        <button
                            on:click={() => activeTab = 'users'}
                            class="p-6 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-blue-400">{(stats?.users?.total || 0).toLocaleString()}</span>
                            </div>
                            <h4 class="text-white font-semibold">User Management</h4>
                            <p class="text-gray-400 text-sm">Manage platform users</p>
                        </button>

                        <button
                            on:click={() => activeTab = 'analytics'}
                            class="p-6 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-purple-400">{(stats?.analytics?.monthly_growth || 0)}%</span>
                            </div>
                            <h4 class="text-white font-semibold">Analytics</h4>
                            <p class="text-gray-400 text-sm">View detailed reports</p>
                        </button>

                        <button
                            on:click={() => activeTab = 'system'}
                            class="p-6 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-emerald-400">{systemFeatures.length}</span>
                            </div>
                            <h4 class="text-white font-semibold">System Settings</h4>
                            <p class="text-gray-400 text-sm">Configure features</p>
                        </button>
                    </div>

                    <!-- Recent Activity -->
                    <div class="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
                        <h4 class="text-xl font-semibold text-white mb-4">Recent Activity</h4>
                        <div class="space-y-4">
                            <div class="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-xl">
                                <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                    </svg>
                                </div>
                                <div class="flex-1">
                                    <p class="text-white font-medium">New user registration</p>
                                    <p class="text-gray-400 text-sm">user@example.com joined the platform</p>
                                </div>
                                <span class="text-gray-400 text-xs">2 min ago</span>
                            </div>
                            <div class="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-xl">
                                <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                </div>
                                <div class="flex-1">
                                    <p class="text-white font-medium">Exam file uploaded</p>
                                    <p class="text-gray-400 text-sm">Mathematics Final Exam 2024</p>
                                </div>
                                <span class="text-gray-400 text-xs">15 min ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

                        <button
                            on:click={() => activeTab = 'users'}
                            class="p-6 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-blue-400">{(stats?.users?.total || 0).toLocaleString()}</span>
                            </div>
                            <h4 class="text-white font-semibold">User Management</h4>
                            <p class="text-gray-400 text-sm">Manage platform users</p>
                        </button>

                        <button
                            on:click={() => activeTab = 'analytics'}
                            class="p-6 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-purple-400">{(stats?.analytics?.monthly_growth || 0)}%</span>
                            </div>
                            <h4 class="text-white font-semibold">Analytics</h4>
                            <p class="text-gray-400 text-sm">View detailed reports</p>
                        </button>

                        <button
                            on:click={() => activeTab = 'system'}
                            class="p-6 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all duration-300 text-left group"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                    <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-emerald-400">{systemFeatures.length}</span>
                            </div>
                            <h4 class="text-white font-semibold">System Settings</h4>
                            <p class="text-gray-400 text-sm">Configure features</p>
                        </button>
                    </div>

                    <!-- Recent Activity -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Recent Content -->
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                                <svg class="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                Recent Exam Files
                            </h4>
                            <div class="space-y-3">
                                {#each examFiles.slice(0, 5) as file}
                                    <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                        <div>
                                            <p class="text-gray-200 font-medium">{file.title}</p>
                                            <p class="text-gray-400 text-sm">by {file.uploaded_by}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-green-400 text-sm">{file.essay_count + file.choice_count} questions</p>
                                        </div>
                                    </div>
                                {:else}
                                    <p class="text-gray-400 text-center py-4">No exam files yet</p>
                                {/each}
                            </div>
                        </div>

                        <!-- Popular Tags -->
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                                <svg class="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                </svg>
                                Popular Tags
                            </h4>
                            <div class="space-y-3">
                                {#each stats?.analytics?.popular_tags?.slice(0, 5) || [] as tagData}
                                    <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                        <span class="text-gray-200">#{tagData.tag}</span>
                                        <span class="text-purple-400 font-semibold">{tagData.count}</span>
                                    </div>
                                {:else}
                                    <p class="text-gray-400 text-center py-4">No tag data available</p>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>

            <!-- Categories Tab -->
            {#if activeTab === 'categories'}
                <div class="space-y-6">
                    <div class="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-xl font-semibold text-white">Category Management</h3>
                                <p class="text-gray-400 mt-1">Organize your exam content with categories and tags</p>
                            </div>
                            <button 
                                on:click={() => showCategoryModal = true}
                                class="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                <span>Add Category</span>
                            </button>
                        </div>
                        
                        <!-- Categories Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {#each categories as category, index}
                                <div class="p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:bg-slate-700/50 transition-all duration-300 group">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 class="text-white font-medium">{category.name}</h4>
                                        <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                on:click={() => editCategory(category)}
                                                class="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                                                title="Edit category"
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </button>
                                            <button 
                                                on:click={() => deleteCategory(category.id)}
                                                class="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Delete category"
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <p class="text-gray-400 text-sm mb-3">{category.description || 'No description'}</p>
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg">{category.english_name || category.name}</span>
                                        <span class="text-xs text-gray-500">Used in {category.file_count || 0} files</span>
                                    </div>
                                </div>
                            {:else}
                                <div class="col-span-full text-center py-12">
                                    <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                    </svg>
                                    <p class="text-gray-400 text-lg">No categories found</p>
                                    <p class="text-gray-500 text-sm mt-1">Create your first category to organize exam content</p>
                                    <button
                                        on:click={() => showCategoryModal = true}
                                        class="mt-4 px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                                    >
                                        Create Category
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Category Statistics -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-lg font-semibold text-gray-200">Total Categories</h4>
                                <svg class="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                </svg>
                            </div>
                            <p class="text-3xl font-bold text-white">{categories?.length || 0}</p>
                            <p class="text-gray-400 text-sm mt-2">Available categories</p>
                        </div>

                        <div class="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-lg font-semibold text-gray-200">Most Used</h4>
                                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                            <p class="text-3xl font-bold text-white">{Math.max(...categories.map(c => c.file_count || 0), 0)}</p>
                            <p class="text-gray-400 text-sm mt-2">Files in top category</p>
                        </div>

                        <div class="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-lg font-semibold text-gray-200">Unused Categories</h4>
                                <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                </svg>
                            </div>
                            <p class="text-3xl font-bold text-white">{categories.filter(c => (c.file_count || 0) === 0).length}</p>
                            <p class="text-gray-400 text-sm mt-2">Categories without files</p>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Users Tab -->
            {#if activeTab === 'users'}
                <div class="p-6 bg-slate-800/10 backdrop-blur-lg">
                    <div class="pt-6 border-t border-gray-700/50">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h3 class="text-sm font-semibold text-gray-400">View Options</h3>
                        <div class="flex items-center space-x-3">
                            <label class="flex items-center space-x-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    bind:checked={enableInfiniteScroll}
                                    class="h-4 w-4 text-blue-600 border-gray-600 bg-slate-700 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span>Infinite Scroll</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Search and Filters -->
                    <div class="mb-8 flex flex-col lg:flex-row gap-4">
                        <div class="flex-1">
                            <label for="search" class="sr-only">Search users</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                    </svg>
                                </div>
                                <input
                                    id="search"
                                    bind:value={userSearch}
                                    on:input={debounceSearch}
                                    type="text"
                                    placeholder="Search by email, username, or full name..."
                                    class="block w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-700/70 backdrop-blur-sm"
                                />
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <select
                                bind:value={userRoleFilter}
                                on:change={handleRoleFilter}
                                class="px-4 py-3 bg-slate-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-slate-700/70 transition-all duration-300 backdrop-blur-sm"
                            >
                                <option value="">All Roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="staff">Staff</option>
                                <option value="seller">Seller</option>
                            </select>
                            <button
                                on:click={loadUsers}
                                class="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-gray-600/50 text-gray-300 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                                title="Refresh users"
                                aria-label="Refresh users list"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Enhanced Bulk Actions -->
                    {#if selectedUsers.length > 0}
                        <div class="mb-6 p-4 bg-blue-900/20 backdrop-blur-lg rounded-2xl border border-blue-500/30 shadow-lg">
                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <span class="text-sm font-semibold text-blue-200">
                                            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                                        </span>
                                        <p class="text-xs text-blue-300 mt-1">Choose an action to apply to selected users</p>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <select
                                        bind:value={bulkAction}
                                        class="text-sm border border-blue-500/30 bg-slate-700/50 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                                    >
                                        <option value="">Select Action</option>
                                        <option value="user">Set as User</option>
                                        <option value="staff">Set as Staff</option>
                                        <option value="admin">Set as Admin</option>
                                        <option value="seller">Set as Seller</option>
                                    </select>
                                    <button
                                        on:click={bulkUpdateUserRoles}
                                        disabled={!bulkAction}
                                        class="text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                                    >
                                        Update Roles
                                    </button>
                                    <button
                                        on:click={bulkDeleteUsers}
                                        class="text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                                    >
                                        Delete Users
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <!-- Enhanced Users Table with Infinite Scroll Container -->
                    <div class="{enableInfiniteScroll ? 'max-h-96 overflow-y-auto' : ''}" on:scroll={enableInfiniteScroll ? handleScroll : undefined}>
                        {#if skeletonLoading}
                            <div class="overflow-hidden shadow-xl ring-1 ring-slate-700/50 rounded-2xl backdrop-blur-lg">
                                <table class="min-w-full divide-y divide-slate-700/50">
                                    <thead class="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-lg">
                                        <tr>
                                            <th class="w-8 px-6 py-4">
                                                <div class="w-4 h-4 bg-slate-600/50 rounded animate-pulse"></div>
                                            </th>
                                            <th class="min-w-[12rem] py-4 pl-4 pr-3 text-left text-sm font-semibold text-gray-200">
                                                User Information
                                            </th>
                                            <th class="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                                                Role & Status
                                            </th>
                                            <th class="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                                                Creation Date
                                            </th>
                                            <th class="px-3 py-4 text-center text-sm font-semibold text-gray-200">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-700/50 bg-slate-800/30 backdrop-blur-lg">
                                        {#each Array.from({length: 8}) as _, i}
                                            <tr class="animate-pulse">
                                                <td class="px-6 py-4">
                                                    <div class="w-4 h-4 bg-slate-600/50 rounded"></div>
                                                </td>
                                                <td class="py-4 pl-4 pr-3">
                                                    <div class="flex items-center">
                                                        <div class="h-12 w-12 bg-slate-600/50 rounded-full"></div>
                                                        <div class="ml-4 space-y-2">
                                                            <div class="h-4 bg-slate-600/50 rounded w-24"></div>
                                                            <div class="h-3 bg-slate-700/50 rounded w-32"></div>
                                                            <div class="h-3 bg-slate-700/50 rounded w-20"></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-4">
                                                    <div class="h-6 bg-slate-600/50 rounded-full w-16"></div>
                                                </td>
                                                <td class="px-3 py-4">
                                                    <div class="space-y-1">
                                                        <div class="h-4 bg-slate-600/50 rounded w-20"></div>
                                                        <div class="h-3 bg-slate-700/50 rounded w-16"></div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-4">
                                                    <div class="flex justify-center gap-2">
                                                        <div class="h-8 bg-slate-600/50 rounded w-16"></div>
                                                        <div class="h-8 bg-slate-600/50 rounded w-20"></div>
                                                        <div class="h-8 bg-slate-600/50 rounded w-16"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {:else if users.length > 0}
                            <div class="overflow-hidden shadow-xl ring-1 ring-slate-700/50 rounded-2xl backdrop-blur-lg">
                                <table class="min-w-full divide-y divide-slate-700/50">
                                    <thead class="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-lg">
                                        <tr>
                                            <th scope="col" class="relative px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.length === users.length && users.length > 0}
                                                    on:change={selectAllUsers}
                                                    class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                                />
                                            </th>
                                            <th scope="col" class="min-w-[12rem] py-4 pl-4 pr-3 text-left">
                                                <button
                                                    on:click={() => sortUsers('full_name')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                    </svg>
                                                    User Information
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {userSortBy === 'full_name' ? (userSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left">
                                                <button
                                                    on:click={() => sortUsers('roles')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                                    </svg>
                                                    Role & Status
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {userSortBy === 'roles' ? (userSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left">
                                                <button
                                                    on:click={() => sortUsers('created_at')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    Creation Date
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {userSortBy === 'created_at' ? (userSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-center">
                                                <div class="flex items-center justify-center space-x-1">
                                                    <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                    </svg>
                                                    <span class="text-sm font-semibold text-gray-200">Actions</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                <tbody class="divide-y divide-slate-700/50 bg-slate-800/30 backdrop-blur-lg">
                                    {#each users as user (user.id)}
                                        <tr class="hover:bg-slate-700/30 transition-colors duration-150">
                                            <td class="relative px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    on:change={() => toggleUserSelection(user.id)}
                                                    class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                                />
                                            </td>
                                            <td class="py-4 pl-4 pr-3 text-sm">
                                                <div class="flex items-center">
                                                    <div class="h-12 w-12 flex-shrink-0">
                                                        <img class="h-12 w-12 rounded-full object-cover ring-2 ring-gray-600" src={user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`} alt={user.full_name} />
                                                    </div>
                                                    <div class="ml-4">
                                                        <div class="font-semibold text-gray-200">{user.full_name}</div>
                                                        <div class="text-gray-400 text-sm">{user.email}</div>
                                                        <div class="text-gray-500 text-xs">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-3 py-4 text-sm">
                                                <div class="flex flex-wrap gap-2">
                                                    {#each user.roles as role}
                                                        <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-sm {getRoleColor(role)}">
                                                            {role}
                                                        </span>
                                                    {/each}
                                                </div>
                                            </td>
                                            <td class="px-3 py-4 text-sm text-gray-400">
                                                <div class="flex flex-col">
                                                    <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                                                    <span class="text-xs text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleTimeString() : ''}</span>
                                                </div>
                                            </td>
                                            <td class="px-3 py-4 text-sm font-medium">
                                                <div class="flex items-center justify-center gap-2">
                                                    <button
                                                        on:click={() => openUserModal(user)}
                                                        class="inline-flex items-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-3 py-2 rounded-xl transition-all duration-300 space-x-1 text-sm font-medium backdrop-blur-sm"
                                                    >
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                        </svg>
                                                        <span>Edit</span>
                                                    </button>
                                                    <select
                                                        on:change={(e) => {
                                                            const target = e.target as HTMLSelectElement;
                                                            if (target.value) {
                                                                updateUserRole(user.id, target.value);
                                                                target.value = ''; // Reset selection
                                                            }
                                                        }}
                                                        class="text-xs border border-gray-600/50 bg-slate-700/50 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                                                    >
                                                        <option value="">Change Role</option>
                                                        <option value="user">User</option>
                                                        <option value="staff">Staff</option>
                                                        <option value="admin">Admin</option>
                                                        <option value="seller">Seller</option>
                                                    </select>
                                                    <button
                                                        on:click={() => deleteUser(user.id)}
                                                        class="inline-flex items-center text-red-400 hover:text-red-300 hover:bg-red-500/20 px-3 py-2 rounded-xl transition-all duration-300 space-x-1 text-sm font-medium backdrop-blur-sm"
                                                    >
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                        </svg>
                                                        <span>{$t('delete')}</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                                </table>
                            </div>
                        {:else}
                            <div class="text-center py-16 bg-slate-800/20 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-700/30">
                                <div class="mx-auto w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mb-6">
                                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-200 mb-2">No users found</h3>
                                <p class="text-gray-400 mb-6">No users match your current search and filter criteria.</p>
                                <button
                                    on:click={() => { userSearch = ''; userRoleFilter = ''; loadUsers(); }}
                                    class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        {/if}
                    </div>

                    <!-- Enhanced Pagination -->
                    {#if !enableInfiniteScroll}
                        <div class="mt-8 flex flex-col sm:flex-row items-center justify-between bg-slate-800/20 backdrop-blur-lg rounded-xl p-4 shadow-sm border border-gray-700/30">
                            <div class="flex items-center text-sm text-gray-300 mb-4 sm:mb-0">
                                <span class="font-medium">Page {userPage} of {totalUserPages || Math.max(1, Math.ceil(users.length / userLimit))}</span>
                                <span class="mx-2 text-gray-500">•</span>
                                <span>{totalUsers || users.length} total users</span>
                                <span class="mx-2 text-gray-500">•</span>
                                <span>{userLimit} per page</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button
                                    on:click={() => goToUserPage(Math.max(1, userPage - 1))}
                                    disabled={userPage === 1}
                                    class="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-gray-600/50 text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm text-sm font-medium"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                    </svg>
                                    <span>Previous</span>
                                </button>
                                <div class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl border border-blue-500/30 shadow-lg backdrop-blur-sm">
                                    {userPage}
                                </div>
                                <button
                                    on:click={() => goToUserPage(userPage + 1)}
                                    disabled={userPage >= (totalUserPages || Math.max(1, Math.ceil(users.length / userLimit)))}
                                    class="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-gray-600/50 text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm text-sm font-medium"
                                >
                                    <span>Next</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    {:else if loadingMore && activeTab === 'users'}
                        <div class="mt-8 flex justify-center">
                            <div class="flex items-center space-x-3 bg-slate-800/20 backdrop-blur-lg rounded-xl p-4 border border-gray-700/30">
                                <div class="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin">
                                    <div class="absolute w-4 h-4 bg-slate-800/50 rounded-full top-1 left-1"></div>
                                </div>
                                <span class="text-gray-300 font-medium">{$t('loadingMoreUsers')}</span>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Enhanced Exam Files Tab -->
            {#if activeTab === 'exam-files'}
                <div class="p-8 bg-slate-800/10 backdrop-blur-lg">
                    <!-- Upload Button Header -->
                    <div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 class="text-2xl font-bold text-gray-200 mb-2">Exam Files Management</h3>
                            <p class="text-gray-400">Upload, organize, and manage exam files for your platform</p>
                        </div>
                        <div class="flex gap-3">
                            <button
                                on:click={loadExamFiles}
                                class="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-gray-600/50"
                                title="Refresh exam files"
                                aria-label="Refresh exam files list"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            </button>
                            <button
                                on:click={testR2Config}
                                class="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-gray-600/50"
                                title="Test R2 storage configuration"
                                aria-label="Test R2 storage configuration"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </button>
                            <button
                                on:click={() => showUploadModal = true}
                                class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                <span>Upload New File</span>
                            </button>
                        </div>
                    </div>

                    <!-- Enhanced Search and Filters for Exam Files -->
                    <div class="mb-8 flex flex-col lg:flex-row gap-4">
                        <div class="flex-1">
                            <label for="exam-file-search" class="sr-only">Search exam files</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                    </svg>
                                </div>
                                <input
                                    id="exam-file-search"
                                    type="text"
                                    bind:value={examFileSearch}
                                    on:input={debounceExamFileSearch}
                                    placeholder="Search by title or description..."
                                    class="block w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-700/70 backdrop-blur-sm"
                                />
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <input
                                type="text"
                                bind:value={examFileTagFilter}
                                on:input={debounceExamFileSearch}
                                placeholder="Filter by tag..."
                                class="px-4 py-3 bg-slate-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-slate-700/70 transition-all duration-300 backdrop-blur-sm"
                            />
                            <button
                                on:click={() => { examFileSearch = ''; examFileTagFilter = ''; loadExamFiles(); }}
                                class="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-gray-600/50 text-gray-300 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                                title="Clear filters"
                                aria-label="Clear exam file filters"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Enhanced Exam Files Table with Skeleton Loading -->
                    <div class="{enableInfiniteScroll ? 'max-h-96 overflow-y-auto' : ''}" on:scroll={enableInfiniteScroll ? handleScroll : undefined}>
                        {#if skeletonLoading}
                            <div class="overflow-hidden shadow-xl ring-1 ring-slate-700/50 rounded-2xl backdrop-blur-lg">
                                <table class="min-w-full divide-y divide-slate-700/50">
                                    <thead class="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-lg">
                                        <tr>
                                            <th scope="col" class="py-4 pl-6 pr-3 text-left text-sm font-semibold text-gray-200">
                                                <div class="flex items-center space-x-2">
                                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                    </svg>
                                                    <span>File Information</span>
                                                </div>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                                                <div class="flex items-center space-x-2">
                                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                                    </svg>
                                                    <span>Tags</span>
                                                </div>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                                                <div class="flex items-center space-x-2">
                                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                    </svg>
                                                    <span>Uploaded By</span>
                                                </div>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left">
                                                <button
                                                    on:click={() => sortExamFiles('created_at')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    Creation Date
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {examFileSortBy === 'created_at' ? (examFileSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-center">
                                                <div class="flex items-center justify-center space-x-1">
                                                    <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                    </svg>
                                                    <span class="text-sm font-semibold text-gray-200">Actions</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-700/50 bg-slate-800/30 backdrop-blur-lg">
                                        {#each Array.from({length: 5}) as _, i}
                                            <tr class="animate-pulse">
                                                <td class="py-6 pl-6 pr-3">
                                                    <div class="flex items-center">
                                                        <div class="w-12 h-12 bg-slate-600/50 rounded-xl"></div>
                                                        <div class="ml-4 space-y-2">
                                                            <div class="h-4 bg-slate-600/50 rounded w-32"></div>
                                                            <div class="h-3 bg-slate-700/50 rounded w-48"></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6">
                                                    <div class="flex gap-2">
                                                        <div class="h-6 bg-slate-600/50 rounded-full w-16"></div>
                                                        <div class="h-6 bg-slate-600/50 rounded-full w-12"></div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6">
                                                    <div class="flex items-center">
                                                        <div class="w-8 h-8 bg-slate-600/50 rounded-full mr-3"></div>
                                                        <div class="h-4 bg-slate-600/50 rounded w-20"></div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6">
                                                    <div class="space-y-1">
                                                        <div class="h-4 bg-slate-600/50 rounded w-20"></div>
                                                        <div class="h-3 bg-slate-700/50 rounded w-16"></div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6">
                                                    <div class="flex justify-center gap-2">
                                                        <div class="h-8 bg-slate-600/50 rounded w-20"></div>
                                                        <div class="h-8 bg-slate-600/50 rounded w-16"></div>
                                                        <div class="h-8 bg-slate-600/50 rounded w-16"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {:else if examFiles.length > 0}
                            <div class="overflow-hidden shadow-xl ring-1 ring-slate-700/50 rounded-2xl backdrop-blur-lg">
                                <table class="min-w-full divide-y divide-slate-700/50">
                                    <thead class="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-lg">
                                        <tr>
                                            <th scope="col" class="py-4 pl-6 pr-3 text-left">
                                                <button
                                                    on:click={() => sortExamFiles('title')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                    aria-label="Sort by file title"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                    </svg>
                                                    File Information
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {examFileSortBy === 'title' ? (examFileSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                                                <div class="flex items-center space-x-2">
                                                    <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                                    </svg>
                                                    <span>Tags</span>
                                                </div>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left">
                                                <button
                                                    on:click={() => sortExamFiles('uploaded_by')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                    </svg>
                                                    Uploaded By
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {examFileSortBy === 'uploaded_by' ? (examFileSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-left">
                                                <button
                                                    on:click={() => sortExamFiles('created_at')}
                                                    class="group inline-flex items-center text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                                                >
                                                    <svg class="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    Creation Date
                                                    <span class="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-300">
                                                        <svg class="h-4 w-4 {examFileSortBy === 'created_at' ? (examFileSortOrder === 'asc' ? 'rotate-0' : 'rotate-180') : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </th>
                                            <th scope="col" class="px-3 py-4 text-center">
                                                <div class="flex items-center justify-center space-x-1">
                                                    <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                    </svg>
                                                    <span class="text-sm font-semibold text-gray-200">Actions</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-700/50 bg-slate-800/30 backdrop-blur-lg">
                                        {#each examFiles as examFile (examFile.id)}
                                            <tr class="hover:bg-slate-700/30 transition-colors duration-150">
                                                <td class="py-6 pl-6 pr-3 text-sm">
                                                    <div class="flex items-center">
                                                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                                                            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                            </svg>
                                                        </div>
                                                        <div class="ml-4">
                                                            <div class="font-semibold text-gray-200 text-base">{examFile.title}</div>
                                                            <div class="text-gray-400 text-sm mt-1">{examFile.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6 text-sm">
                                                    <div class="flex flex-wrap gap-2">
                                                        {#each examFile.tags as tag}
                                                            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gradient-to-r from-gray-600/50 to-gray-700/50 text-gray-300 shadow-sm border border-gray-600/50">
                                                                {tag}
                                                            </span>
                                                        {/each}
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6 text-sm">
                                                    <div class="flex items-center">
                                                        <div class="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mr-3 border border-green-500/30">
                                                            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                            </svg>
                                                        </div>
                                                        <span class="text-gray-300 font-medium">{examFile.uploaded_by}</span>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6 text-sm text-gray-400">
                                                    <div class="flex flex-col">
                                                        <span>{examFile.created_at ? new Date(examFile.created_at).toLocaleDateString() : 'N/A'}</span>
                                                        <span class="text-xs text-gray-500">{examFile.created_at ? new Date(examFile.created_at).toLocaleTimeString() : ''}</span>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-6 text-sm font-medium">
                                                    <div class="flex items-center justify-center gap-2">
                                                        <a
                                                            href={examFile.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            class="inline-flex items-center px-3 py-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-xl transition-all duration-300 space-x-1 text-sm font-medium backdrop-blur-sm"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                            </svg>
                                                            <span>Download</span>
                                                        </a>
                                                        <button
                                                            on:click={() => openExamFileModal(examFile)}
                                                            class="inline-flex items-center px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-xl transition-all duration-300 space-x-1 text-sm font-medium backdrop-blur-sm"
                                                            aria-label="Edit exam file"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                            </svg>
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            on:click={() => deleteExamFile(examFile.id)}
                                                            class="inline-flex items-center px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all duration-300 space-x-1 text-sm font-medium backdrop-blur-sm"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                            </svg>
                                                            <span>{$t('delete')}</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {:else}
                            <div class="text-center py-16 bg-slate-800/20 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-700/30">
                                <div class="mx-auto w-24 h-24 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                                    <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-200 mb-2">No exam files yet</h3>
                                <p class="text-gray-400 mb-8">Get started by uploading your first exam file to help students prepare for their exams.</p>
                                <button
                                    on:click={() => showUploadModal = true}
                                    class="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm space-x-3"
                                >
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                    <span class="font-semibold">Upload Your First File</span>
                                </button>
                            </div>
                        {/if}
                    </div>

                    <!-- Enhanced Pagination for Exam Files -->
                    {#if !enableInfiniteScroll}
                        <div class="mt-8 flex flex-col sm:flex-row items-center justify-between bg-slate-800/20 backdrop-blur-lg rounded-xl p-4 shadow-sm border border-gray-700/30">
                            <div class="flex items-center text-sm text-gray-300 mb-4 sm:mb-0">
                                <span class="font-medium">Page {examFilePage} of {totalExamFilePages || Math.max(1, Math.ceil(examFiles.length / examFileLimit))}</span>
                                <span class="mx-2 text-gray-500">•</span>
                                <span>{totalExamFiles || examFiles.length} total files</span>
                                <span class="mx-2 text-gray-500">•</span>
                                <span>{examFileLimit} per page</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button
                                    on:click={() => goToExamFilePage(Math.max(1, examFilePage - 1))}
                                    disabled={examFilePage === 1}
                                    class="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-gray-600/50 text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm text-sm font-medium"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                    </svg>
                                    <span>Previous</span>
                                </button>
                                <div class="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl border border-green-500/30 shadow-lg backdrop-blur-sm">
                                    {examFilePage}
                                </div>
                                <button
                                    on:click={() => goToExamFilePage(examFilePage + 1)}
                                    disabled={examFilePage >= (totalExamFilePages || Math.max(1, Math.ceil(examFiles.length / examFileLimit)))}
                                    class="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 border border-gray-600/50 text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm text-sm font-medium"
                                >
                                    <span>Next</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    {:else if loadingMore && activeTab === 'exam-files'}
                        <div class="mt-8 flex justify-center">
                            <div class="flex items-center space-x-3 bg-slate-800/20 backdrop-blur-lg rounded-xl p-4 border border-gray-700/30">
                                <div class="w-6 h-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full animate-spin">
                                    <div class="absolute w-4 h-4 bg-slate-800/50 rounded-full top-1 left-1"></div>
                                </div>
                                <span class="text-gray-300 font-medium">Loading more files...</span>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Content Moderation Tab -->
            {#if activeTab === 'moderation'}
                <div class="p-8 bg-slate-800/10 backdrop-blur-lg">
                    <div class="mb-8">
                        <h3 class="text-2xl font-bold text-gray-200 mb-2">Content Moderation</h3>
                        <p class="text-gray-400">Review and moderate content before it goes live</p>
                    </div>

                    <!-- Pending Content Queue -->
                    <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl overflow-hidden">
                        <div class="p-6 border-b border-gray-700/30">
                            <h4 class="text-lg font-semibold text-gray-200 flex items-center">
                                <svg class="w-5 h-5 text-amber-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Pending Review ({pendingContent.length})
                            </h4>
                        </div>

                        {#if pendingContent.length > 0}
                            <div class="divide-y divide-gray-700/30">
                                {#each pendingContent as content}
                                    <div class="p-6 hover:bg-slate-700/20 transition-colors">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <div class="flex items-center mb-2">
                                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {content.type === 'exam_file' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}">
                                                        {content.type === 'exam_file' ? 'Exam File' : 'Flashcard Set'}
                                                    </span>
                                                    <span class="ml-3 text-gray-400 text-sm">
                                                        Submitted {content.created_at ? new Date(content.created_at).toLocaleDateString() : 'Recently'}
                                                    </span>
                                                </div>
                                                <h5 class="text-lg font-semibold text-gray-200 mb-2">{content.title}</h5>
                                                <p class="text-gray-400 mb-3">{content.description}</p>
                                                <div class="flex items-center text-sm text-gray-300">
                                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                    </svg>
                                                    by {content.uploaded_by}
                                                    {#if content.tags && content.tags.length > 0}
                                                        <span class="ml-4 flex items-center">
                                                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                                            </svg>
                                                            {content.tags.join(', ')}
                                                        </span>
                                                    {/if}
                                                </div>
                                            </div>
                                            <div class="flex items-center space-x-3 ml-4">
                                                {#if content.url}
                                                    <a
                                                        href={content.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="inline-flex items-center px-4 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-xl transition-all duration-300 text-sm"
                                                    >
                                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                                        </svg>
                                                        Preview
                                                    </a>
                                                {/if}
                                                <button
                                                    on:click={() => approveContent(content.id, content.type)}
                                                    class="inline-flex items-center px-4 py-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-xl transition-all duration-300 text-sm font-medium"
                                                >
                                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                                    </svg>
                                                    Approve
                                                </button>
                                                <button
                                                    on:click={() => {
                                                        const reason = prompt('Reason for rejection (optional):');
                                                        if (reason !== null) {
                                                            rejectContent(content.id, content.type, reason);
                                                        }
                                                    }}
                                                    class="inline-flex items-center px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all duration-300 text-sm font-medium"
                                                >
                                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                                    </svg>
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="text-center py-16">
                                <div class="mx-auto w-24 h-24 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                                    <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-200 mb-2">All caught up!</h3>
                                <p class="text-gray-400">No content pending review at the moment.</p>
                            </div>
                        {/if}
                    </div>

                    <!-- Moderation Statistics -->
                    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Approved Today</p>
                                    <p class="text-2xl font-bold text-white">0</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Rejected Today</p>
                                    <p class="text-2xl font-bold text-white">0</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Avg Review Time</p>
                                    <p class="text-2xl font-bold text-white">~2h</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Analytics Tab -->
            {#if activeTab === 'analytics'}
                <div class="p-8 bg-slate-800/10 backdrop-blur-lg">
                    <div class="mb-8">
                        <h3 class="text-2xl font-bold text-gray-200 mb-2">Analytics & Reports</h3>
                        <p class="text-gray-400">Detailed insights into platform performance and growth</p>
                    </div>

                    <!-- Analytics Grid -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <!-- Revenue Chart Placeholder -->
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                                <svg class="w-5 h-5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Revenue Trends
                            </h4>
                            <div class="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
                                <div class="text-center">
                                    <svg class="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                    </svg>
                                    <p class="text-gray-400">Chart component would go here</p>
                                    <p class="text-sm text-gray-500 mt-1">Total Revenue: ฿{(stats?.analytics?.total_revenue || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Growth Chart Placeholder -->
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                                <svg class="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                User Growth
                            </h4>
                            <div class="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
                                <div class="text-center">
                                    <svg class="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                    </svg>
                                    <p class="text-gray-400">Growth chart would go here</p>
                                    <p class="text-sm text-gray-500 mt-1">Monthly Growth: {stats?.analytics?.monthly_growth || 0}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Analytics Summary -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Page Views Today</p>
                                    <p class="text-2xl font-bold text-white">1,234</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Active Users</p>
                                    <p class="text-2xl font-bold text-white">{stats?.analytics?.active_users_today || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Downloads Today</p>
                                    <p class="text-2xl font-bold text-white">89</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                    <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-300">Revenue Today</p>
                                    <p class="text-2xl font-bold text-white">฿456</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- System Management Tab -->
            {#if activeTab === 'system'}
                <div class="p-8 bg-slate-800/10 backdrop-blur-lg">
                    <div class="mb-8">
                        <h3 class="text-2xl font-bold text-gray-200 mb-2">System Management</h3>
                        <p class="text-gray-400">Configure system features and manage platform settings</p>
                    </div>

                    <!-- Feature Management -->
                    <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl overflow-hidden mb-8">
                        <div class="p-6 border-b border-gray-700/30">
                            <h4 class="text-lg font-semibold text-gray-200 flex items-center">
                                <svg class="w-5 h-5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                Feature Toggles
                            </h4>
                        </div>

                        {#if systemFeatures.length > 0}
                            <div class="divide-y divide-gray-700/30">
                                {#each systemFeatures as feature}
                                    <div class="p-6 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                                        <div class="flex-1">
                                            <h5 class="text-lg font-semibold text-gray-200">{feature.name}</h5>
                                            <p class="text-gray-400 mt-1">{feature.description}</p>
                                            {#if feature.category}
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-600/30 text-gray-300 mt-2">
                                                    {feature.category}
                                                </span>
                                            {/if}
                                        </div>
                                        <div class="ml-6">
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={feature.enabled}
                                                    on:change={(e) => toggleSystemFeature(feature.key, (e.target as HTMLInputElement).checked)}
                                                    class="sr-only peer"
                                                />
                                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="text-center py-16">
                                <div class="mx-auto w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mb-6">
                                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-200 mb-2">No feature toggles available</h3>
                                <p class="text-gray-400">System features will appear here when configured.</p>
                            </div>
                        {/if}
                    </div>

                    <!-- System Status -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h5 class="text-lg font-semibold text-gray-200">Database Status</h5>
                                <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <p class="text-green-400 font-semibold">Operational</p>
                            <p class="text-gray-400 text-sm mt-1">All database operations are running normally</p>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h5 class="text-lg font-semibold text-gray-200">File Storage</h5>
                                <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <p class="text-green-400 font-semibold">Operational</p>
                            <p class="text-gray-400 text-sm mt-1">R2 storage is accessible and functioning</p>
                        </div>

                        <div class="bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h5 class="text-lg font-semibold text-gray-200">API Services</h5>
                                <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <p class="text-green-400 font-semibold">Operational</p>
                            <p class="text-gray-400 text-sm mt-1">All API endpoints are responding normally</p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

<!-- Enhanced User Edit Modal -->
{#if showUserModal && editingUser}
    <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div class="relative bg-slate-800/95 backdrop-blur-lg border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-200">Edit User Profile</h3>
                            <p class="text-sm text-gray-400">Update user information</p>
                        </div>
                    </div>
                    <button
                        on:click={() => showUserModal = false}
                        class="text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 p-2 rounded-lg transition-all duration-200"
                        aria-label="Close user edit modal"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form on:submit|preventDefault={updateUserProfile} class="space-y-4">
                    <div>
                        <label for="full_name" class="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                        <input
                            id="full_name"
                            type="text"
                            bind:value={userForm.full_name}
                            class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter full name"
                        />
                    </div>
                    <div>
                        <label for="bio" class="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                        <textarea
                            id="bio"
                            bind:value={userForm.bio}
                            rows="3"
                            class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Tell us about yourself..."
                        ></textarea>
                    </div>
                    <div>
                        <label for="profile_image" class="block text-sm font-medium text-gray-300 mb-2">Profile Image URL</label>
                        <input
                            id="profile_image"
                            type="url"
                            bind:value={userForm.profile_image}
                            class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button
                            type="submit"
                            class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            on:click={() => showUserModal = false}
                            class="flex-1 bg-gray-700/50 text-gray-300 py-3 px-4 rounded-xl hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}

<!-- Enhanced Exam File Edit Modal -->
{#if showExamFileModal && editingExamFile}
    <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div class="relative bg-slate-800/95 backdrop-blur-lg border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-200">Edit Exam File</h3>
                            <p class="text-sm text-gray-400">Update file information</p>
                        </div>
                    </div>
                    <button
                        on:click={() => showExamFileModal = false}
                        class="text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 p-2 rounded-lg transition-all duration-200"
                        aria-label="Close exam file edit modal"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form on:submit|preventDefault={updateExamFile} class="space-y-4">
                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <input
                            id="title"
                            type="text"
                            bind:value={examFileForm.title}
                            class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter file title"
                        />
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                            id="description"
                            bind:value={examFileForm.description}
                            rows="3"
                            class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="Describe the exam file..."
                        ></textarea>
                    </div>
                    <div>
                        <label for="tags" class="block text-sm font-medium text-gray-300 mb-2">Tags (comma separated)</label>
                        <input
                            id="tags"
                            type="text"
                            bind:value={examFileForm.tags}
                            placeholder="math, grade10, final"
                            class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        />
                        <p class="text-xs text-gray-400 mt-1">Separate tags with commas</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="essay_count" class="block text-sm font-medium text-gray-300 mb-2">Essay Questions</label>
                            <input
                                id="essay_count"
                                type="number"
                                min="0"
                                bind:value={examFileForm.essay_count}
                                class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label for="choice_count" class="block text-sm font-medium text-gray-300 mb-2">Multiple Choice</label>
                            <input
                                id="choice_count"
                                type="number"
                                min="0"
                                bind:value={examFileForm.choice_count}
                                class="w-full px-4 py-3 border border-gray-600/50 bg-slate-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button
                            type="submit"
                            class="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            on:click={() => showExamFileModal = false}
                            class="flex-1 bg-gray-700/50 text-gray-300 py-3 px-4 rounded-xl hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}

<!-- Enhanced File Upload Modal -->
<ExamUploadModal 
    bind:showModal={showUploadModal}
    {categories}
    onClose={closeUploadModal}
    onSuccess={handleExamUploadSuccess}
/>

{#if loading}
    <div class="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="glass-card bg-slate-800/20 backdrop-blur-lg border border-gray-700/30 rounded-2xl p-8 flex flex-col items-center shadow-2xl">
            <div class="relative">
                <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin">
                    <div class="absolute top-1 left-1 w-14 h-14 bg-slate-800/50 rounded-full backdrop-blur-sm"></div>
                </div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
            </div>
            <div class="mt-6 text-center">
                <h3 class="text-lg font-semibold text-white mb-2">{$t('loadingAdminDashboard')}</h3>
                <p class="text-gray-300">Please wait while we fetch the latest data...</p>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Custom animation keyframes for the admin dashboard */
    @keyframes float-gentle {
        0%, 100% { 
            transform: translateY(0px) translateX(0px); 
            opacity: 0.3;
        }
        25% { 
            transform: translateY(-6px) translateX(2px); 
            opacity: 0.5;
        }
        50% { 
            transform: translateY(-12px) translateX(-1px); 
            opacity: 0.7;
        }
        75% { 
            transform: translateY(-6px) translateX(1px); 
            opacity: 0.5;
        }
    }
    
    @keyframes float {
        0%, 100% { 
            transform: translateY(0px); 
        }
        50% { 
            transform: translateY(-8px); 
        }
    }

    @keyframes glow {
        0%, 100% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); 
        }
        50% { 
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); 
        }
    }

    .animate-float-gentle {
        animation: float-gentle 6s ease-in-out infinite;
    }

    .animate-float {
        animation: float 4s ease-in-out infinite;
    }

    .animate-glow {
        animation: glow 2s ease-in-out infinite;
    }

    /* Glassmorphism effects for the admin dashboard */
    .glass-card {
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    /* Custom scrollbar for dark theme */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: rgba(51, 65, 85, 0.3);
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.5);
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.7);
    }

    /* Enhanced focus states for accessibility */
    .focus-ring:focus {
        outline: 2px solid rgba(59, 130, 246, 0.6);
        outline-offset: 2px;
    }

    /* Smooth transitions for all interactive elements */
    button, select, input {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Loading spinner animation */
    .animate-spin-slow {
        animation: spin 3s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* Dark theme select option styling */
    select option {
        background-color: rgb(51, 65, 85);
        color: white;
    }

    /* Enhanced backdrop blur support */
    @supports not (backdrop-filter: blur(16px)) {
        .glass-card {
            background-color: rgba(51, 65, 85, 0.8);
        }
    }
</style>