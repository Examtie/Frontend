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
}

// Backup translations - export removed to avoid TypeScript errors
const translations: Record<'en' | 'th', Partial<Translations>> = {
	en: {
		// Navigation
		home: 'Home',
		quiz: 'Quiz',
		marketplace: 'Marketplace',
		login: 'Login',
		search: 'Search',
		
		// Hero Section
		heroTitle: 'Examtie',
		heroDescription: 'Master your exams with AI-powered practice questions. Get personalized feedback, track your progress, and boost your confidence with thousands of curated questions across multiple subjects and difficulty levels.',
		exams: 'Exams',
		
		// Subjects
		mathematics: 'Mathematics',
		chemistry: 'Chemistry',
		physics: 'Physics',
		biology: 'Biology',
		english: 'English',
		geography: 'Geography',
		history: 'History',
		computerScience: 'Computer Science',
		
		// Quiz Demo Section
		quizDemoTitle: 'Experience Our Quiz Platform',
		quizDemoDescription: 'Try our interactive quiz interface with real-time feedback and detailed explanations',
		
		// Features Section
		featuresTitle: 'Why Choose ExamTie?',
		featuresDescription: 'Powerful features designed to accelerate your learning journey',
		aiPoweredLearning: 'AI-Powered Learning',
		aiPoweredLearningDesc: 'Get personalized question recommendations and intelligent feedback tailored to your learning style and progress.',
		progressTracking: 'Progress Tracking',
		progressTrackingDesc: 'Monitor your improvement with detailed analytics, performance insights, and achievement milestones.',
		vastQuestionBank: 'Vast Question Bank',
		vastQuestionBankDesc: 'Access thousands of carefully curated questions across multiple subjects and difficulty levels.',
		instantFeedback: 'Instant Feedback',
		instantFeedbackDesc: 'Get immediate explanations and learn from your mistakes with detailed solution breakdowns.',
		adaptiveDifficulty: 'Adaptive Difficulty',
		adaptiveDifficultyDesc: 'Questions automatically adjust to your skill level, keeping you challenged but not overwhelmed.',
		
		// Stats Section
		statsTitle: 'Trusted by Students Worldwide',
		statsDescription: 'Join thousands of successful learners who have improved their exam scores with ExamTie',
		activeStudents: 'Active Students',
		questionsSolved: 'Questions Solved',
		successRate: 'Success Rate',
		support: 'Support',
		
		// Testimonials Section
		testimonialsTitle: 'What Our Students Say',
		testimonialsDescription: 'Real stories from students who transformed their academic performance with ExamTie',
		
		// Call to Action
		ctaTitle: 'Ready to Transform Your Learning?',
		ctaDescription: 'Join thousands of students who are already improving their exam scores with our AI-powered platform.',
		startFreeTrial: 'Start Free Trial',
		viewPricing: 'View Pricing',
		
		// Footer
		aboutUs: 'About Us',
		contactUs: 'Contact Us',
		privacyPolicy: 'Privacy Policy',
		termsOfService: 'Terms of Service'
	},
	th: {
		// Navigation
		home: 'หน้าแรก',
		quiz: 'แบบทดสอบ',
		marketplace: 'ตลาดกลาง',
		login: 'เข้าสู่ระบบ',
		search: 'ค้นหา',
		
		// Hero Section
		heroTitle: 'Examtie',
		heroDescription: 'เชี่ยวชาญการสอบด้วยคำถามฝึกหัดที่ขับเคลื่อนด้วย AI รับฟีดแบ็กแบบส่วนตัว ติดตามความคืบหน้าของคุณ และเพิ่มความมั่นใจด้วยคำถามคุณภาพหลายพันข้อที่ครอบคลุมหลายวิชาและระดับความยาก',
		exams: 'การสอบ',
		
		// Subjects
		mathematics: '📊 คณิตศาสตร์',
		chemistry: '⚗️ เคมี',
		physics: '🔬 ฟิสิกส์',
		biology: '🧬 ชีววิทยา',
		english: '📚 ภาษาอังกฤษ',
		geography: '🌍 ภูมิศาสตร์',
		history: '📜 ประวัติศาสตร์',
		computerScience: '💻 วิทยาการคอมพิวเตอร์',
		
		// Quiz Demo Section
		quizDemoTitle: 'สัมผัสแพลตฟอร์มแบบทดสอบของเรา',
		quizDemoDescription: 'ลองใช้อินเทอร์เฟซแบบทดสอบแบบโต้ตอบพร้อมฟีดแบ็กแบบเรียลไทม์และคำอธิบายโดยละเอียด',
		
		// Features Section
		featuresTitle: 'ทำไมต้องเลือก ExamTie?',
		featuresDescription: 'คุณสมบัติอันทรงพลังที่ออกแบบมาเพื่อเร่งการเรียนรู้ของคุณ',
		aiPoweredLearning: 'การเรียนรู้ด้วย AI',
		aiPoweredLearningDesc: 'รับคำแนะนำคำถามและฟีดแบ็กอัจฉริยะที่ปรับให้เหมาะกับรูปแบบการเรียนรู้และความคืบหน้าของคุณ',
		progressTracking: 'ติดตามความคืบหน้า',
		progressTrackingDesc: 'ตรวจสอบการพัฒนาของคุณด้วยการวิเคราะห์โดยละเอียด ข้อมูลเชิงลึกด้านประสิทธิภาพ และเป้าหมายความสำเร็จ',
		vastQuestionBank: 'คลังคำถามมากมาย',
		vastQuestionBankDesc: 'เข้าถึงคำถามที่คัดสรรมาอย่างดีหลายพันข้อในหลายวิชาและระดับความยาก',
		
		// Stats Section
		statsTitle: 'ได้รับความไว้วางใจจากนักเรียนทั่วโลก',
		statsDescription: 'เข้าร่วมกับนักเรียนที่ประสบความสำเร็จหลายพันคนที่ได้ปรับปรุงคะแนนสอบด้วย ExamTie',
		activeStudents: 'นักเรียนที่ใช้งาน',
		questionsSolved: 'คำถามที่ได้รับการแก้ไข',
		successRate: 'อัตราความสำเร็จ',
		support: 'การสนับสนุน',
		
		// Testimonials Section
		testimonialsTitle: 'นักเรียนของเราพูดว่าอย่างไร',
		testimonialsDescription: 'เรื่องราวจริงจากนักเรียนที่เปลี่ยนแปลงผลการเรียนด้วย ExamTie',
		
		// Call to Action
		ctaTitle: 'พร้อมที่จะเปลี่ยนแปลงการเรียนรู้ของคุณแล้วหรือยัง?',
		ctaDescription: 'เข้าร่วมกับนักเรียนหลายพันคนที่กำลังปรับปรุงคะแนนสอบด้วยแพลตฟอร์มที่ขับเคลื่อนด้วย AI ของเรา',
		startFreeTrial: 'เริ่มทดลองใช้ฟรี',
		viewPricing: 'ดูราคา',
		
		// Footer
		aboutUs: 'เกี่ยวกับเรา',
		contactUs: 'ติดต่อเรา',
		privacyPolicy: 'นโยบายความเป็นส่วนตัว',
		termsOfService: 'ข้อกำหนดการใช้บริการ'
	}
};
