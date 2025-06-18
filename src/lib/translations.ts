export interface Translations {
	// Navigation
	home: string;
	quiz: string;
	marketplace: string;
	login: string;
	search: string;
	
	// Hero Section
	heroTitle: string;
	heroDescription: string;
	heroSubtitle: string;
	heroStatusBadge: string;
	masterYour: string;
	examsWith: string;
	examTie: string;
	transformStudy: string;
	startLearningNow: string;
	tryDemo: string;
	loginNow: string;
	exploreExams: string;
	exams: string;
	
	// New Exciting Hero Translations
	revolutionize: string;
	studyMethod: string;
	freeForever: string;
	builtByDevelopers: string;
	powerfulAI: string;
	joinRevolution: string;
	nextGenLearning: string;
	joinCommunity: string;
	
	// Hero Stats
	questions: string;
	successRate: string;
	students: string;
	
	// Subjects
	mathematics: string;
	chemistry: string;
	physics: string;
	biology: string;
	english: string;
	geography: string;
	history: string;
	computerScience: string;
	questionsCount: string; // for "2,847 questions" format
	
	// Quiz Demo Section
	quizDemoTitle: string;
	quizDemoDescription: string;
	interactiveDemo: string;
	experienceOur: string;
	quizPlatform: string;
	tryInteractive: string;
	
	// Features Section
	featuresTitle: string;
	featuresDescription: string;
	powerfulFeatures: string;
	whyChoose: string;
	accelerateJourney: string;
	maximizeSuccess: string;
	aiPoweredLearning: string;
	aiPoweredLearningDesc: string;
	progressTracking: string;
	progressTrackingDesc: string;
	vastQuestionBank: string;
	vastQuestionBankDesc: string;
	instantFeedback: string;
	instantFeedbackDesc: string;
	adaptiveDifficulty: string;
	adaptiveDifficultyDesc: string;
	learnMore: string;
	
	// Stats Section
	statsTitle: string;
	statsDescription: string;
	ourImpact: string;
	trustedBy: string;
	worldwide: string;
	joinThousands: string;
	problems: string;
	activeStudents: string;
	questionsSolved: string;
	support: string;
	
	// Testimonials Section
	testimonialsTitle: string;
	testimonialsDescription: string;
	whatStudentsSay: string;
	realStories: string;
	transformedPerformance: string;
	
	// Call to Action
	ctaTitle: string;
	ctaDescription: string;
	startYourJourney: string;
	readyToTransform: string;
	yourLearning: string;
	joinStudents: string;
	improvingScores: string;
	aiPoweredPlatform: string;
	startSuccessJourney: string;
	startFreeTrial: string;
	viewPricing: string;
	
	// Common UI Elements
	aiPowered: string;
	progressTrackingShort: string;
	fiveKQuestions: string;
	interactiveDemoShort: string;
	
	// Footer
	footerDescription: string;
	footerProduct: string;
	footerPracticeQuiz: string;
	footerQuestionBank: string;
	footerAnalytics: string;
	footerProgressTracking: string;
	footerSupport: string;
	footerHelpCenter: string;
	footerContactUs: string;
	footerTutorials: string;
	footerFaq: string;
	footerLegal: string;
	footerPrivacyPolicy: string;
	footerTermsOfService: string;
	footerCookiePolicy: string;
	footerLicenses: string;
	footerCopyright: string;
	footerMadeWithLove: string;
	aboutUs: string;
	contactUs: string;
	privacyPolicy: string;
	termsOfService: string;
	
	// Meta Information
	pageTitle: string;
	pageDescription: string;
	
	// Floating Subject Cards
	mathSubject: string;
	chemSubject: string;
	physSubject: string;
	compSciSubject: string;

	// Auth
	register: string;
	signInToYourAccount: string;
	createNewAccount: string;
	fullName: string;
	fullNamePlaceholder: string;
	username: string;
	usernamePlaceholder: string;
	password: string;
	passwordPlaceholder: string;
	processing: string;
	signIn: string;
	createAccount: string;
	needAnAccount: string;
	alreadyHaveAccount: string;
	loginSuccess: string;
	registrationSuccess: string;
	profileUpdatedSuccessfully: string;
	loadingProfile: string;
	emailAddress: string;
	bio: string;
	bioPlaceholder: string;
	forgotPassword: string;
	welcomeBack: string;
	joinToday: string;
	secureLogin: string;
	getStarted: string;
	
	// Auth Modal & Validation
	loginTitle: string;
	signupTitle: string;
	loginDescriptionModal: string;
	signupDescriptionModal: string;
	loginWithGoogle: string;
	orContinueWith: string;
	email: string;
	confirmPassword: string;
	passwordRequirements: string;
	emailRequired: string;
	invalidEmail: string;
	passwordRequired: string;
	passwordLength: string;
	fullNameRequired: string;
	usernameRequired: string;
	usernameLength: string;
	confirmPasswordRequired: string;
	passwordsDoNotMatch: string;
	
	// Additional Navigation & UI
	admin: string;
	language: string;
	logout: string;
	userProfile: string;
	
	// Admin Dashboard
	adminDashboard: string;
	manageUsers: string;
	systemSettings: string;
	totalUsers: string;
	totalQuizzes: string;
	activeSessions: string;
	totalQuestions: string;
	userManagement: string;
	searchUsers: string;
	allRoles: string;
	user: string;
	staff: string;
	role: string;
	status: string;
	actions: string;
	view: string;
	delete: string;
	active: string;
	userDetails: string;
	changeRole: string;
	deleteUser: string;
	deleteConfirmMessage: string;
	cancel: string;
	refresh: string;
	loadingDashboard: string;
	previous: string;
	next: string;
	showing: string;
	to: string;
	of: string;
	results: string;
}

