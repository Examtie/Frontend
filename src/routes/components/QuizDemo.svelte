<script lang="ts">
	let { class: className = '' } = $props();

	// Sample quiz data matching Figma design with better content
	const quizData = {
		title: 'POSN Math 2026',
		question: 'What is the derivative of f(x) = 3x² + 2x - 5 with respect to x?',
		currentQuestion: 1,
		totalQuestions: 30,
		options: [
			{ id: 'a', text: '6x + 2', selected: true },
			{ id: 'b', text: '3x² + 2', selected: false },
			{ id: 'c', text: '6x - 5', selected: false },
			{ id: 'd', text: '3x + 2x - 5', selected: false }
		]
	};

	function handleOptionSelect(optionId: string) {
		quizData.options = quizData.options.map((opt) => ({
			...opt,
			selected: opt.id === optionId
		}));
	}
</script>

<!-- Quiz Demo component with enhanced design -->
<div class="relative mx-auto max-w-2xl {className}">
	<!-- Background glow effect -->
	<div
		class="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl"
	></div>

	<div
		class="relative rounded-2xl border border-white/30 bg-gradient-to-br from-sky-400/20 to-purple-500/20 p-8 shadow-2xl backdrop-blur-xl"
	>
		<!-- Quiz title and progress -->
		<div class="mb-8">
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-emerald-500"
					>
						<svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
					</div>
					<h3 class="text-xl font-bold text-white">{quizData.title}</h3>
				</div>
				<div class="rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
					<span class="text-sm font-bold text-white"
						>{quizData.currentQuestion} / {quizData.totalQuestions}</span
					>
				</div>
			</div>

			<!-- Enhanced progress bar -->
			<div class="relative">
				<div class="h-2 w-full overflow-hidden rounded-full bg-white/20">
					<div
						class="h-full rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-lg transition-all duration-700 ease-out"
						style="width: 15%"
					></div>
				</div>
				<div
					class="absolute -top-1 left-[15%] h-4 w-4 -translate-x-1/2 transform rounded-full border-2 border-purple-400 bg-white shadow-lg"
				></div>
			</div>
		</div>

		<!-- Question section with better styling -->
		<div class="mb-8">
			<div class="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
				<div class="flex items-start space-x-3">
					<div
						class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-white"
					>
						Q
					</div>
					<p class="text-lg font-medium leading-relaxed text-white">
						{quizData.question}
					</p>
				</div>
			</div>
		</div>

		<!-- Answer options with enhanced design -->
		<div class="mb-8 space-y-4">
			{#each quizData.options as option, index}
				<button
					class="group w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
					onclick={() => handleOptionSelect(option.id)}
				>
					<div
						class="flex items-center rounded-xl border-2 p-5 transition-all duration-300 {option.selected
							? 'border-white/60 bg-gradient-to-r from-white/20 to-white/10 shadow-xl shadow-white/10'
							: 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/15'}"
					>
						<span
							class="mr-5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold transition-all duration-300 {option.selected
								? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-lg shadow-orange-500/30'
								: 'bg-white/80 text-slate-800 group-hover:scale-110 group-hover:bg-white/90'}"
						>
							{option.id.toUpperCase()}
						</span>
						<span class="flex-1 text-left text-base font-medium text-white">
							{option.text}
						</span>
						{#if option.selected}
							<div
								class="ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500"
							>
								<svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									></path>
								</svg>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Action buttons with improved design -->
		<div class="flex items-center justify-between">
			<button
				class="flex items-center rounded-lg px-6 py-3 text-base font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"
					></path>
				</svg>
				Previous
			</button>
			<div class="flex items-center text-white/70">
				<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<span>2:45 spent</span>
			</div>
			<div class="flex gap-3">
				<button
					class="rounded-lg border border-white/20 bg-white/15 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/25"
				>
					Skip
				</button>
				<button
					class="flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700"
				>
					Next
					<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				</button>
			</div>
		</div>
	</div>
</div>
