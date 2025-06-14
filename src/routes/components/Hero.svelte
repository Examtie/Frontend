<script lang="ts">
	// Subject grid data matching Figma design
	const subjects = [
		{ id: 'math1', name: '🔢 Math', position: 'top-left' },
		{ id: 'math2', name: '🔢 Math', position: 'top-center' },
		{ id: 'math3', name: '🔢 Math', position: 'top-right' },
		{ id: 'math4', name: '🔢 Math', position: 'bottom-right' },
		{ id: 'math5', name: '🔢 Math', position: 'middle-center' },
		{ id: 'math6', name: '🔢 Math', position: 'bottom-center' },
		{ id: 'math7', name: '🔢 Math', position: 'bottom-left' },
		{ id: 'math8', name: '🔢 Math', position: 'middle-left' },
	];
</script>

<!-- Hero section matching Figma design -->
<section class="relative bg-gradient-to-br from-indigo-800 via-purple-700 to-purple-800 min-h-[420px] overflow-hidden">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[420px] items-center">
			<!-- Left side - Large ExamTie title and book -->
			<div class="relative flex flex-col justify-center">
				<!-- Book illustration on the left -->
				<div class="absolute -left-12 top-16 lg:block hidden">
					<div class="w-48 h-48 bg-gradient-to-br from-green-400 to-green-500 rounded-3xl shadow-2xl transform -rotate-12 relative">
						<!-- Book pages effect -->
						<div class="absolute top-2 right-2 w-44 h-44 bg-white rounded-2xl shadow-lg"></div>
						<div class="absolute top-4 right-4 w-40 h-40 bg-green-50 rounded-xl"></div>
					</div>
				</div>

				<!-- Large ExamTie title -->
				<div class="relative z-10 mt-8 lg:mt-0">
					<h1 class="text-6xl lg:text-7xl font-bold text-blue-200 mb-6 tracking-tight">
						Examtie
					</h1>
					<p class="text-lg text-pink-200 max-w-md leading-relaxed">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim aeque doleamus animo, cum corpore dolemus, fieri.
					</p>
				</div>

				<!-- Subject grid overlapping the text area -->
				<div class="absolute right-0 top-0 lg:block hidden">
					<div class="grid grid-cols-2 gap-3 w-48">
						{#each subjects.slice(0, 4) as subject}
							<div class="bg-white/10 backdrop-blur-sm text-white text-lg font-medium px-4 py-3 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
								{subject.name}
							</div>
						{/each}
					</div>
					<div class="grid grid-cols-2 gap-3 w-48 mt-3">
						{#each subjects.slice(4, 8) as subject}
							<div class="bg-white/10 backdrop-blur-sm text-white text-lg font-medium px-4 py-3 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
								{subject.name}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Right side - Quiz preview -->
			<div class="lg:block hidden">
				<!-- This will be populated by the quiz demo section -->
			</div>
		</div>

		<!-- Bottom action buttons -->
		<div class="absolute bottom-8 left-4 lg:left-8 flex gap-4">
			<button class="flex items-center bg-blue-500/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-blue-500 transition-colors shadow-lg">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
				</svg>
				Login
			</button>
			<button class="flex items-center bg-blue-600/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-lg">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
				</svg>
				Exams
			</button>
		</div>
	</div>

	<!-- Mobile subject grid -->
	<div class="lg:hidden mt-8 px-4">
		<div class="grid grid-cols-2 gap-3">
			{#each subjects.slice(0, 6) as subject}
				<div class="bg-white/10 backdrop-blur-sm text-white text-base font-medium px-3 py-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-center">
					{subject.name}
				</div>
			{/each}
		</div>
	</div>
</section>
