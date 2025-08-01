<!-- Examtie Homepage -->
<script lang="ts">
	import Header from './components/Header.svelte';
	import QuizDemo from './components/QuizDemo.svelte';
	import Footer from './components/Footer.svelte';
	import { t } from '../lib/i18n.js';
	import { currentLanguage } from '../lib/stores/language.js';
	import { auth } from '../lib/stores/auth';

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

	// Exam types data - Thai educational system
	const examTypes = [
		{ name: "A-Level", thaiName: "เอเลเวล", icon: "🎓", color: "purple" },
		{ name: "O-NET", thaiName: "โอเน็ต", icon: "📄", color: "blue" },
		{ name: "POSN", thaiName: "สอวน.", icon: "🧠", color: "green" },
		{ name: "GAT/PAT", thaiName: "แกต/แพต", icon: "📊", color: "orange" },
		{ name: "9 วิชาสามัญ", thaiName: "9 วิชาสามัญ", icon: "📚", color: "red" },
		{ name: "TCAS", thaiName: "ทีแคส", icon: "✏️", color: "yellow" },
		{ name: "มัธยมศึกษา", thaiName: "ม.1-6", icon: "🧪", color: "pink" },
		{ name: "อื่นๆ", thaiName: "ข้อสอบอื่นๆ", icon: "✨", color: "indigo" }
	];

	// Features data
	const features = [
		{
			icon: "📄",
			title: "Exam Creation",
			thaiTitle: "สร้างข้อสอบ",
			description: "สร้าง แก้ไข จัดหมวดหมู่ และเผยแพร่ข้อสอบได้อย่างง่ายดาย"
		},
		{
			icon: "📊",
			title: "Test Management",
			thaiTitle: "จัดการการสอบ",
			description: "บริหารจัดการการสอบออนไลน์ได้อย่างมีประสิทธิภาพ"
		},
		{
			icon: "🛒",
			title: "Marketplace",
			thaiTitle: "มาร์เก็ตเพลส",
			description: "ซื้อขายเนื้อหาการสอบที่มีคุณภาพสูง"
		},
		{
			icon: "📚",
			title: "Flashcards",
			thaiTitle: "แฟลชการ์ด",
			description: "สร้างแฟลชการ์ดเพื่อทบทวนบทเรียนได้อย่างมีประสิทธิภาพ"
		},
		{
			icon: "🧠",
			title: "AI Question Generator",
			thaiTitle: "AI สร้างคำถาม",
			description: "ใช้ AI สร้างคำถามตามหัวข้อที่คุณสนใจ"
		},
		{
			icon: "✨",
			title: "Performance Analysis",
			thaiTitle: "วิเคราะห์ผลการเรียน",
			description: "วิเคราะห์จุดแข็งและจุดอ่อนหลังการสอบ"
		}
	];

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

	// Exciting interactive elements for mobile and desktop
	let mousePosition = { x: 0, y: 0 };
	let isMobile = false;
	let screenWidth = 0;
	
	function handleMouseMove(event: MouseEvent) {
		if (!isMobile) {
			const rect = heroSection?.getBoundingClientRect();
			if (rect) {
				mousePosition.x = (event.clientX - rect.left) / rect.width;
				mousePosition.y = (event.clientY - rect.top) / rect.height;
			}
		}
	}

	// User types tab functionality
	let activeUserType: 'student' | 'teacher' | 'institution' = 'student';
	const userTypes: Record<'student' | 'teacher' | 'institution', {
		emoji: string;
		title: string;
		heading: string;
		description: string;
		features: string[];
		buttonText: string;
	}> = {
		student: {
			emoji: '👨‍🎓',
			title: 'นักเรียน',
			heading: 'สำหรับนักเรียนและผู้เรียน',
			description: 'พัฒนาทักษะการเรียนรู้ด้วยเครื่องมือที่ทันสมัยและมีประสิทธิภาพ',
			features: [
				'เข้าถึงข้อสอบคุณภาพสูงจากหลากหลายวิชา',
				'สร้างแฟลชการ์ดเพื่อทบทวนบทเรียน',
				'รับการวิเคราะห์จุดแข็งและจุดอ่อนด้วย AI',
				'ฝึกฝนกับข้อสอบเสมือนจริง'
			],
			buttonText: 'เริ่มต้นเรียนรู้'
		},
		teacher: {
			emoji: '👩‍🏫',
			title: 'ครูและอาจารย์',
			heading: 'สำหรับครูและอาจารย์',
			description: 'เครื่องมือที่ทรงพลังสำหรับการจัดการเรียนการสอนยุคใหม่',
			features: [
				'สร้างและจัดการข้อสอบออนไลน์ได้อย่างง่ายดาย',
				'ติดตามความก้าวหน้าของนักเรียนแบบเรียลไทม์',
				'ใช้ AI ช่วยสร้างข้อสอบที่หลากหลาย',
				'วิเคราะห์ผลการเรียนและสร้างรายงาน'
			],
			buttonText: 'เริ่มสอนวันนี้'
		},
		institution: {
			emoji: '🏫',
			title: 'สถาบันการศึกษา',
			heading: 'สำหรับสถาบันการศึกษา',
			description: 'โซลูชันครบวงจรสำหรับการจัดการการศึกษาระดับองค์กร',
			features: [
				'ระบบจัดการข้อสอบระดับสถาบัน',
				'รายงานและวิเคราะห์ข้อมูลเชิงลึก',
				'การรวมระบบกับ LMS ที่มีอยู่',
				'การสนับสนุนและบริการเฉพาะองค์กร'
			],
			buttonText: 'ปรึกษาโซลูชัน'
		}
	};

	function setActiveUserType(type: 'student' | 'teacher' | 'institution') {
		activeUserType = type;
	}
	
	// Particle system for excitement
	const particles = Array.from({ length: 50 }, (_, i) => ({
		id: i,
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: Math.random() * 3 + 1,
		speed: Math.random() * 0.5 + 0.1,
		opacity: Math.random() * 0.3 + 0.1
	}));
	
	function checkMobile() {
		isMobile = screenWidth < 768;
	}
	


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
  // Placeholder for stats section if needed
  let statsSection: HTMLElement;
	
	function handleIntersection(entries: IntersectionObserverEntry[]) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('animate-in');
			}
		});
	}

	import { onMount } from 'svelte';
	
	onMount(() => {
		// Screen width tracking for mobile detection
		function updateScreenWidth() {
			screenWidth = window.innerWidth;
			checkMobile();
		}
		
		updateScreenWidth();
		window.addEventListener('resize', updateScreenWidth);
		
		const observer = new IntersectionObserver(handleIntersection, {
			threshold: 0.1,
			rootMargin: '0px 0px -100px 0px'
		});

	   if (heroSection) observer.observe(heroSection);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', updateScreenWidth);
		};
	});
