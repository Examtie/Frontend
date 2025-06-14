<!-- QuizSection.svelte - Quiz interface component based on Figma design -->
<script lang="ts">
	interface Option {
		id: string;
		text: string;
		selected?: boolean;
	}

	interface QuizSectionProps {
		title: string;
		question: string;
		options: Option[];
		currentQuestion: number;
		totalQuestions: number;
		subject: string;
		emoji: string;
		onAnswerSelect?: (optionId: string) => void;
		onNext?: () => void;
		onPrevious?: () => void;
		class?: string;
	}

	let {
		title,
		question,
		options,
		currentQuestion,
		totalQuestions,
		subject,
		emoji,
		onAnswerSelect = () => {},
		onNext = () => {},
		onPrevious = () => {},
		class: className = ''
	}: QuizSectionProps = $props();

	function handleOptionSelect(optionId: string) {
		onAnswerSelect(optionId);
	}

	const progress = (currentQuestion / totalQuestions) * 100;
</script>

<div class="max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 {className}">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center space-x-3">
			<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
				<span class="text-white text-xl font-bold">E</span>
			</div>
			<span class="text-2xl font-bold text-slate-900 dark:text-white">Examtie</span>
		</div>
		
		<div class="text-right">
			<div class="text-sm text-slate-600 dark:text-slate-400">
				{currentQuestion} of {totalQuestions}
			</div>
			<div class="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
				<div 
					class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
					style="width: {progress}%"
				></div>
			</div>
		</div>
	</div>

	<!-- Subject Badge -->
	<div class="mb-6">
		<span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
			{emoji} {subject}
		</span>
	</div>

	<!-- Quiz Title -->
	<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">
		{title}
	</h2>

	<!-- Question -->
	<div class="mb-8">
		<p class="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
			{question}
		</p>
	</div>

	<!-- Separator Line -->
	<div class="w-full h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent mb-6"></div>

	<!-- Options -->
	<div class="space-y-3 mb-8">
		{#each options as option, index}
			<button
				onclick={() => handleOptionSelect(option.id)}
				class="w-full p-4 text-left border-2 rounded-xl transition-all duration-200 {option.selected
					? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
					: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
				}"
			>
				<div class="flex items-center space-x-3">
					<div class="flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center font-medium {option.selected
						? 'border-blue-500 bg-blue-500 text-white'
						: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
					}">
						{String.fromCharCode(65 + index)}.
					</div>
					<span class="text-slate-900 dark:text-white flex-1">
						{option.text}
					</span>
				</div>
			</button>
		{/each}
	</div>

	<!-- Navigation Buttons -->
	<div class="flex items-center justify-between">
		<!-- Action Buttons Left -->
		<div class="flex items-center space-x-3">
			<button
				onclick={onPrevious}
				disabled={currentQuestion <= 1}
				class="flex items-center space-x-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				<span>Previous</span>
			</button>

			<button class="flex items-center space-x-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
				</svg>
				<span>Exams</span>
			</button>
		</div>

		<!-- Action Buttons Right -->
		<div class="flex items-center space-x-3">
			<button class="flex items-center space-x-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				<span>Login</span>
			</button>

			<button
				onclick={onNext}
				class="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
			>
				<span>Next</span>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	</div>
</div>
