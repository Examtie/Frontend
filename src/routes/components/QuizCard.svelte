<!-- QuizCard.svelte - Reusable quiz card component -->
<script lang="ts">
	interface QuizCardProps {
		title: string;
		description: string;
		questionCount: number;
		subject: string;
		emoji: string;
		difficulty?: 'Easy' | 'Medium' | 'Hard';
		href?: string;
		class?: string;
	}

	let {
		title,
		description,
		questionCount,
		subject,
		emoji,
		difficulty = 'Medium',
		href = '/quiz',
		class: className = ''
	}: QuizCardProps = $props();

	const difficultyColors = {
		Easy: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
		Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
		Hard: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
	};
</script>

<a
	{href}
	class="group block p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] {className}"
>
	<!-- Subject Badge -->
	<div class="flex items-center justify-between mb-4">
		<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
			{emoji} {subject}
		</span>
		<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {difficultyColors[difficulty]}">
			{difficulty}
		</span>
	</div>

	<!-- Title -->
	<h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
		{title}
	</h3>

	<!-- Description -->
	<p class="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
		{description}
	</p>

	<!-- Footer -->
	<div class="flex items-center justify-between">
		<span class="text-sm text-slate-500 dark:text-slate-400">
			{questionCount} questions
		</span>
		<div class="flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
			<span class="text-sm font-medium mr-1">Start Quiz</span>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</div>
	</div>
</a>
