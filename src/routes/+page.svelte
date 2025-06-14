<!-- ExamTie Homepage -->
<script lang="ts">
	import Header from './components/Header.svelte';
	import QuizDemo from './components/QuizDemo.svelte';
	import Footer from './components/Footer.svelte';
	import BackToTop from './components/BackToTop.svelte';
	import { t } from '../lib/i18n.js';
	import { currentLanguage } from '../lib/stores/language.js';

	// Sample quiz data for the preview with better content
	const sampleQuizData = {
		title: "POSN Math 2026",
		currentQuestion: 1,
		totalQuestions: 30,
		questions: [
			{
				question: "What is the derivative of f(x) = 3x² + 2x - 5 with respect to x?",
				options: [
					{ id: 'a', text: "6x + 2", selected: true },
					{ id: 'b', text: "3x² + 2", selected: false },
					{ id: 'c', text: "6x - 5", selected: false },
					{ id: 'd', text: "3x + 2x - 5", selected: false }
				]
			}
		]
	};

	// Academic subject buttons data - simplified names
	const subjects = [
		{ name: "📊 Mathematics", color: "text-blue-300" },
		{ name: "⚗️ Chemistry", color: "text-green-300" },
		{ name: "🚀 Physics", color: "text-purple-300" },
		{ name: "🧬 Biology", color: "text-emerald-300" },
		{ name: "📚 English", color: "text-rose-300" },
		{ name: "🌍 Geography", color: "text-cyan-300" },
		{ name: "📜 History", color: "text-amber-300" },
		{ name: "💻 Computer Science", color: "text-indigo-300" }
	];

	function handleOptionSelect(optionId: string) {
		sampleQuizData.questions[0].options = sampleQuizData.questions[0].options.map(opt => ({
			...opt,
			selected: opt.id === optionId
		}));
	}

	// Testimonials data
	const testimonials = [
		{
			name: "Sarah Chen",
			role: "Medical Student",
			image: "https://images.unsplash.com/photo-1494790108755-2616b332c3c7?w=64&h=64&fit=crop&crop=face",
			content: "ExamTie transformed how I study for my medical exams. The AI-powered feedback helped me identify weak areas I didn't even know I had.",
			rating: 5
		},
		{
			name: "Marcus Johnson",
			role: "Engineering Student",
			image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
			content: "The calculus and physics questions are incredibly comprehensive. I improved my test scores by 20% in just one semester.",
			rating: 5
		},
		{
			name: "Priya Patel",
			role: "High School Senior",
			image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
			content: "Perfect for SAT prep! The explanations are clear and the progress tracking keeps me motivated to study every day.",
			rating: 5
		}
	];

	// Animate numbers function
	function animateNumber(element: HTMLElement, target: number, suffix = '') {
		let current = 0;
		const increment = target / 50;
		const timer = setInterval(() => {
			current += increment;
			if (current >= target) {
				current = target;
				clearInterval(timer);
			}
			element.textContent = Math.floor(current).toLocaleString() + suffix;
		}, 30);
	}

	// Intersection Observer for animations
	let heroSection: HTMLElement;
	let statsSection: HTMLElement;
	
	function handleIntersection(entries: IntersectionObserverEntry[]) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('animate-in');
				
				// Animate stats numbers when they come into view
				if (entry.target === statsSection) {
					const statNumbers = entry.target.querySelectorAll('.stat-number');
					statNumbers.forEach((el, index) => {
						const htmlEl = el as HTMLElement;
						const targets = [50000, 100000, 95, 24];
						const suffixes = ['', '', '%', '/7'];
						setTimeout(() => {
							animateNumber(htmlEl, targets[index], suffixes[index]);
						}, index * 200);
					});
				}
			}
		});
	}

	import { onMount } from 'svelte';
	
	onMount(() => {
		const observer = new IntersectionObserver(handleIntersection, {
			threshold: 0.1,
			rootMargin: '0px 0px -100px 0px'
		});

		if (heroSection) observer.observe(heroSection);
		if (statsSection) observer.observe(statsSection);

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>{$t('pageTitle')}</title>
	<meta name="description" content="{$t('pageDescription')}" />
</svelte:head>

<Header />

<main>
	<!-- Enhanced Hero Section with Green Book -->
	<section bind:this={heroSection} class="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
		<!-- Sophisticated Background -->
		<div class="absolute inset-0">
			<!-- Primary gradient overlay -->
			<div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
			
			<!-- Animated geometric shapes -->
			<div class="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-green-400/10 rounded-full blur-xl animate-float-gentle"></div>
			<div class="absolute top-40 right-16 w-24 h-24 bg-gradient-to-br from-blue-500/25 to-cyan-400/15 rounded-full blur-lg animate-float" style="animation-delay: 1s"></div>
			<div class="absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-400/10 rounded-full blur-md animate-float-gentle" style="animation-delay: 2s"></div>
			
			<!-- Subtle grid pattern -->
			<div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, rgba(34, 197, 94, 0.3) 1px, transparent 0); background-size: 40px 40px;"></div>
		</div>

		<!-- Main Content Container -->
		<div class="relative z-10 min-h-screen flex items-center">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
				<div class="grid lg:grid-cols-2 gap-12 items-center">
					<!-- Left Content -->
					<div class="space-y-8 text-center lg:text-left">
						<!-- Status Badge -->
						<div class="animate-fade-in-up">
							<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-400/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-300 text-sm font-medium">
								<div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
								{$t('heroStatusBadge')}
							</div>
						</div>

						<!-- Main Heading -->
						<div class="animate-fade-in-up delay-200">
							<h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
								{$t('masterYour')}
								<span class="block mt-2 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
									{$t('examsWith')}
								</span>
								<span class="block mt-2 text-slate-200">{$t('examTie')}</span>
							</h1>
							<p class="mt-6 text-xl text-slate-300 leading-relaxed max-w-2xl lg:max-w-none">
								{$t('transformStudy')}
							</p>
						</div>

						<!-- Key Features -->
						<div class="animate-fade-in-up delay-300">
							<div class="flex flex-wrap gap-4 justify-center lg:justify-start">
								<div class="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
									<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
									</svg>
									<span class="text-sm font-medium text-white">{$t('aiPowered')}</span>
								</div>
								<div class="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
									<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
									</svg>
									<span class="text-sm font-medium text-white">{$t('progressTrackingShort')}</span>
								</div>
								<div class="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
									<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
									</svg>
									<span class="text-sm font-medium text-white">{$t('fiveKQuestions')}</span>
								</div>
							</div>
						</div>

						<!-- CTA Buttons -->
						<div class="animate-fade-in-up delay-500">
							<div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<button class="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25">
									<div class="flex items-center justify-center gap-3">
										<svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
										</svg>
										{$t('startLearningNow')}
									</div>
									<div class="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
								</button>
								
								<button class="group px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105">
									<div class="flex items-center justify-center gap-3">
										<svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
										</svg>
										{$t('tryDemo')}
									</div>
								</button>
							</div>
						</div>

						<!-- Stats -->
						<div class="animate-fade-in-up delay-700">
							<div class="grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 pt-8">
								<div class="text-center lg:text-left">
									<div class="text-2xl lg:text-3xl font-bold text-white mb-1">50K+</div>
									<div class="text-sm text-slate-400">{$t('questions')}</div>
								</div>
								<div class="text-center lg:text-left">
									<div class="text-2xl lg:text-3xl font-bold text-white mb-1">95%</div>
									<div class="text-sm text-slate-400">{$t('successRate')}</div>
								</div>
								<div class="text-center lg:text-left">
									<div class="text-2xl lg:text-3xl font-bold text-white mb-1">100K+</div>
									<div class="text-sm text-slate-400">{$t('students')}</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Right Visual -->
					<div class="animate-fade-in-up delay-400 flex justify-center lg:justify-end">
						<div class="relative group">
							<!-- Main Book -->
							<div class="relative transform group-hover:scale-105 transition-transform duration-700">
								<svg class="w-80 sm:w-96 lg:w-[420px] h-auto drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128"><!-- Icon from Noto Emoji by Google Inc - https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE --><path fill="#689F38" d="M106.02 121.68H36.18c-1.66 0-1.26-1.35-1.26-3.01V14.05c0-1.66 1.35-3.01 3.01-3.01h69.36c2.72 0 4.93 2.21 4.93 4.93v99.76c0 3.86-1.83 5.95-6.2 5.95"/><path fill="#94C6D6" d="M18.53 115.14c0 1.94 3.07 3.57 5.01 3.57l80.39-.05c2.98 0 4.54-1.58 4.54-3.52l-.25-21.32H18.53z"/><path fill="#F5F5F5" d="M101.47 105.88s-2.13 5.85.03 8.78c2.51 3.4 6.89 2.58 6.89.99V16.44c0-.66-.61-1.14-1.25-1c-1.39.3-3.89.31-7.21-1.89z"/><path fill="#689F38" d="M94.16 110.85H23.64V6.45h72.25c2.27 0 3.87.61 4.62 1.62c.98 1.31 1.5 3.3 1.5 5.48V103a7.85 7.85 0 0 1-7.85 7.85"/><path fill="#9CCC65" d="M92.01 107.78H25.54c-2.76 0-4.99-2.24-4.99-4.99V11.45c0-2.76 2.24-4.99 4.99-4.99h66.47c3.82 0 6.92 2.18 6.92 6.92v87.49c-.01 3.81-3.1 6.91-6.92 6.91"/><path fill="#616161" d="M34.43 109.75L34.38 6.46h-11.2s-2.31-.4-3.85 0c-2.79.73-3.56 2.76-3.56 6.07v94.41c0 6.7.41 9.6 2.44 11.72c-.12-1.54.87-6.83 1.68-8.28c.72-1.28 14.54-.63 14.54-.63"/><path fill="none" stroke="#424242" stroke-miterlimit="10" stroke-width="2" d="M23.18 6.45v104.4"/><path fill="none" stroke="#424242" stroke-miterlimit="10" stroke-width="3" d="m34.38 109.34l-11.3.22c-3.77 0-5.06 4.04-4.39 6.71c.84 3.37 4.32 3.92 5.18 3.92h12.65"/></svg>
								<!-- Glowing effect behind book -->
								<div class="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-green-500/20 rounded-3xl blur-3xl -z-10 group-hover:blur-2xl transition-all duration-700"></div>
							</div>
							
							<!-- Floating subject cards around the book -->
							<div class="absolute -top-6 -left-8 animate-float">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">📊</span>
										<div>
											<div class="text-sm font-semibold text-slate-800">{$t('mathSubject')}</div>
											<div class="text-xs text-slate-600">2,847 {$t('questionsCount')}</div>
										</div>
									</div>
								</div>
							</div>
							
							<div class="absolute -top-4 -right-12 animate-float" style="animation-delay: 0.7s">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">⚗️</span>
										<div>
											<div class="text-sm font-semibold text-slate-800">{$t('chemSubject')}</div>
											<div class="text-xs text-slate-600">1,923 {$t('questionsCount')}</div>
										</div>
									</div>
								</div>
							</div>
							
							<div class="absolute -bottom-8 -left-6 animate-float" style="animation-delay: 1.3s">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">🚀</span>
										<div>
											<div class="text-sm font-semibold text-slate-800">{$t('physSubject')}</div>
											<div class="text-xs text-slate-600">3,156 {$t('questionsCount')}</div>
										</div>
									</div>
								</div>
							</div>
							
							<div class="absolute -bottom-6 -right-8 animate-float" style="animation-delay: 0.4s">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">💻</span>
										<div>
											<div class="text-sm font-semibold text-slate-800">{$t('compSciSubject')}</div>
											<div class="text-xs text-slate-600">2,234 {$t('questionsCount')}</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Scroll Indicator -->
		<div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
			<div class="w-6 h-10 border-2 border-white/30 rounded-full p-1">
				<div class="w-1 h-3 bg-white/60 rounded-full mx-auto animate-pulse"></div>
			</div>
		</div>
	</section>

	<!-- Quiz Demo Section placed below hero -->
	<section class="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<div class="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
					</svg>
					{$t('interactiveDemo')}
				</div>
				<h2 class="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
					{$t('experienceOur')} 
					<span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						{$t('quizPlatform')}
					</span>
				</h2>
				<p class="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
					{$t('quizDemoDescription')}
				</p>
			</div>

			<div class="relative">
				<!-- Background decoration -->
				<div class="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-3xl"></div>
				
				<div class="relative max-w-4xl mx-auto">
					<QuizDemo />
				</div>
				
				<!-- Floating elements for visual appeal -->
				<div class="absolute -top-8 -left-8 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
				<div class="absolute -bottom-12 -right-12 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-15 animate-pulse delay-1000"></div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-800 relative overflow-hidden">
		<!-- Background pattern -->
		<div class="absolute inset-0 opacity-5">
			<div class="absolute inset-0" style="background-image: radial-gradient(circle at 25px 25px, #3b82f6 2px, transparent 0), radial-gradient(circle at 75px 75px, #8b5cf6 2px, transparent 0); background-size: 100px 100px;"></div>
		</div>
		
		<div class="max-w-7xl mx-auto relative">
			<div class="text-center mb-20">
				<div class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
					</svg>
					{$t('powerfulFeatures')}
				</div>
				<h2 class="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
					{$t('whyChoose')} 
					<span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
						{$t('examTie')}?
					</span>
				</h2>
				<p class="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
					{$t('featuresDescription')}
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
				<div class="group relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 overflow-hidden">
					<!-- Enhanced animated background gradient -->
					<div class="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 rounded-3xl transition-all duration-700"></div>
					<div class="absolute -top-10 -right-10 w-20 h-20 bg-blue-400/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
					
					<div class="relative z-10">
						<div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl shadow-blue-500/30">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
						</div>
						<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-500">{$t('aiPoweredLearning')}</h3>
						<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
							{$t('aiPoweredLearningDesc')}
						</p>
						<div class="mt-6 inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
							{$t('learnMore')} 
							<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</div>
					</div>
				</div>

				<div class="group relative bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-10 rounded-3xl border border-green-200/50 dark:border-green-700/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 overflow-hidden">
					<div class="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/10 group-hover:to-emerald-500/10 rounded-3xl transition-all duration-700"></div>
					<div class="absolute -top-10 -right-10 w-20 h-20 bg-green-400/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
					
					<div class="relative z-10">
						<div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl shadow-green-500/30">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-500">{$t('progressTracking')}</h3>
						<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
							{$t('progressTrackingDesc')}
						</p>
						<div class="mt-6 inline-flex items-center text-green-600 dark:text-green-400 font-semibold group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors duration-300">
							{$t('learnMore')} 
							<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</div>
					</div>
				</div>

				<div class="group relative bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 p-10 rounded-3xl border border-purple-200/50 dark:border-purple-700/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden">
					<div class="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-violet-500/0 group-hover:from-purple-500/10 group-hover:to-violet-500/10 rounded-3xl transition-all duration-700"></div>
					<div class="absolute -top-10 -right-10 w-20 h-20 bg-purple-400/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
					
					<div class="relative z-10">
						<div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl shadow-purple-500/30">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
							</svg>
						</div>
						<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-500">{$t('vastQuestionBank')}</h3>
						<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
							{$t('vastQuestionBankDesc')}
						</p>
						<div class="mt-6 inline-flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
							{$t('learnMore')} 
							<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</div>
					</div>
				</div>
			</div>

			<!-- Enhanced additional feature highlights -->
			<div class="mt-20 grid grid-cols-1 md:grid-cols-2 gap-10">
				<div class="group flex items-start space-x-6 p-8 bg-gradient-to-r from-slate-50 to-blue-50/70 dark:from-slate-800 dark:to-blue-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-105 transition-all duration-500">
					<div class="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
						</svg>
					</div>
					<div>
						<h4 class="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{$t('instantFeedback')}</h4>
						<p class="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">{$t('instantFeedbackDesc')}</p>
					</div>
				</div>
				
				<div class="group flex items-start space-x-6 p-8 bg-gradient-to-r from-slate-50 to-purple-50/70 dark:from-slate-800 dark:to-purple-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-105 transition-all duration-500">
					<div class="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
						</svg>
					</div>
					<div>
						<h4 class="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">{$t('adaptiveDifficulty')}</h4>
						<p class="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">{$t('adaptiveDifficultyDesc')}</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Stats Section -->
	<section bind:this={statsSection} class="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-900 via-purple-800 to-purple-900 relative overflow-hidden">
		<!-- Animated background elements -->
		<div class="absolute inset-0">
			<div class="absolute top-10 right-1/4 w-32 h-32 bg-white/5 rounded-full animate-pulse"></div>
			<div class="absolute bottom-20 left-1/3 w-20 h-20 bg-blue-400/10 rounded-full animate-bounce delay-300"></div>
			<div class="absolute top-1/2 right-12 w-16 h-16 bg-purple-400/10 rounded-full animate-ping delay-700"></div>
		</div>
		
		<div class="max-w-7xl mx-auto relative">
			<div class="text-center mb-20">
				<div class="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white/90 rounded-full text-sm font-medium mb-6">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
					</svg>
					{$t('ourImpact')}
				</div>
				<h2 class="text-4xl lg:text-5xl font-bold text-white mb-6">
					{$t('trustedBy')} 
					<span class="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
						{$t('worldwide')}
					</span>
				</h2>
				<p class="text-xl text-rose-200/90 max-w-3xl mx-auto leading-relaxed">
					{$t('joinThousands')}
				</p>
			</div>

			<div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
				<div class="text-center group">
					<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 group-hover:bg-white/15 group-hover:scale-105 transition-all duration-500">
						<div class="stat-number text-4xl lg:text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">0</div>
						<div class="text-rose-200/80 text-lg font-medium">{$t('problems')}</div>
						<div class="w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto mt-4"></div>
					</div>
				</div>
				<div class="text-center group">
					<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 group-hover:bg-white/15 group-hover:scale-105 transition-all duration-500">
						<div class="stat-number text-4xl lg:text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">0</div>
						<div class="text-rose-200/80 text-lg font-medium">{$t('questionsSolved')}</div>
						<div class="w-16 h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mx-auto mt-4"></div>
					</div>
				</div>
				<div class="text-center group">
					<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 group-hover:bg-white/15 group-hover:scale-105 transition-all duration-500">
						<div class="stat-number text-4xl lg:text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">0</div>
						<div class="text-rose-200/80 text-lg font-medium">{$t('successRate')}</div>
						<div class="w-16 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mt-4"></div>
					</div>
				</div>
				<div class="text-center group">
					<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 group-hover:bg-white/15 group-hover:scale-105 transition-all duration-500">
						<div class="stat-number text-4xl lg:text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">0</div>
						<div class="text-rose-200/80 text-lg font-medium">{$t('support')}</div>
						<div class="w-16 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mx-auto mt-4"></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Call to Action Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-900 via-blue-900 to-indigo-800 relative overflow-hidden">
		<!-- Background decorations -->
		<div class="absolute inset-0">
			<div class="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full animate-pulse"></div>
			<div class="absolute bottom-16 right-16 w-32 h-32 bg-white/5 rounded-full animate-bounce delay-300"></div>
			<div class="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full animate-ping delay-700"></div>
		</div>
		
		<div class="max-w-5xl mx-auto text-center relative">
			<div class="mb-8">
				<div class="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white/90 rounded-full text-sm font-medium mb-6">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
					</svg>
					{$t('startYourJourney')}
				</div>
				<h2 class="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
					{$t('readyToTransform')} 
					<span class="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
						{$t('yourLearning')}
					</span>
				</h2>
				<p class="text-xl lg:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
					{$t('ctaDescription')}
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-6 justify-center items-center">
				<button class="group bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-white/25">
					<span class="flex items-center">
						<svg class="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
						</svg>
						{$t('loginNow')}
					</span>
				</button>
				<button class="group border-2 border-white text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/10 hover:scale-105 transition-all duration-300 backdrop-blur-sm">
					<span class="flex items-center">
						<svg class="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
						{$t('exploreExams')}
					</span>
				</button>
			</div>
		</div>
	</section>
</main>

<Footer />
<BackToTop />
