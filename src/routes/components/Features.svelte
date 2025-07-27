<script lang="ts">
	let { class: className = '' } = $props();

	const features = [
		{
			icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
			</svg>`,
			title: 'AI-Powered Analytics',
			description: 'Get detailed insights into your performance with intelligent analytics that identify your strengths and areas for improvement.'
		},
		{
			icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
			</svg>`,
			title: 'Progress Tracking',
			description: 'Monitor your learning journey with comprehensive progress tracking and detailed performance metrics.'
		},
		{
			icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
			</svg>`,
			title: 'Instant Feedback',
			description: 'Receive immediate feedback on your answers with detailed explanations to help you learn from mistakes.'
		},
		{
			icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
			</svg>`,
			title: 'Adaptive Learning',
			description: 'Experience personalized learning paths that adapt to your skill level and learning pace.'
		},
		{
			icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
			</svg>`,
			title: 'Comprehensive Library',
			description: 'Access thousands of questions across multiple subjects and difficulty levels.'
		},
		{
			icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
			</svg>`,
			title: 'Achievement System',
			description: 'Stay motivated with badges, streaks, and achievements as you progress through your studies.'
		}
	];
</script>

<section id="features" class="py-20 bg-white dark:bg-accent-900 {className}">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Section header -->
		<div class="text-center mb-16">
			<h2 class="text-4xl md:text-5xl font-bold text-accent-900 dark:text-white mb-6">
				Why Choose 
				<span class="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
					Examtie
				</span>
			</h2>
			<p class="text-xl text-accent-600 dark:text-accent-300 max-w-3xl mx-auto">
				Our platform combines cutting-edge technology with proven learning methodologies to give you the best exam preparation experience.
			</p>
		</div>

		<!-- Features grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each features as feature, index}
				<div class="group relative p-8 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
					<!-- Icon -->
					<div class="text-blue-500 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
						{@html feature.icon}
					</div>
					
					<!-- Title -->
					<h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
						{feature.title}
					</h3>
					
					<!-- Description -->
					<p class="text-slate-600 dark:text-slate-300 leading-relaxed">
						{feature.description}
					</p>

					<!-- Feature number indicator -->
					<div class="absolute top-4 right-4 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
						{index + 1}
					</div>
				</div>
			{/each}
		</div>

		<!-- Bottom CTA -->
		<div class="text-center mt-16">
			<a href="/signup" class="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
				<span>Get Started Today</span>
				<svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
				</svg>
			</a>
		</div>
	</div>
</section>