export const translations: Record<'en' | 'th', Translations> = {
	en: {
		// Navigation
		home: 'Home',
		quiz: 'Quiz',
		marketplace: 'Marketplace',
		login: 'Login',
		search: 'Search',
		
		// Hero Section
		heroTitle: 'ExamTie',
		heroDescription: 'Transform your study experience with AI-powered practice questions, instant feedback, and personalized learning paths tailored to your success.',
		heroSubtitle: 'Master Your Exams with AI-Powered Practice',
		heroStatusBadge: '🚀 AI-Powered Learning Platform',
		masterYour: 'Master Your',
		examsWith: 'Exams with',
		examTie: 'ExamTie',
		transformStudy: 'Experience the future of exam preparation with our completely free, open source learning platform. AI-powered questions, personalized feedback, and progress tracking - all available to everyone, forever.',
		startLearningNow: 'Start Learning Now',
		tryDemo: 'Try Demo',
		loginNow: 'Login Now',
		exploreExams: 'Explore Exams',
		exams: 'Exams',
		joinCommunity: 'Join the Community',
		freeForever: 'Free Forever',
		builtByDevelopers: 'Built by learners, for learners',
		powerfulAI: 'Powered by AI',
		revolutionize: 'Revolutionize',
		studyMethod: 'Your Study Method',
		joinRevolution: 'Join the Revolution',
		nextGenLearning: 'Next-Gen Learning',
		
		// Hero Stats
		questions: 'Questions',
		successRate: 'Success Rate',
		students: 'Students',
		
		// Subjects
		mathematics: 'Mathematics',
		chemistry: 'Chemistry',
		physics: 'Physics',
		biology: 'Biology',
		english: 'English',
		geography: 'Geography',
		history: 'History',
		computerScience: 'Computer Science',
		questionsCount: 'questions',
		
		// Quiz Demo Section
		quizDemoTitle: 'Experience Our Quiz Platform',
		quizDemoDescription: 'Try our interactive quiz interface with real-time feedback and detailed explanations. See how our AI adapts to your learning style.',
		interactiveDemo: 'Interactive Demo',
		experienceOur: 'Experience Our',
		quizPlatform: 'Quiz Platform',
		tryInteractive: 'Try our interactive quiz interface with real-time feedback and detailed explanations',
		
		// Features Section
		featuresTitle: 'Why Choose ExamTie?',
		featuresDescription: 'Powerful features designed to accelerate your learning journey and maximize your exam success',
		powerfulFeatures: 'Powerful Features',
		whyChoose: 'Why Choose',
		accelerateJourney: 'Powerful features designed to accelerate your learning journey',
		maximizeSuccess: 'and maximize your exam success',
		aiPoweredLearning: 'AI-Powered Learning',
		aiPoweredLearningDesc: 'Get personalized question recommendations and intelligent feedback tailored to your learning style and progress. Our AI adapts to help you improve faster.',
		progressTracking: 'Progress Tracking',
		progressTrackingDesc: 'Monitor your improvement with detailed analytics, performance insights, and achievement milestones. Visualize your learning journey clearly.',
		vastQuestionBank: 'Vast Question Bank',
		vastQuestionBankDesc: 'Access thousands of carefully curated questions across multiple subjects and difficulty levels. Fresh content updated regularly.',
		instantFeedback: 'Instant Feedback',
		instantFeedbackDesc: 'Get immediate explanations and learn from your mistakes with detailed solution breakdowns.',
		adaptiveDifficulty: 'Adaptive Difficulty',
		adaptiveDifficultyDesc: 'Questions automatically adjust to your skill level, keeping you challenged but not overwhelmed.',
		learnMore: 'Learn more',
		
		// Stats Section
		statsTitle: 'Free & Open Source Learning Platform',
		statsDescription: 'Built by the community, for the community. Always free, forever open.',
		ourImpact: 'Community Impact',
		trustedBy: 'Free & Open Source',
		worldwide: 'Learning Platform',
		joinThousands: 'Join the open source community building the future of education. No subscriptions, no premium tiers - just quality learning for everyone.',
		problems: 'Practice Questions',
		activeStudents: 'Users',
		questionsSolved: 'Questions Solved',
		support: 'GIthub Stars',
		
		// Testimonials Section
		testimonialsTitle: 'What Our Students Say',
		testimonialsDescription: 'Real stories from students who transformed their academic performance with ExamTie',
		whatStudentsSay: 'What Our Students Say',
		realStories: 'Real stories from students who transformed their academic performance with ExamTie',
		transformedPerformance: 'transformed their academic performance',
		
		// Call to Action
		ctaTitle: 'Ready to Transform Your Learning?',
		ctaDescription: 'Join our open source community building the future of education. Start learning with our completely free platform - no subscriptions, no premium tiers, just quality education for everyone.',
		startYourJourney: 'Start Your Journey',
		readyToTransform: 'Ready to Transform Your',
		yourLearning: 'Learning?',
		joinStudents: 'Join thousands of students who are already improving their exam scores with our',
		improvingScores: 'AI-powered platform',
		aiPoweredPlatform: '. Start your success journey today.',
		startSuccessJourney: 'Start your success journey today',
		startFreeTrial: 'Start Free Trial',
		viewPricing: 'View Pricing',
		
		// Common UI Elements
		aiPowered: 'AI-Powered',
		progressTrackingShort: 'Progress Tracking',
		fiveKQuestions: '50K+ Questions',
		interactiveDemoShort: 'Interactive Demo',
		
		// Footer
		footerDescription: 'Master your exams with AI-powered practice questions and personalized learning paths.',
		footerProduct: 'Product',
		footerPracticeQuiz: 'Practice Quiz',
		footerQuestionBank: 'Question Bank',
		footerAnalytics: 'Analytics',
		footerProgressTracking: 'Progress Tracking',
		footerSupport: 'Support',
		footerHelpCenter: 'Help Center',
		footerContactUs: 'Contact Us',
		footerTutorials: 'Tutorials',
		footerFaq: 'FAQ', 
		footerLegal: 'Legal',
		footerPrivacyPolicy: 'Privacy Policy',
		footerTermsOfService: 'Terms of Service',
		footerCookiePolicy: 'Cookie Policy',
		footerLicenses: 'Licenses',
		footerCopyright: '© 2024 ExamTie. All rights reserved.',
		footerMadeWithLove: 'Made with ❤️ for students worldwide',
		aboutUs: 'About Us',
		contactUs: 'Contact Us',
		privacyPolicy: 'Privacy Policy',
		termsOfService: 'Terms of Service',
		
		// Meta Information
		pageTitle: 'ExamTie - Master Your Exams with AI-Powered Practice',
		pageDescription: 'Take your learning to the next level with ExamTie. Practice with thousands of questions, get intelligent feedback, and track your progress across multiple subjects.',
		
		// Floating Subject Cards
		mathSubject: 'Mathematics',
		chemSubject: 'Chemistry',
		physSubject: 'Physics',
		compSciSubject: 'Computer Science',

		// Auth
		register: 'Register',
		signInToYourAccount: 'Sign in to your account',
		createNewAccount: 'Create a new account',
		fullName: 'Full Name',
		fullNamePlaceholder: 'Enter your full name',
		username: 'Username',
		usernamePlaceholder: 'Enter your username',
		password: 'Password',
		passwordPlaceholder: 'Enter your password',
		processing: 'Processing...',
		signIn: 'Sign In',
		createAccount: 'Create Account',
		needAnAccount: 'Need an account? Register',
		alreadyHaveAccount: 'Already have an account? Sign in',
		loginSuccess: 'Login successful! Redirecting...',
		registrationSuccess: 'Registration successful! Redirecting...',
		profileUpdatedSuccessfully: 'Profile updated successfully!',
		loadingProfile: 'Loading profile',
		emailAddress: 'Email Address',
		bio: 'Bio',
		bioPlaceholder: 'Tell us a little about yourself',
		forgotPassword: 'Forgot your password?',
		welcomeBack: 'Welcome back!',
		joinToday: 'Join us today',
		secureLogin: 'Secure & Fast',
		getStarted: 'Get Started',
		
		// Auth Modal & Validation
		loginTitle: 'Welcome Back',
		signupTitle: 'Create Account',
		loginDescriptionModal: 'Sign in to access your personalized learning dashboard',
		signupDescriptionModal: 'Join thousands of students improving their exam scores',
		loginWithGoogle: 'Continue with Google',
		orContinueWith: 'Or continue with',
		email: 'Email',
		confirmPassword: 'Confirm Password',
		passwordRequirements: 'Password must be at least 8 characters',
		emailRequired: 'Email is required',
		invalidEmail: 'Please enter a valid email address',
		passwordRequired: 'Password is required',
		passwordLength: 'Password must be at least 8 characters',
		fullNameRequired: 'Full name is required',
		usernameRequired: 'Username is required',
		usernameLength: 'Username must be between 3 and 30 characters',
		confirmPasswordRequired: 'Please confirm your password',
		passwordsDoNotMatch: 'Passwords do not match',
		
		// Additional Navigation & UI
		admin: 'Admin',
		language: 'Language',
		logout: 'Logout',
		userProfile: 'User Profile',
		
		// Admin Dashboard
		adminDashboard: 'Admin Dashboard',
		manageUsers: 'Manage users and system settings',
		systemSettings: 'System Settings',
		totalUsers: 'Total Users',
		totalQuizzes: 'Total Quizzes',
		activeSessions: 'Active Sessions',
		totalQuestions: 'Total Questions',
		userManagement: 'User Management',
		searchUsers: 'Search users...',
		allRoles: 'All Roles',
		user: 'User',
		staff: 'Staff',
		role: 'Role',
		status: 'Status',
		actions: 'Actions',
		view: 'View',
		delete: 'Delete',
		active: 'Active',
		userDetails: 'User Details',
		changeRole: 'Change Role',
		deleteUser: 'Delete User',
		deleteConfirmMessage: 'Are you sure you want to delete this user? This action cannot be undone.',
		cancel: 'Cancel',
		refresh: 'Refresh',
		loadingDashboard: 'Loading admin dashboard...',
		previous: 'Previous',
		next: 'Next',
		showing: 'Showing',
		to: 'to',
		of: 'of',
		results: 'results',
	},
	th: {
		// Navigation
		home: 'หน้าแรก',
		quiz: 'แบบทดสอบ',
		marketplace: 'ตลาดการเรียนรู้',
		login: 'เข้าสู่ระบบ',
		search: 'ค้นหา',
		
		// Hero Section
		heroTitle: 'ExamTie',
		heroDescription: 'เปลี่ยนประสบการณ์การเรียนของคุณด้วยคำถามฝึกหัดที่ขับเคลื่อนด้วย AI ฟีดแบ็กทันที และเส้นทางการเรียนรู้ส่วนบุคคลที่ปรับให้เหมาะกับความสำเร็จของคุณ',
		heroSubtitle: 'เชี่ยวชาญการสอบของคุณด้วยการฝึกฝนที่ขับเคลื่อนด้วย AI',
		heroStatusBadge: '🚀 แพลตฟอร์มการเรียนรู้ที่ขับเคลื่อนด้วย AI',
		masterYour: 'เชี่ยวชาญ',
		examsWith: 'การสอบของคุณด้วย',
		examTie: 'ExamTie',
		transformStudy: 'เปลี่ยนประสบการณ์การเรียนของคุณด้วยคำถามฝึกหัดที่ขับเคลื่อนด้วย AI ฟีดแบ็กทันที และเส้นทางการเรียนรู้ส่วนบุคคลที่ปรับให้เหมาะกับความสำเร็จของคุณ',
		startLearningNow: 'เริ่มเรียนรู้ตอนนี้',
		tryDemo: 'ลองใช้เดโม',
		loginNow: 'เข้าสู่ระบบตอนนี้',
		exploreExams: 'สำรวจการสอบ',
		exams: 'การสอบ',
		joinCommunity: 'เข้าร่วมชุมชน',
		freeForever: 'ฟรีตลอดกาล',
		builtByDevelopers: 'สร้างโดยนักพัฒนา เพื่อผู้เรียน',
		powerfulAI: 'ขับเคลื่อนด้วย AI',
		revolutionize: 'ปฏิวัติ',
		studyMethod: 'วิธีการเรียนของคุณ',
		joinRevolution: 'เข้าร่วมการปฏิวัติ',
		nextGenLearning: 'การเรียนรู้ยุคหน้า',
		
		// Hero Stats
		questions: 'คำถาม',
		successRate: 'อัตราความสำเร็จ',
		students: 'นักเรียน',
		
		// Subjects
		mathematics: 'คณิตศาสตร์',
		chemistry: 'เคมี',
		physics: 'ฟิสิกส์',
		biology: 'ชีววิทยา',
		english: 'ภาษาอังกฤษ',
		geography: 'ภูมิศาสตร์',
		history: 'ประวัติศาสตร์',
		computerScience: 'วิทยาการคอมพิวเตอร์',
		questionsCount: 'คำถาม',
		
		// Quiz Demo Section
		quizDemoTitle: 'สัมผัสแพลตฟอร์มแบบทดสอบของเรา',
		quizDemoDescription: 'ลองใช้อินเทอร์เฟซแบบทดสอบแบบโต้ตอบพร้อมฟีดแบ็กแบบเรียลไทม์และคำอธิบายโดยละเอียด ดูว่า AI ของเราปรับตัวให้เข้ากับรูปแบบการเรียนรู้ของคุณอย่างไร',
		interactiveDemo: 'เดโมแบบโต้ตอบ',
		experienceOur: 'สัมผัส',
		quizPlatform: 'แพลตฟอร์มแบบทดสอบของเรา',
		tryInteractive: 'ลองใช้อินเทอร์เฟซแบบทดสอบแบบโต้ตอบพร้อมฟีดแบ็กแบบเรียลไทม์และคำอธิบายโดยละเอียด',
		
		// Features Section
		featuresTitle: 'ทำไมต้องเลือก ExamTie?',
		featuresDescription: 'คุณสมบัติอันทรงพลังที่ออกแบบมาเพื่อเร่งการเรียนรู้และเพิ่มความสำเร็จในการสอบของคุณให้สูงสุด',
		powerfulFeatures: 'คุณสมบัติอันทรงพลัง',
		whyChoose: 'ทำไมต้องเลือก',
		accelerateJourney: 'คุณสมบัติอันทรงพลังที่ออกแบบมาเพื่อเร่งการเรียนรู้ของคุณ',
		maximizeSuccess: 'และเพิ่มความสำเร็จในการสอบของคุณให้สูงสุด',
		aiPoweredLearning: 'การเรียนรู้ที่ขับเคลื่อนด้วย AI',
		aiPoweredLearningDesc: 'รับคำแนะนำคำถามส่วนบุคคลและฟีดแบ็กอัจฉริยะที่ปรับให้เหมาะกับรูปแบบการเรียนรู้และความคืบหน้าของคุณ AI ของเราปรับตัวเพื่อช่วยให้คุณพัฒนาได้เร็วขึ้น',
		progressTracking: 'การติดตามความคืบหน้า',
		progressTrackingDesc: 'ตรวจสอบการพัฒนาของคุณด้วยการวิเคราะห์โดยละเอียด ข้อมูลเชิงลึกด้านประสิทธิภาพ และเป้าหมายความสำเร็จ แสดงภาพเส้นทางการเรียนรู้ของคุณอย่างชัดเจน',
		vastQuestionBank: 'คลังคำถามมากมาย',
		vastQuestionBankDesc: 'เข้าถึงคำถามที่คัดสรรมาอย่างดีหลายพันข้อในหลายวิชาและระดับความยาก เนื้อหาใหม่ที่อัปเดตเป็นประจำ',
		instantFeedback: 'ฟีดแบ็กทันที',
		instantFeedbackDesc: 'รับคำอธิบายทันทีและเรียนรู้จากข้อผิดพลาดของคุณด้วยการแยกแยะวิธีแก้ไขโดยละเอียด',
		adaptiveDifficulty: 'ระดับความยากที่ปรับตัวได้',
		adaptiveDifficultyDesc: 'คำถามปรับระดับตามทักษะของคุณโดยอัตโนมัติ ทำให้คุณได้รับความท้าทายแต่ไม่ล้นหลาม',
		learnMore: 'เรียนรู้เพิ่มเติม',
		
		// Stats Section
		statsTitle: 'ได้รับความไว้วางใจจากนักเรียนทั่วโลก',
		statsDescription: 'เข้าร่วมกับนักเรียนที่ประสบความสำเร็จหลายพันคนที่ได้ปรับปรุงคะแนนสอบด้วย ExamTie',
		ourImpact: 'ผลกระทบของเรา',
		trustedBy: 'ได้รับความไว้วางใจจากนักเรียน',
		worldwide: 'ทั่วโลก',
		joinThousands: 'เข้าร่วมกับนักเรียนที่ประสบความสำเร็จหลายพันคนที่ได้ปรับปรุงคะแนนสอบด้วย ExamTie',
		problems: 'ปัญหา',
		activeStudents: 'นักเรียนที่กำลังใช้งาน',
		questionsSolved: 'คำถามที่ได้รับการแก้ไข',
		support: 'การสนับสนุน',
		
		// Testimonials Section
		testimonialsTitle: 'นักเรียนของเราพูดว่าอย่างไร',
		testimonialsDescription: 'เรื่องราวจริงจากนักเรียนที่เปลี่ยนแปลงผลการเรียนทางวิชาการด้วย ExamTie',
		whatStudentsSay: 'นักเรียนของเราพูดว่าอย่างไร',
		realStories: 'เรื่องราวจริงจากนักเรียนที่เปลี่ยนแปลงผลการเรียนทางวิชาการด้วย ExamTie',
		transformedPerformance: 'เปลี่ยนแปลงผลการเรียนทางวิชาการของพวกเขา',
		
		// Call to Action
		ctaTitle: 'พร้อมที่จะเปลี่ยนแปลงการเรียนรู้ของคุณแล้วหรือยัง?',
		ctaDescription: 'เข้าร่วมกับนักเรียนหลายพันคนที่กำลังปรับปรุงคะแนนสอบด้วยแพลตฟอร์มที่ขับเคลื่อนด้วย AI ของเรา เริ่มต้นเส้นทางสู่ความสำเร็จของคุณวันนี้',
		startYourJourney: 'เริ่มต้นเส้นทางของคุณ',
		readyToTransform: 'พร้อมที่จะเปลี่ยนแปลง',
		yourLearning: 'การเรียนรู้ของคุณแล้วหรือยัง?',
		joinStudents: 'เข้าร่วมกับนักเรียนหลายพันคนที่กำลังปรับปรุงคะแนนสอบด้วย',
		improvingScores: 'แพลตฟอร์มที่ขับเคลื่อนด้วย AI ของเรา',
		aiPoweredPlatform: ' เริ่มต้นเส้นทางสู่ความสำเร็จของคุณวันนี้',
		startSuccessJourney: 'เริ่มต้นเส้นทางสู่ความสำเร็จของคุณวันนี้',
		startFreeTrial: 'เริ่มทดลองใช้ฟรี',
		viewPricing: 'ดูราคา',
		
		// Common UI Elements
		aiPowered: 'ขับเคลื่อนด้วย AI',
		progressTrackingShort: 'ติดตามความคืบหน้า',
		fiveKQuestions: '50K+ คำถาม',
		interactiveDemoShort: 'เดโมแบบโต้ตอบ',
		
		// Footer
		footerDescription: 'เชี่ยวชาญการสอบของคุณด้วยคำถามฝึกหัดที่ขับเคลื่อนด้วย AI และเส้นทางการเรียนรู้ส่วนบุคคล',
		footerProduct: 'ผลิตภัณฑ์',
		footerPracticeQuiz: 'แบบทดสอบฝึกหัด',
		footerQuestionBank: 'คลังคำถาม',
		footerAnalytics: 'การวิเคราะห์',
		footerProgressTracking: 'การติดตามความคืบหน้า',
		footerSupport: 'การสนับสนุน',
		footerHelpCenter: 'ศูนย์ช่วยเหลือ',
		footerContactUs: 'ติดต่อเรา',
		footerTutorials: 'บทเรียน',
		footerFaq: 'คำถามที่พบบ่อย',
		footerLegal: 'กฎหมาย',
		footerPrivacyPolicy: 'นโยบายความเป็นส่วนตัว',
		footerTermsOfService: 'ข้อกำหนดการใช้บริการ',
		footerCookiePolicy: 'นโยบายคุกกี้',
		footerLicenses: 'ใบอนุญาต',
		footerCopyright: '© 2024 ExamTie สงวนลิขสิทธิ์ทั้งหมด',
		footerMadeWithLove: 'สร้างด้วย ❤️ เพื่อนักเรียนทั่วโลก',
		aboutUs: 'เกี่ยวกับเรา',
		contactUs: 'ติดต่อเรา',
		privacyPolicy: 'นโยบายความเป็นส่วนตัว',
		termsOfService: 'ข้อกำหนดการใช้บริการ',
		
		// Meta Information
		pageTitle: 'ExamTie - เชี่ยวชาญการสอบของคุณด้วยการฝึกฝนที่ขับเคลื่อนด้วย AI',
		pageDescription: 'ยกระดับการเรียนรู้ของคุณขึ้นไปอีกระดับด้วย ExamTie ฝึกฝนด้วยคำถามหลายพันข้อ รับฟีดแบ็กอัจฉริยะ และติดตามความคืบหน้าของคุณในหลายวิชา',
		
		// Floating Subject Cards  
		mathSubject: 'คณิตศาสตร์',
		chemSubject: 'เคมี',
		physSubject: 'ฟิสิกส์',
		compSciSubject: 'วิทยาการคอมพิวเตอร์',

		// Auth
		register: 'สมัครสมาชิก',
		signInToYourAccount: 'เข้าสู่บัญชีของคุณ',
		createNewAccount: 'สร้างบัญชีใหม่',
		fullName: 'ชื่อเต็ม',
		fullNamePlaceholder: 'กรอกชื่อเต็มของคุณ',
		username: 'ชื่อผู้ใช้',
		usernamePlaceholder: 'กรอกชื่อผู้ใช้ของคุณ',
		password: 'รหัสผ่าน',
		passwordPlaceholder: 'กรอกรหัสผ่านของคุณ',
		processing: 'กำลังดำเนินการ...',
		signIn: 'เข้าสู่ระบบ',
		createAccount: 'สร้างบัญชี',
		needAnAccount: 'ต้องการบัญชี? สมัครสมาชิก',
		alreadyHaveAccount: 'มีบัญชีแล้ว? เข้าสู่ระบบ',
		loginSuccess: 'เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...',
		registrationSuccess: 'สมัครสมาชิกสำเร็จ! กำลังเปลี่ยนหน้า...',
		profileUpdatedSuccessfully: 'อัปเดตโปรไฟล์สำเร็จ!',
		loadingProfile: 'กำลังโหลดโปรไฟล์',
		emailAddress: 'ที่อยู่อีเมล',
		bio: 'ประวัติย่อ',
		bioPlaceholder: 'เล่าเกี่ยวกับตัวคุณสักหน่อย',
		forgotPassword: 'ลืมรหัสผ่าน?',
		welcomeBack: 'ยินดีต้อนรับกลับ!',
		joinToday: 'เข้าร่วมกับเราวันนี้',
		secureLogin: 'ปลอดภัย & รวดเร็ว',
		getStarted: 'เริ่มต้น',
		
		// Auth Modal & Validation
		loginTitle: 'ยินดีต้อนรับกลับ',
		signupTitle: 'สร้างบัญชี',
		loginDescriptionModal: 'เข้าสู่ระบบเพื่อเข้าถึงแดชบอร์ดการเรียนรู้ส่วนบุคคลของคุณ',
		signupDescriptionModal: 'เข้าร่วมกับนักเรียนหลายพันคนที่กำลังปรับปรุงคะแนนสอบ',
		loginWithGoogle: 'ดำเนินการต่อด้วย Google',
		orContinueWith: 'หรือดำเนินการต่อด้วย',
		email: 'อีเมล',
		confirmPassword: 'ยืนยันรหัสผ่าน',
		passwordRequirements: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
		emailRequired: 'จำเป็นต้องกรอกอีเมล',
		invalidEmail: 'กรุณากรอกที่อยู่อีเมลที่ถูกต้อง',
		passwordRequired: 'จำเป็นต้องกรอกรหัสผ่าน',
		passwordLength: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
		fullNameRequired: 'จำเป็นต้องกรอกชื่อเต็ม',
		usernameRequired: 'จำเป็นต้องกรอกชื่อผู้ใช้',
		usernameLength: 'ชื่อผู้ใช้ต้องมีความยาวระหว่าง 3 ถึง 30 ตัวอักษร',
		confirmPasswordRequired: 'กรุณายืนยันรหัสผ่านของคุณ',
		passwordsDoNotMatch: 'รหัสผ่านไม่ตรงกัน',
		
		// Additional Navigation & UI
		admin: 'ผู้ดูแลระบบ',
		language: 'ภาษา',
		logout: 'ออกจากระบบ',
		userProfile: 'โปรไฟล์ผู้ใช้',
		
		// Admin Dashboard
		adminDashboard: 'แดชบอร์ดผู้ดูแลระบบ',
		manageUsers: 'จัดการผู้ใช้และการตั้งค่าระบบ',
		systemSettings: 'การตั้งค่าระบบ',
		totalUsers: 'ผู้ใช้ทั้งหมด',
		totalQuizzes: 'แบบทดสอบทั้งหมด',
		activeSessions: 'เซสชันที่ใช้งาน',
		totalQuestions: 'คำถามทั้งหมด',
		userManagement: 'การจัดการผู้ใช้',
		searchUsers: 'ค้นหาผู้ใช้...',
		allRoles: 'บทบาททั้งหมด',
		user: 'ผู้ใช้',
		staff: 'เจ้าหน้าที่',
		role: 'บทบาท',
		status: 'สถานะ',
		actions: 'การดำเนินการ',
		view: 'ดู',
		delete: 'ลบ',
		active: 'ใช้งานอยู่',
		userDetails: 'รายละเอียดผู้ใช้',
		changeRole: 'เปลี่ยนบทบาท',
		deleteUser: 'ลบผู้ใช้',
		deleteConfirmMessage: 'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้? การดำเนินการนี้ไม่สามารถยกเลิกได้',
		cancel: 'ยกเลิก',
		refresh: 'รีเฟรช',
		loadingDashboard: 'กำลังโหลดแดชบอร์ดผู้ดูแลระบบ...',
		previous: 'ก่อนหน้า',
		next: 'ถัดไป',
		showing: 'แสดง',
		to: 'ถึง',
		of: 'จาก',
		results: 'ผลลัพธ์',
	}
};