</script>

<svelte:head>
	<title>{$t('pageTitle')}</title>
	<meta name="description" content="{$t('pageDescription')}" />
</svelte:head>

<Header />

<main>
	<!-- Enhanced Hero Section with Green Book -->
	<section bind:this={heroSection} role="banner" class="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" on:mousemove={handleMouseMove}>
		<!-- Sophisticated Background with Interactive Elements -->
		<div class="absolute inset-0">
			<!-- Primary gradient overlay -->
			<div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/90 to-indigo-950/95"></div>
			
			<!-- Dynamic Floating Particles for Mobile and Desktop -->
			{#each Array.from({length: isMobile ? 25 : 60}) as _, i}
				<div 
					class="absolute rounded-full animate-float-gentle pointer-events-none"
					style="
						left: {Math.random() * 100}%;
						top: {Math.random() * 100}%;
						width: {Math.random() * (isMobile ? 3 : 6) + 2}px;
						height: {Math.random() * (isMobile ? 3 : 6) + 2}px;
						background: linear-gradient(45deg, 
							hsl({Math.random() * 60 + 120}, 70%, 60%, 0.1), 
							hsl({Math.random() * 60 + 180}, 80%, 70%, 0.15)
						);
						animation-delay: {Math.random() * 15}s;
						animation-duration: {Math.random() * 20 + 10}s;
						filter: blur({Math.random() * 2 + 1}px);
					"
				></div>
			{/each}
			
			<!-- Enhanced Animated geometric shapes -->
			<div class="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-green-400/10 rounded-full blur-xl animate-float-gentle"></div>
			<div class="absolute top-40 right-16 w-24 h-24 bg-gradient-to-br from-blue-500/25 to-cyan-400/15 rounded-full blur-lg animate-float" style="animation-delay: 1s"></div>
			<div class="absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-400/10 rounded-full blur-md animate-float-gentle" style="animation-delay: 2s"></div>
			
			<!-- Interactive Mouse Tracking Orb (Desktop Only) -->
			{#if !isMobile && mousePosition.x > 0}
				<div 
					class="hidden absolute pointer-events-none w-96 h-96 bg-gradient-to-r from-emerald-400/5 to-blue-400/5 rounded-full blur-3xl transition-all duration-1000 ease-out"
					style="
						left: {mousePosition.x * 100}%;
						top: {mousePosition.y * 100}%;
						transform: translate(-50%, -50%) scale({1 + Math.sin(Date.now() * 0.001) * 0.1});
					"
				></div>
			{/if}
			
			<!-- Subtle grid pattern -->
			<div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, rgba(34, 197, 94, 0.3) 1px, transparent 0); background-size: 40px 40px;"></div>
		</div>

		<!-- Main Content Container -->
		<div class="relative z-10 min-h-screen flex items-center hero-section">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
				<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<!-- Left Content -->
					<div class="space-y-4 sm:space-y-6 lg:space-y-8 text-center lg:text-left order-2 lg:order-1">
						<!-- Badge -->
						<div class="animate-fade-in-up delay-100">
							<div class="inline-block rounded-lg bg-purple-100 px-3 py-1 text-sm dark:bg-purple-800/20 text-purple-700 dark:text-purple-300">
								เรียนรู้ได้ทุกที่ ทุกเวลา
							</div>
						</div>

						<!-- Main Heading -->
						<div class="animate-fade-in-up delay-200">
							<h1 class="text-5xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight tracking-tight">
								Examtie
							</h1>
							<h2 class="text-3xl sm:text-4xl font-bold tracking-tighter text-purple-300 mt-4">
								แพลตฟอร์มการเรียนรู้ออนไลน์
							</h2>
							<p class="mt-4 sm:mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
								เข้าถึงข้อสอบคุณภาพสูง สร้างแฟลชการ์ด และเรียนรู้ด้วย AI ที่ช่วยวิเคราะห์จุดแข็งและจุดอ่อนของคุณ
							</p>
						</div>

<!-- CTA Buttons -->
<script lang="ts">
  import { auth } from '../lib/stores/auth';
</script>
<div class="animate-fade-in-up delay-300">
  <div class="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center lg:justify-start">
	<a href={$auth.isAuthenticated ? "/exams" : "/login"} class="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-purple-500/25 transition-all duration-300">
	  เริ่มต้นใช้งานฟรี
	</a>
  </div>
</div>
					</div>

					<!-- Right Visual -->
					<div class="animate-fade-in-up delay-400 flex justify-center lg:justify-end order-1 lg:order-2">
						<div class="relative group">
							<!-- Mobile Pulse Effect -->
							<div class="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-green-500/10 rounded-full blur-3xl animate-pulse lg:hidden"></div>
							
							<!-- Main Book -->
							<div class="relative transform hover:scale-105 transition-transform duration-700">
								<svg class="w-72 sm:w-80 lg:w-96 xl:w-[420px] h-auto drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128"><!-- Icon from Noto Emoji by Google Inc - https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE --><path fill="#689F38" d="M106.02 121.68H36.18c-1.66 0-1.26-1.35-1.26-3.01V14.05c0-1.66 1.35-3.01 3.01-3.01h69.36c2.72 0 4.93 2.21 4.93 4.93v99.76c0 3.86-1.83 5.95-6.2 5.95"/><path fill="#94C6D6" d="M18.53 115.14c0 1.94 3.07 3.57 5.01 3.57l80.39-.05c2.98 0 4.54-1.58 4.54-3.52l-.25-21.32H18.53z"/><path fill="#F5F5F5" d="M101.47 105.88s-2.13 5.85.03 8.78c2.51 3.4 6.89 2.58 6.89.99V16.44c0-.66-.61-1.14-1.25-1c-1.39.3-3.89.31-7.21-1.89z"/><path fill="#689F38" d="M94.16 110.85H23.64V6.45h72.25c2.27 0 3.87.61 4.62 1.62c.98 1.31 1.5 3.3 1.5 5.48V103a7.85 7.85 0 0 1-7.85 7.85"/><path fill="#9CCC65" d="M92.01 107.78H25.54c-2.76 0-4.99-2.24-4.99-4.99V11.45c0-2.76 2.24-4.99 4.99-4.99h66.47c3.82 0 6.92 2.18 6.92 6.92v87.49c-.01 3.81-3.1 6.91-6.92 6.91"/><path fill="#616161" d="M34.43 109.75L34.38 6.46h-11.2s-2.31-.4-3.85 0c-2.79.73-3.56 2.76-3.56 6.07v94.41c0 6.7.41 9.6 2.44 11.72c-.12-1.54.87-6.83 1.68-8.28c.72-1.28 14.54-.63 14.54-.63"/><path fill="none" stroke="#424242" stroke-miterlimit="10" stroke-width="2" d="M23.18 6.45v104.4"/><path fill="none" stroke="#424242" stroke-miterlimit="10" stroke-width="3" d="m34.38 109.34l-11.3.22c-3.77 0-5.06 4.04-4.39 6.71c.84 3.37 4.32 3.92 5.18 3.92h12.65"/></svg>
								<!-- Desktop glowing effect behind book -->
								<div class="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-green-500/20 rounded-3xl blur-3xl -z-10 hover:blur-2xl transition-all duration-700 hidden lg:block"></div>
							</div>
							
							<!-- Floating subject cards with subtle animations -->
							<div class="absolute -top-6 -left-8 animate-float-gentle">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">🎓</span>
										<div class="hidden sm:block">
											<div class="text-sm font-semibold text-slate-800">A-Level</div>
											<div class="text-xs text-slate-600">2,847 ข้อสอบ</div>
										</div>
									</div>
								</div>
							</div>
							
							<div class="absolute -top-4 -right-12 animate-float-gentle" style="animation-delay: 0.7s">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">📄</span>
										<div class="hidden sm:block">
											<div class="text-sm font-semibold text-slate-800">O-NET</div>
											<div class="text-xs text-slate-600">1,923 ข้อสอบ</div>
										</div>
									</div>
								</div>
							</div>
							
							<div class="absolute -bottom-8 -left-6 animate-float-gentle" style="animation-delay: 1.3s">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">🧠</span>
										<div class="hidden sm:block">
											<div class="text-sm font-semibold text-slate-800">POSN</div>
											<div class="text-xs text-slate-600">3,156 ข้อสอบ</div>
										</div>
									</div>
								</div>
							</div>
							
							<div class="absolute -bottom-6 -right-8 animate-float-gentle" style="animation-delay: 0.4s">
								<div class="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/50">
									<div class="flex items-center gap-2">
										<span class="text-2xl">📚</span>
										<div class="hidden sm:block">
											<div class="text-sm font-semibold text-slate-800">9 วิชาสามัญ</div>
											<div class="text-xs text-slate-600">2,234 ข้อสอบ</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Exam Types Section -->
	<section class="py-20 lg:py-24 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-800">
		<div class="container px-4 md:px-6 max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-purple-400/30 mb-6">
					<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
					</svg>
					<span class="text-sm font-medium text-purple-700 dark:text-purple-300">ข้อสอบหลากหลาย</span>
				</div>
				<h2 class="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 dark:text-white mb-6">
					เลือกข้อสอบที่
					<span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
						คุณต้องการ
					</span>
				</h2>
				<p class="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
					Examtie มีข้อสอบหลากหลายประเภทให้คุณได้ฝึกฝนและพัฒนาทักษะการเรียนรู้
				</p>
			</div>
			
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each examTypes as exam}
					<div class="group relative">
						<div class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
						<div class="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600">
							<div class="text-center">
								<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
									<span class="text-3xl">{exam.icon}</span>
								</div>
								<h3 class="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
									{exam.name}
								</h3>
								<p class="text-sm text-slate-600 dark:text-slate-400">
									{exam.thaiName}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 relative overflow-hidden">
		<!-- Background pattern -->
		<div class="absolute inset-0 opacity-5">
			<div class="absolute inset-0" style="background-image: 
				radial-gradient(circle at 25px 25px, rgba(139, 92, 246, 0.4) 2px, transparent 0), 
				radial-gradient(circle at 75px 75px, rgba(59, 130, 246, 0.3) 2px, transparent 0); 
				background-size: 100px 100px;
			"></div>
		</div>
		
		<div class="max-w-7xl mx-auto relative">
			<div class="text-center mb-16 lg:mb-20">
				<div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-purple-400/30 mb-6">
					<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
					</svg>
					<span class="text-sm font-medium text-purple-700 dark:text-purple-300">{$t('powerfulFeatures')}</span>
				</div>
				<h2 class="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 dark:text-white mb-6">
					{$t('whyChoose')} 
					<span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
						{$t('examTie')}?
					</span>
				</h2>
				<p class="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
					{$t('featuresDescription')}
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
				<!-- AI-Powered Learning -->
				<div class="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 lg:p-10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 overflow-hidden">
					<div class="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 rounded-3xl transition-all duration-700"></div>
					<div class="absolute -top-10 -right-10 w-20 h-20 bg-blue-400/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
					
					<div class="relative z-10">
						<div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl shadow-blue-500/30">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
						</div>
						<h3 class="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-500">
							{$t('aiPoweredLearning')}
						</h3>
						<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-base lg:text-lg mb-6">
							{$t('aiPoweredLearningDesc')}
						</p>
						<div class="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
							{$t('learnMore')} 
							<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</div>
					</div>
				</div>

				<!-- Progress Tracking -->
				<div class="group relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-8 lg:p-10 rounded-3xl border border-green-200/50 dark:border-green-700/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 overflow-hidden">
					<div class="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/10 group-hover:to-emerald-500/10 rounded-3xl transition-all duration-700"></div>
					<div class="absolute -top-10 -right-10 w-20 h-20 bg-green-400/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
					
					<div class="relative z-10">
						<div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl shadow-green-500/30">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<h3 class="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-500">
							{$t('progressTracking')}
						</h3>
						<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-base lg:text-lg mb-6">
							{$t('progressTrackingDesc')}
						</p>
						<div class="inline-flex items-center text-green-600 dark:text-green-400 font-semibold group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors duration-300">
							{$t('learnMore')} 
							<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</div>
					</div>
				</div>

				<!-- Vast Question Bank -->
				<div class="group relative bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-8 lg:p-10 rounded-3xl border border-purple-200/50 dark:border-purple-700/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden">
					<div class="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-violet-500/0 group-hover:from-purple-500/10 group-hover:to-violet-500/10 rounded-3xl transition-all duration-700"></div>
					<div class="absolute -top-10 -right-10 w-20 h-20 bg-purple-400/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
					
					<div class="relative z-10">
						<div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl shadow-purple-500/30">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
							</svg>
						</div>
						<h3 class="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-500">
							{$t('vastQuestionBank')}
						</h3>
						<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-base lg:text-lg mb-6">
							{$t('vastQuestionBankDesc')}
						</p>
						<div class="inline-flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
							{$t('learnMore')} 
							<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</div>
					</div>
				</div>
			</div>

			<!-- Additional Features -->
			<div class="mt-16 lg:mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Marketplace -->
				<div class="group flex items-start space-x-6 p-8 bg-gradient-to-r from-slate-50 to-blue-50/70 dark:from-slate-800 dark:to-blue-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-105 transition-all duration-500">
					<div class="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
						</svg>
					</div>
					<div>
						<h4 class="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
							Marketplace
						</h4>
						<p class="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
							Sell and buy high quality educational content
						</p>
					</div>
				</div>
				
				<!-- Flashcards -->
				<div class="group flex items-start space-x-6 p-8 bg-gradient-to-r from-slate-50 to-purple-50/70 dark:from-slate-800 dark:to-purple-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:scale-105 transition-all duration-500">
					<div class="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
						</svg>
					</div>
					<div>
						<h4 class="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
							Flashcards Generation
						</h4>
						<p class="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
							Generate flashcards, exportable to <a class="dark:text-blue-200 hover:underline" href="https://apps.ankiweb.net" target="_blank">Anki</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- User Types Section -->
	<section class="py-20 lg:py-24 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-900 dark:to-slate-800">
		<div class="container px-4 md:px-6 max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-purple-400/30 mb-6">
					<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
					</svg>
					<span class="text-sm font-medium text-purple-700 dark:text-purple-300">สำหรับทุกคน</span>
				</div>
				<h2 class="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 dark:text-white mb-6">
					Examtie 
					<span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
						เหมาะกับใคร?
					</span>
				</h2>
				<p class="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
					แพลตฟอร์มของเราออกแบบมาเพื่อตอบโจทย์ความต้องการของทุกคน
				</p>
			</div>
			
			<div class="max-w-5xl mx-auto">
				<!-- User Type Tabs -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
					<button 
						class="group px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
						class:bg-gradient-to-r={activeUserType === 'student'}
						class:from-purple-600={activeUserType === 'student'}
						class:to-blue-600={activeUserType === 'student'}
						class:text-white={activeUserType === 'student'}
						class:bg-white={activeUserType !== 'student'}
						class:dark:bg-slate-800={activeUserType !== 'student'}
						class:text-slate-700={activeUserType !== 'student'}
						class:dark:text-slate-300={activeUserType !== 'student'}
						class:border={activeUserType !== 'student'}
						class:border-slate-200={activeUserType !== 'student'}
						class:dark:border-slate-700={activeUserType !== 'student'}
						on:click={() => setActiveUserType('student')}
					>
						<div class="flex items-center justify-center gap-2">
							<span class="text-2xl">{userTypes.student.emoji}</span>
							<span>{userTypes.student.title}</span>
						</div>
					</button>
					<button 
						class="group px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
						class:bg-gradient-to-r={activeUserType === 'teacher'}
						class:from-purple-600={activeUserType === 'teacher'}
						class:to-blue-600={activeUserType === 'teacher'}
						class:text-white={activeUserType === 'teacher'}
						class:bg-white={activeUserType !== 'teacher'}
						class:dark:bg-slate-800={activeUserType !== 'teacher'}
						class:text-slate-700={activeUserType !== 'teacher'}
						class:dark:text-slate-300={activeUserType !== 'teacher'}
						class:border={activeUserType !== 'teacher'}
						class:border-slate-200={activeUserType !== 'teacher'}
						class:dark:border-slate-700={activeUserType !== 'teacher'}
						on:click={() => setActiveUserType('teacher')}
					>
						<div class="flex items-center justify-center gap-2">
							<span class="text-2xl">{userTypes.teacher.emoji}</span>
							<span>{userTypes.teacher.title}</span>
						</div>
					</button>
				</div>
				
				<!-- User Type Content -->
				<div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 lg:p-12 shadow-xl">
					<div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
						<div class="space-y-6">
							<div>
								<h3 class="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
									{userTypes[activeUserType].heading}
									<span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent block">
										{userTypes[activeUserType].title}
									</span>
								</h3>
								<p class="text-slate-600 dark:text-slate-400 text-lg">
									{userTypes[activeUserType].description}
								</p>
							</div>
							
							<ul class="space-y-4">
								{#each userTypes[activeUserType].features as feature}
									<li class="flex items-start gap-3">
										<div class="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mt-0.5">
											<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
											</svg>
										</div>
										<span class="text-slate-700 dark:text-slate-300 text-lg">{feature}</span>
									</li>
								{/each}
							</ul>
							
							<button class="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
								<span class="flex items-center justify-center gap-2">
									<svg class="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
									</svg>
									{userTypes[activeUserType].buttonText}
								</span>
							</button>
						</div>
						
						<div class="flex justify-center">
							<div class="relative">
								<div class="w-80 h-80 bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-3xl flex items-center justify-center shadow-2xl">
									<div class="text-8xl animate-bounce">{userTypes[activeUserType].emoji}</div>
								</div>
								<!-- Floating elements -->
								<div class="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center animate-float-gentle">
									<span class="text-white text-xl">📚</span>
								</div>
								<div class="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center animate-float-gentle" style="animation-delay: 1s">
									<span class="text-white text-xl">�</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Call to Action Section -->
	<section class="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-800 relative overflow-hidden">
		<!-- Background decorations -->
		<div class="absolute inset-0">
			<div class="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full animate-pulse"></div>
			<div class="absolute bottom-16 right-16 w-32 h-32 bg-white/5 rounded-full animate-bounce delay-300"></div>
			<div class="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full animate-ping delay-700"></div>
		</div>
		
		<div class="max-w-5xl mx-auto text-center relative">
			<div class="mb-6 lg:mb-8">
				<div class="inline-flex items-center px-3 py-2 lg:px-4 lg:py-2 bg-white/20 backdrop-blur-sm text-white/90 rounded-full text-xs lg:text-sm font-medium mb-4 lg:mb-6">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
					</svg>
					{$t('startYourJourney')}
				</div>
				<h2 class="text-3xl lg:text-4xl xl:text-6xl font-bold text-white mb-4 lg:mb-6 leading-tight">
					{$t('readyToTransform')} 
					<span class="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
						{$t('yourLearning')}
					</span>
				</h2>
				<p class="text-lg lg:text-xl xl:text-2xl text-blue-100 mb-8 lg:mb-12 max-w-3xl mx-auto leading-relaxed">
					{$t('ctaDescription')}
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center items-center">
				<button class="bg-white text-blue-600 px-8 py-3 lg:px-10 lg:py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-blue-50 transition-colors duration-300 shadow-2xl hover:shadow-white/25 w-full sm:w-auto">
					<span class="flex items-center justify-center">
						<svg class="w-4 h-4 lg:w-5 lg:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
						</svg>
						{$t('loginNow')}
					</span>
				</button>
				<button class="border-2 border-white text-white px-8 py-3 lg:px-10 lg:py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-white/10 transition-colors duration-300 backdrop-blur-sm w-full sm:w-auto">
					<span class="flex items-center justify-center">
						<svg class="w-4 h-4 lg:w-5 lg:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

<style>
	/* Enhanced particle animation using Tailwind-compatible approach */
	@keyframes float-gentle {
		0%, 100% { transform: translateY(0px) translateX(0px); }
		25% { transform: translateY(-6px) translateX(2px); }
		50% { transform: translateY(-12px) translateX(-1px); }
		75% { transform: translateY(-6px) translateX(1px); }
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-8px); }
	}

	.animate-float {
		animation: float 6s ease-in-out infinite;
	}

	/* Custom scrollbar for webkit browsers */
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgba(255,255,255,0.1);
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(255,255,255,0.3);
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(255,255,255,0.5);
	}
</style>