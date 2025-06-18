<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
    import Header from '../components/Header.svelte';

	type User = {
		id: string;
		email: string;
		full_name: string;
		username: string;
		roles: string[];
		bio?: string;
		profile_image?: string;
		token?: string;
	};

	type SystemStats = {
		total_users: number;
		total_quizzes: number;
		active_sessions: number;
		total_questions: number;
	};

	type UserDetail = {
		id: string;
		email: string;
		full_name: string;
		username: string;
		roles: string[];
		bio?: string;
		profile_image?: string;
		created_at?: string;
		last_login?: string;
		is_active?: boolean;
	};

	let users: User[] = [];
	let stats: SystemStats | null = null;
	let loading = true;
	let error: string | null = null;
	let selectedUser: UserDetail | null = null;
	let showUserModal = false;
	let showDeleteConfirm = false;
	let showEditUserModal = false;
	let userToDelete: User | null = null;
	let isLoadingUserDetail = false;
	let isUpdatingUser = false;

	// Edit user form
	let editUserForm = {
		full_name: '',
		bio: '',
		profile_image: ''
	};

	// Pagination
	let currentPage = 1;
	let usersPerPage = 10;
	let totalUsers = 0;

	// Search and filters
	let searchTerm = '';
	let roleFilter = 'all';

	// Dashboard tabs
	let activeTab = 'overview';

	onMount(async () => {
		// Check if user is admin
		if (!$auth.isAuthenticated || !$auth.user?.roles.includes('admin')) {
			goto('/');
			return;
		}

		await Promise.all([loadUsers(), loadStats()]);
		loading = false;
	});

	async function loadUsers() {
		try {
			const response = await fetch('https://examtieapi.breadtm.xyz/admin/api/v1/users', {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to load users');
			}

			users = await response.json();
			totalUsers = users.length;
		} catch (err: any) {
			error = err.message;
		}
	}

	async function loadStats() {
		try {
			const response = await fetch('https://examtieapi.breadtm.xyz/admin/api/v1/stats', {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to load stats');
			}

			stats = await response.json();
		} catch (err: any) {
			console.error('Failed to load stats:', err.message);
		}
	}

	async function loadUserDetail(userId: string) {
		isLoadingUserDetail = true;
		try {
			const response = await fetch(`https://examtieapi.breadtm.xyz/admin/api/v1/users/@data?user_id=${userId}`, {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to load user details');
			}

			selectedUser = await response.json();
		} catch (err: any) {
			error = err.message;
		} finally {
			isLoadingUserDetail = false;
		}
	}

	async function updateUserRole(userId: string, newRole: string) {
		try {
			const response = await fetch(`https://examtieapi.breadtm.xyz/admin/api/v1/users/${userId}/role?role=${newRole}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to update user role');
			}

			await loadUsers();
			if (selectedUser && selectedUser.id === userId) {
				await loadUserDetail(userId);
			}

			// If the current user's role was changed, update the auth store
			if ($auth.user && $auth.user.id === userId) {
				auth.updateUserRoles(userId, [newRole]);
			}
		} catch (err: any) {
			error = err.message;
		}
	}

	async function updateUserProfile(userId: string) {
		isUpdatingUser = true;
		try {
			const response = await fetch(`https://examtieapi.breadtm.xyz/admin/api/v1/users/${userId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${$auth.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(editUserForm)
			});

			if (!response.ok) {
				throw new Error('Failed to update user profile');
			}

			await loadUsers();
			await loadUserDetail(userId);
			showEditUserModal = false;
		} catch (err: any) {
			error = err.message;
		} finally {
			isUpdatingUser = false;
		}
	}

	async function deleteUser(userId: string) {
		try {
			const response = await fetch(`https://examtieapi.breadtm.xyz/admin/api/v1/users/${userId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to delete user');
			}

			await loadUsers();
			showDeleteConfirm = false;
			userToDelete = null;
			if (showUserModal) {
				closeUserModal();
			}
		} catch (err: any) {
			error = err.message;
		}
	}

	async function openUserModal(user: User) {
		showUserModal = true;
		await loadUserDetail(user.id);
	}

	function closeUserModal() {
		selectedUser = null;
		showUserModal = false;
	}

	function openEditUserModal() {
		if (selectedUser) {
			editUserForm = {
				full_name: selectedUser.full_name || '',
				bio: selectedUser.bio || '',
				profile_image: selectedUser.profile_image || ''
			};
			showEditUserModal = true;
		}
	}

	function confirmDelete(user: User) {
		userToDelete = user;
		showDeleteConfirm = true;
	}

	function clearError() {
		error = null;
	}

	// Computed properties
	$: filteredUsers = users.filter(user => {
		const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase());
		
		const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
		
		return matchesSearch && matchesRole;
	});

	$: paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
	$: totalPages = Math.ceil(filteredUsers.length / usersPerPage);

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	function prevPage() {
		if (currentPage > 1) currentPage--;
	}

	function getRoleColor(roles: string[]) {
		if (roles.includes('admin')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
		if (roles.includes('staff')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
		return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
	}
</script>

<svelte:head>
	<title>{$t('adminDashboard')} - Examtie</title>
</svelte:head>

<Header></Header>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
	{#if loading}
		<div class="flex items-center justify-center min-h-screen">
			<div class="flex flex-col items-center space-y-4">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				<p class="text-gray-600 dark:text-gray-400">{$t('loadingDashboard')}</p>
			</div>
		</div>
	{:else}
		<!-- Enhanced Header with gradient background -->
		<div class="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-xl">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center py-8">
					<div>
						<h1 class="text-3xl font-bold text-white flex items-center">
							<svg class="w-8 h-8 mr-3 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							{$t('adminDashboard')}
						</h1>
						<p class="text-blue-100 mt-1">{$t('manageUsers')}</p>
					</div>
					<div class="flex items-center space-x-4">
						<button
							on:click={() => { loadUsers(); loadStats(); }}
							class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{$t('refresh')}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Banner -->
		{#if error}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
				<div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<div class="ml-3 flex-1">
							<p class="text-sm text-red-700">{error}</p>
						</div>
						<div class="ml-auto pl-3">
							<button on:click={clearError} class="text-red-400 hover:text-red-600" aria-label="Close error message">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Main Content -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Navigation Tabs -->
			<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-8">
				<div class="border-b border-gray-200 dark:border-slate-700">
					<nav class="flex space-x-8 px-6" aria-label="Tabs">
						<button
							on:click={() => activeTab = 'overview'}
							class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === 'overview' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
						>
							<svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							Overview
						</button>
						<button
							on:click={() => activeTab = 'users'}
							class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === 'users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
						>
							<svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
							</svg>
							{$t('userManagement')}
						</button>
					</nav>
				</div>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'overview'}
				<!-- Stats Cards -->
				{#if stats}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
										</svg>
									</div>
								</div>
								<div class="ml-4">
									<p class="text-sm font-medium text-blue-600 dark:text-blue-400">{$t('totalUsers')}</p>
									<p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total_users.toLocaleString()}</p>
								</div>
							</div>
						</div>

						<div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
									</div>
								</div>
								<div class="ml-4">
									<p class="text-sm font-medium text-green-600 dark:text-green-400">{$t('totalQuizzes')}</p>
									<p class="text-2xl font-bold text-green-900 dark:text-green-100">{stats.total_quizzes.toLocaleString()}</p>
								</div>
							</div>
						</div>

						<div class="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
										</svg>
									</div>
								</div>
								<div class="ml-4">
									<p class="text-sm font-medium text-yellow-600 dark:text-yellow-400">{$t('activeSessions')}</p>
									<p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.active_sessions.toLocaleString()}</p>
								</div>
							</div>
						</div>

						<div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
								</div>
								<div class="ml-4">
									<p class="text-sm font-medium text-purple-600 dark:text-purple-400">{$t('totalQuestions')}</p>
									<p class="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.total_questions.toLocaleString()}</p>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{:else if activeTab === 'users'}
				<!-- User Management Section -->
				<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
					<!-- Search and Filter Header -->
					<div class="p-6 border-b border-gray-200 dark:border-slate-700">
						<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div class="flex-1 max-w-lg">
								<div class="relative">
									<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<input
										bind:value={searchTerm}
										type="text"
										placeholder={$t('searchUsers')}
										class="pl-10 pr-4 py-2.5 w-full border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									/>
								</div>
							</div>
							<div class="flex items-center space-x-3">
								<select
									bind:value={roleFilter}
									class="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
								>
									<option value="all">{$t('allRoles')}</option>
									<option value="admin">Admin</option>
									<option value="staff">Staff</option>
									<option value="user">{$t('user')}</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Users Table -->
					<div class="overflow-hidden">
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
								<thead class="bg-gray-50 dark:bg-slate-800/50">
									<tr>
										<th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
											{$t('user')}
										</th>
										<th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
											Email
										</th>
										<th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
											{$t('role')}
										</th>
										<th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
											{$t('status')}
										</th>
										<th class="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
											{$t('actions')}
										</th>
									</tr>
								</thead>
								<tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
									{#each paginatedUsers as user (user.id)}
										<tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center">
													<div class="flex-shrink-0 h-10 w-10">
														{#if user.profile_image}
															<img src={user.profile_image} alt={user.full_name} class="h-10 w-10 rounded-full object-cover" />
														{:else}
															<div class="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
																<span class="text-white text-sm font-medium">{user.username.charAt(0).toUpperCase()}</span>
															</div>
														{/if}
													</div>
													<div class="ml-4">
														<div class="text-sm font-medium text-gray-900 dark:text-white">
															{user.full_name}
														</div>
														<div class="text-sm text-gray-500 dark:text-gray-400">
															@{user.username}
														</div>
													</div>
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
												{user.email}
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex flex-wrap gap-1">
													{#each user.roles as role}
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getRoleColor(user.roles)}">
															{role}
														</span>
													{/each}
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
													{$t('active')}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
												<div class="flex items-center justify-end space-x-2">
													<button
														on:click={() => openUserModal(user)}
														class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150"
													>
														{$t('view')}
													</button>
													<button
														on:click={() => confirmDelete(user)}
														class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150"
													>
														{$t('delete')}
													</button>
												</div>
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="5" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
												<svg class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
												</svg>
												<p class="mt-4 text-sm">No users found matching your criteria.</p>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Pagination -->
					{#if totalPages > 1}
						<div class="bg-white dark:bg-slate-800 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
							<div class="flex items-center justify-between">
								<div class="text-sm text-gray-700 dark:text-gray-300">
									{$t('showing')} <span class="font-medium">{((currentPage - 1) * usersPerPage) + 1}</span>
									{$t('to')} <span class="font-medium">{Math.min(currentPage * usersPerPage, filteredUsers.length)}</span>
									{$t('of')} <span class="font-medium">{filteredUsers.length}</span> {$t('results')}
								</div>
								<div class="flex items-center space-x-2">
									<button
										on:click={prevPage}
										disabled={currentPage === 1}
										class="relative inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
									>
										{$t('previous')}
									</button>
									<div class="flex space-x-1">
										{#each Array(totalPages) as _, i}
											<button
												on:click={() => currentPage = i + 1}
												class="relative inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-all duration-150 {currentPage === i + 1 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600'}"
											>
												{i + 1}
											</button>
										{/each}
									</div>
									<button
										on:click={nextPage}
										disabled={currentPage === totalPages}
										class="relative inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
									>
										{$t('next')}
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- User Detail Modal -->
{#if showUserModal && selectedUser}
	<div class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				{#if isLoadingUserDetail}
					<div class="flex items-center justify-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<p class="ml-3 text-gray-600 dark:text-gray-400">Loading user details...</p>
					</div>
				{:else}
					<!-- Modal Header -->
					<div class="flex items-center justify-between mb-6">
						<h3 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
							<svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							{$t('userDetails')}
						</h3>					<button 
						on:click={closeUserModal}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
						aria-label="Close modal"
					>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- User Profile Card -->
					<div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6">
						<div class="flex items-start space-x-4">
							<div class="flex-shrink-0">
								{#if selectedUser.profile_image}
									<img src={selectedUser.profile_image} alt={selectedUser.full_name} class="h-20 w-20 rounded-full object-cover ring-4 ring-white dark:ring-slate-700" />
								{:else}
									<div class="h-20 w-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-700">
										<span class="text-white font-bold text-2xl">{selectedUser.full_name.charAt(0).toUpperCase()}</span>
									</div>
								{/if}
							</div>
							<div class="flex-1">
								<h4 class="text-xl font-semibold text-gray-900 dark:text-white">{selectedUser.full_name}</h4>
								<p class="text-blue-600 dark:text-blue-400 font-medium">@{selectedUser.username}</p>
								<p class="text-gray-600 dark:text-gray-400 mt-1">{selectedUser.email}</p>
								<div class="flex flex-wrap gap-2 mt-3">
									{#each selectedUser.roles as role}
										<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getRoleColor(selectedUser.roles)}">
											{role}
										</span>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- User Information -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
								<div class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg">
									{selectedUser.email}
								</div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
								<div class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg">
									@{selectedUser.username}
								</div>
							</div>
						</div>
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
								<div class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg font-mono">
									{selectedUser.id}
								</div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
								<div class="flex items-center">
									<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
										<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
										{$t('active')}
									</span>
								</div>
							</div>
						</div>
					</div>

					{#if selectedUser.bio}
						<div class="mb-6">
							<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
							<div class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 px-4 py-3 rounded-lg">
								{selectedUser.bio}
							</div>
						</div>
					{/if}

					<!-- Role Management -->
					<div class="border-t border-gray-200 dark:border-slate-700 pt-6 mb-6">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
							<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
							{$t('changeRole')}
						</label>
						<select
							on:change={(e) => selectedUser && updateUserRole(selectedUser.id, (e.target as HTMLSelectElement).value)}
							class="block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all duration-200"
						>
							<option value="user" selected={selectedUser.roles.includes('user')}>{$t('user')}</option>
							<option value="staff" selected={selectedUser.roles.includes('staff')}>Staff</option>
							<option value="admin" selected={selectedUser.roles.includes('admin')}>Admin</option>
						</select>
					</div>

					<!-- Action Buttons -->
					<div class="flex justify-between pt-6 border-t border-gray-200 dark:border-slate-700">
						<button
							on:click={() => selectedUser && confirmDelete({ id: selectedUser.id, email: selectedUser.email, full_name: selectedUser.full_name, username: selectedUser.username, roles: selectedUser.roles })}
							class="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 transition-all duration-200"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							{$t('deleteUser')}
						</button>
						<div class="flex space-x-3">
							<button
								on:click={openEditUserModal}
								class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
								Edit Profile
							</button>
							<button
								on:click={closeUserModal}
								class="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
							>
								Close
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Edit User Modal -->
{#if showEditUserModal && selectedUser}
	<div class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" role="dialog" aria-modal="true">
		<div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-xl font-bold text-gray-900 dark:text-white">Edit User Profile</h3>				<button 
					on:click={() => showEditUserModal = false}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
					aria-label="Close edit modal"
				>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form on:submit|preventDefault={() => selectedUser && updateUserProfile(selectedUser.id)} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
						<input
							bind:value={editUserForm.full_name}
							type="text"
							required
							class="block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all duration-200"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
						<textarea
							bind:value={editUserForm.bio}
							rows="3"
							class="block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all duration-200"
							placeholder="Tell us about yourself..."
						></textarea>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Image URL</label>
						<input
							bind:value={editUserForm.profile_image}
							type="url"
							class="block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-all duration-200"
							placeholder="https://example.com/image.jpg"
						/>
					</div>

					<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
						<button
							type="button"
							on:click={() => showEditUserModal = false}
							class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
						>
							{$t('cancel')}
						</button>
						<button
							type="submit"
							disabled={isUpdatingUser}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
						>
							{#if isUpdatingUser}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							{/if}
							Save Changes
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && userToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" role="dialog" aria-modal="true">
		<div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
			<div class="p-6">
				<div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
					<svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.112 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
				</div>
				
				<h3 class="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">{$t('deleteUser')}</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
					{$t('deleteConfirmMessage')}
				</p>
				<p class="text-sm font-medium text-gray-900 dark:text-white text-center mb-6">
					<strong>{userToDelete.full_name}</strong> (@{userToDelete.username})
				</p>
				
				<div class="flex justify-center space-x-4">
					<button
						on:click={() => { showDeleteConfirm = false; userToDelete = null; }}
						class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
					>
						{$t('cancel')}
					</button>
					<button
						on:click={() => userToDelete && deleteUser(userToDelete.id)}
						class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
					>
						{$t('delete')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
